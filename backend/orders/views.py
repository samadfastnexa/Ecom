from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from django.utils import timezone
from .models import Order, DeliveryStatus
from .serializers import OrderSerializer, DeliveryStatusSerializer
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

class DeliveryBoyOrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Only show orders assigned to the current delivery boy
        try:
            profile = self.request.user.profile
            if profile.user_type != 'delivery_boy':
                return Order.objects.none()
            
            # Show all assigned orders except Delivered and Cancelled
            return Order.objects.filter(
                assigned_delivery_boy=profile
            ).exclude(
                status__in=['Delivered', 'Cancelled']
            ).order_by('-created_at')
        except UserProfile.DoesNotExist:
            return Order.objects.none()

class DeliveryBoyOrderDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        try:
            profile = self.request.user.profile
            if profile.user_type != 'delivery_boy':
                return Order.objects.none()
            
            return Order.objects.filter(assigned_delivery_boy=profile)
        except UserProfile.DoesNotExist:
            return Order.objects.none()
    
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
@permission_classes([permissions.IsAuthenticated])
def delivery_boy_stats(request):
    """
    Get delivery boy statistics
    """
    try:
        profile = request.user.profile
        if profile.user_type != 'delivery_boy':
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        total_orders = Order.objects.filter(assigned_delivery_boy=profile).count()
        delivered_orders = Order.objects.filter(
            assigned_delivery_boy=profile, 
            status='Delivered'
        ).count()
        pending_orders = Order.objects.filter(
            assigned_delivery_boy=profile,
            status__in=['Processing', 'Shipped']
        ).count()
        
        return Response({
            'total_orders': total_orders,
            'delivered_orders': delivered_orders,
            'pending_orders': pending_orders,
            'delivery_rate': delivered_orders / total_orders * 100 if total_orders > 0 else 0,
            'is_available': profile.is_available
        })
    except UserProfile.DoesNotExist:
        return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def update_availability(request):
    """
    Update delivery boy availability status
    """
    try:
        profile = request.user.profile
        if profile.user_type != 'delivery_boy':
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        is_available = request.data.get('is_available')
        if is_available is not None:
            profile.is_available = bool(is_available)
            profile.save()
            
        return Response({
            'is_available': profile.is_available,
            'message': 'Availability updated successfully'
        })
    except UserProfile.DoesNotExist:
        return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def delivery_status_list(request):
    """
    Get list of available delivery statuses for mobile app
    """
    statuses = DeliveryStatus.objects.filter(is_active=True).order_by('order', 'name')
    serializer = DeliveryStatusSerializer(statuses, many=True)
    return Response(serializer.data)