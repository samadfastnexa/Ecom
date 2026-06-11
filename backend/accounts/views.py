from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from .serializers import (
    RegisterSerializer, UserSerializer,
    UpdateProfileSerializer, ChangePasswordSerializer,
    StaffProfileSerializer, CreateStaffSerializer, UpdateStaffSerializer,
)
from .models import UserProfile


class IsStaff(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer


class UserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = (IsAuthenticated,)

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UpdateProfileSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        super().update(request, *args, **kwargs)
        return Response(UserSerializer(request.user, context={'request': request}).data)


class ChangePasswordView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password updated successfully.'})


# ─── Staff management (replaces rider-only management) ───────────────────────

class AdminStaffListCreateView(generics.ListCreateAPIView):
    """List all staff (riders + non-rider staff). Admins only."""
    permission_classes = [IsStaff]

    def get_queryset(self):
        return (
            UserProfile.objects
            .filter(user_type__in=['staff', 'delivery_boy'])
            .select_related('user')
            .prefetch_related('assigned_orders')
            .order_by('user__first_name', 'user__username')
        )

    def get_serializer_class(self):
        return CreateStaffSerializer if self.request.method == 'POST' else StaffProfileSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateStaffSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        return Response(
            StaffProfileSerializer(profile, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdminStaffDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve or update a single staff member. Inactive staff can still be edited."""
    permission_classes = [IsStaff]

    def get_queryset(self):
        # Allow editing regardless of working_status
        return (
            UserProfile.objects
            .filter(user_type__in=['staff', 'delivery_boy'])
            .select_related('user')
            .prefetch_related('assigned_orders')
        )

    def get_serializer_class(self):
        return UpdateStaffSerializer if self.request.method in ('PUT', 'PATCH') else StaffProfileSerializer

    def update(self, request, *args, **kwargs):
        profile = self.get_object()
        serializer = UpdateStaffSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(StaffProfileSerializer(updated, context={'request': request}).data)


class AdminStaffDocumentView(APIView):
    """Upload documents (profile picture, CNIC, driving licence) for a staff member."""
    permission_classes = [IsStaff]

    ALLOWED_FIELDS = {'profile_picture', 'cnic_front', 'cnic_back', 'driving_license'}

    def patch(self, request, pk):
        profile = get_object_or_404(
            UserProfile, pk=pk, user_type__in=['staff', 'delivery_boy']
        )
        updated = False
        for field in self.ALLOWED_FIELDS:
            if field in request.FILES:
                setattr(profile, field, request.FILES[field])
                updated = True
        if updated:
            profile.save()
        return Response(StaffProfileSerializer(profile, context={'request': request}).data)


class AdminStaffHistoryView(APIView):
    """Delivery history for a staff member who is a rider."""
    permission_classes = [IsStaff]

    def get(self, request, pk):
        from orders.serializers import AdminOrderSerializer
        profile = get_object_or_404(
            UserProfile, pk=pk, user_type__in=['staff', 'delivery_boy']
        )
        if not profile.is_rider:
            return Response(
                {'detail': 'This staff member is not a rider.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        orders = (
            profile.assigned_orders
            .select_related('user')
            .prefetch_related('items__product')
            .order_by('-created_at')
        )
        return Response(AdminOrderSerializer(orders, many=True, context={'request': request}).data)


# ─── Legacy aliases (for backward compat with mobile app or old endpoints) ───

AdminRiderListCreateView = AdminStaffListCreateView
AdminRiderDetailView = AdminStaffDetailView
AdminRiderHistoryView = AdminStaffHistoryView


class UpdatePushTokenView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        profile.expo_push_token = token
        profile.save()
        return Response({'status': 'Token updated'}, status=status.HTTP_200_OK)
