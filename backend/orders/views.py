from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models import Q, Sum, Count
from .models import Order, DeliveryStatus, OrderItem
from .serializers import (
    OrderSerializer, DeliveryStatusSerializer,
    AdminOrderSerializer, AdminOrderUpdateSerializer, AdminOrderCreateSerializer,
)
from core.payment_gateway import initiate_payment
from accounts.models import UserProfile

class OrderListCreateView(generics.ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

class IsDeliveryBoy(permissions.BasePermission):
    """Grants access only to authenticated users whose profile is user_type='delivery_boy'."""
    message = "Only delivery boys can access this endpoint."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        try:
            return request.user.profile.user_type == 'delivery_boy'
        except UserProfile.DoesNotExist:
            return False


class DeliveryBoyOrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsDeliveryBoy]

    def get_queryset(self):
        profile = self.request.user.profile
        return Order.objects.filter(
            assigned_delivery_boy=profile
        ).exclude(
            status__in=['Delivered', 'Cancelled']
        ).order_by('-created_at')


class DeliveryBoyOrderDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsDeliveryBoy]
    lookup_field = 'id'

    def get_queryset(self):
        return Order.objects.filter(assigned_delivery_boy=self.request.user.profile)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Check if delivery status has been locked (already updated once)
        is_locked = instance.delivery_status_updated_at is not None
        
        if is_locked:
            # Only allow updating delivery_notes after first update
            allowed_fields = ['delivery_notes']
            data = {k: v for k, v in request.data.items() if k in allowed_fields}
            
            if any(field in request.data for field in ['delivery_status', 'cash_received', 'cash_amount', 'number_of_bottles']):
                return Response(
                    {'error': 'Status has been locked. You can only update notes/comments.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # First update - allow all delivery-related fields
            allowed_fields = ['status', 'delivery_notes', 'number_of_bottles', 
                             'delivery_status', 'cash_received', 'cash_amount']
            data = {k: v for k, v in request.data.items() if k in allowed_fields}
            
            # Lock the status if delivery_status is being updated from Pending
            if 'delivery_status' in data and data['delivery_status'] != 'Pending' and not instance.delivery_status_updated_at:
                data['delivery_status_updated_at'] = timezone.now()
            
            # Update delivery timestamps based on status changes
            if 'status' in data:
                if data['status'] == 'Shipped' and not instance.delivery_assigned_at:
                    data['delivery_assigned_at'] = timezone.now()
                elif data['status'] == 'Delivered' and not instance.delivery_completed_at:
                    data['delivery_completed_at'] = timezone.now()
            
            # Auto-update main status based on delivery_status
            if 'delivery_status' in data:
                if data['delivery_status'] == 'Delivered':
                    data['status'] = 'Delivered'
                    if not instance.delivery_completed_at:
                        data['delivery_completed_at'] = timezone.now()
        
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsDeliveryBoy])
def delivery_boy_stats(request):
    profile = request.user.profile
    total_orders = Order.objects.filter(assigned_delivery_boy=profile).count()
    delivered_orders = Order.objects.filter(
        assigned_delivery_boy=profile, status='Delivered'
    ).count()
    pending_orders = Order.objects.filter(
        assigned_delivery_boy=profile, status__in=['Processing', 'Shipped']
    ).count()
    return Response({
        'total_orders': total_orders,
        'delivered_orders': delivered_orders,
        'pending_orders': pending_orders,
        'delivery_rate': delivered_orders / total_orders * 100 if total_orders > 0 else 0,
        'is_available': profile.is_available,
    })

@api_view(['POST'])
@permission_classes([IsDeliveryBoy])
def update_availability(request):
    profile = request.user.profile
    is_available = request.data.get('is_available')
    if is_available is not None:
        profile.is_available = bool(is_available)
        profile.save()
    return Response({'is_available': profile.is_available, 'message': 'Availability updated successfully'})

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def delivery_status_list(request):
    """
    Get list of available delivery statuses for mobile app
    """
    statuses = DeliveryStatus.objects.filter(is_active=True).order_by('order', 'name')
    serializer = DeliveryStatusSerializer(statuses, many=True)
    return Response(serializer.data)


# ─── Staff / admin views ───────────────────────────────────────────────────────

class IsStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class AdminOrderListView(generics.ListCreateAPIView):
    permission_classes = [IsStaff]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AdminOrderCreateSerializer
        return AdminOrderSerializer

    def get_queryset(self):
        qs = Order.objects.select_related(
            'user', 'user__profile', 'assigned_delivery_boy', 'assigned_delivery_boy__user'
        ).prefetch_related('items__product').order_by('-created_at')

        p = self.request.query_params
        # Default: hide is_hidden orders; pass ?show_hidden=true to include them
        if p.get('show_hidden') != 'true':
            qs = qs.filter(is_hidden=False)
        if p.get('status'):
            qs = qs.filter(status=p['status'])
        if p.get('search'):
            q = p['search']
            qs = qs.filter(
                Q(user__username__icontains=q) |
                Q(user__email__icontains=q) |
                Q(guest_name__icontains=q) |
                Q(guest_phone__icontains=q) |
                Q(shipping_address__icontains=q)
            )
        if p.get('date_from'):
            qs = qs.filter(created_at__date__gte=p['date_from'])
        if p.get('date_to'):
            qs = qs.filter(created_at__date__lte=p['date_to'])
        if p.get('is_paid') in ('true', 'false'):
            qs = qs.filter(is_paid=(p['is_paid'] == 'true'))
        return qs

    def create(self, request, *args, **kwargs):
        serializer = AdminOrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(
            AdminOrderSerializer(order, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdminOrderUpdateView(generics.UpdateAPIView):
    serializer_class = AdminOrderUpdateSerializer
    permission_classes = [IsStaff]
    lookup_field = 'id'
    queryset = Order.objects.all()
    http_method_names = ['patch']

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = dict(request.data)

        if 'status' in data:
            new_status = data['status']
            if new_status == 'Shipped' and not instance.delivery_assigned_at:
                instance.delivery_assigned_at = timezone.now()
            elif new_status == 'Delivered' and not instance.delivery_completed_at:
                instance.delivery_completed_at = timezone.now()
            instance.save(update_fields=[
                f for f in ('delivery_assigned_at', 'delivery_completed_at')
                if getattr(instance, f) is not None
            ] or ['updated_at'])

        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(AdminOrderSerializer(instance, context={'request': request}).data)


class AdminOrderSummaryView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        today = timezone.now().date()
        qs = Order.objects.filter(is_hidden=False)
        today_qs = qs.filter(created_at__date=today)
        today_revenue = today_qs.aggregate(rev=Sum('total_price'))['rev'] or 0

        return Response({
            'total': qs.count(),
            'pending': qs.filter(status='Pending').count(),
            'processing': qs.filter(status='Processing').count(),
            'shipped': qs.filter(status='Shipped').count(),
            'delivered': qs.filter(status='Delivered').count(),
            'cancelled': qs.filter(status='Cancelled').count(),
            'paid_count': qs.filter(is_paid=True).count(),
            'unpaid_count': qs.filter(is_paid=False).count(),
            'today_orders': today_qs.count(),
            'today_revenue': float(today_revenue),
        })


class DeliveryBoyListView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        profiles = UserProfile.objects.filter(
            user_type='delivery_boy'
        ).select_related('user').order_by('user__username')
        data = [
            {
                'id': p.pk,
                'name': p.user.get_full_name() or p.user.username,
                'is_available': p.is_available,
            }
            for p in profiles
        ]
        return Response(data)


@api_view(['GET'])
@permission_classes([IsStaff])
def address_suggestions(request):
    """Return up to 10 distinct addresses from order history matching ?q=."""
    q = (request.query_params.get('q') or '').strip()
    if len(q) < 2:
        return Response([])
    addresses = (
        Order.objects.filter(shipping_address__icontains=q)
        .values_list('shipping_address', flat=True)
        .distinct()
        .order_by('shipping_address')[:10]
    )
    return Response(list(addresses))


@api_view(['GET'])
@permission_classes([IsStaff])
def customer_order_stats(request, user_id):
    """Return order stats for a registered customer."""
    try:
        user = User.objects.select_related('profile').get(pk=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    qs = Order.objects.filter(user=user)
    total_orders = qs.count()
    delivered = qs.filter(status='Delivered')
    delivered_count = delivered.count()
    total_bottles = (
        OrderItem.objects.filter(order__user=user, order__status='Delivered')
        .aggregate(total=Sum('quantity'))['total'] or 0
    )
    last_order = qs.order_by('-created_at').values('created_at').first()
    balance = None
    try:
        balance = float(user.profile.account_balance)
    except Exception:
        pass

    return Response({
        'total_orders': total_orders,
        'delivered_count': delivered_count,
        'total_bottles': total_bottles,
        'last_order_date': last_order['created_at'] if last_order else None,
        'account_balance': balance,
    })