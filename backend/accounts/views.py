from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .serializers import (
    RegisterSerializer, UserSerializer,
    UpdateProfileSerializer, ChangePasswordSerializer,
    StaffProfileSerializer, CreateStaffSerializer, UpdateStaffSerializer,
)
from .models import UserProfile, MobileProfileConfig, PROFILE_FIELD_DEFAULTS
from activities.service import log as activity_log


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
        if request.user.is_staff:
            return Response(
                {'detail': 'Staff passwords can only be changed by an administrator.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        activity_log(
            request.user, 'user', 'Password Changed',
            target_type='user', target_id=request.user.id,
            target_label=request.user.username,
        )
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
        profile.created_by = request.user
        profile.save(update_fields=['created_by'])
        activity_log(
            request.user, 'user', 'Staff Created',
            target_type='staff', target_id=profile.id,
            target_label=profile.user.get_full_name() or profile.user.username,
            details={'username': profile.user.username, 'is_rider': profile.is_rider},
        )
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


class AdminCustomerListView(APIView):
    """List all registered customers (user_type=customer) with optional search."""
    permission_classes = [IsStaff]

    def get(self, request):
        q = (request.query_params.get('search') or '').strip()
        qs = (
            UserProfile.objects
            .filter(user_type='customer')
            .select_related('user')
            .order_by('user__first_name', 'user__username')
        )
        if q:
            qs = qs.filter(
                Q(user__username__icontains=q) |
                Q(user__first_name__icontains=q) |
                Q(user__last_name__icontains=q) |
                Q(user__email__icontains=q) |
                Q(phone_number__icontains=q) |
                Q(address__icontains=q)
            )
        data = []
        for profile in qs:
            u = profile.user
            data.append({
                'id': u.id,
                'username': u.username,
                'name': u.get_full_name() or u.username,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'email': u.email,
                'phone': profile.phone_number,
                'address': profile.address,
                'date_joined': u.date_joined.isoformat(),
                'is_active': u.is_active,
            })
        return Response(data)


class AdminCustomerDetailView(APIView):
    """Admin reads / updates a single customer's profile info."""
    permission_classes = [IsStaff]

    def _serialize(self, user):
        profile = user.profile
        return {
            'id': user.id,
            'username': user.username,
            'name': user.get_full_name() or user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'phone': profile.phone_number,
            'address': profile.address,
            'date_joined': user.date_joined.isoformat(),
            'is_active': user.is_active,
        }

    def get(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        return Response(self._serialize(user))

    def patch(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        data = request.data
        changed_user = False
        for field in ('first_name', 'last_name'):
            if field in data:
                setattr(user, field, (data[field] or '').strip())
                changed_user = True
        if 'is_active' in data:
            user.is_active = bool(data['is_active'])
            changed_user = True
        if changed_user:
            user.save()
        profile = user.profile
        changed_profile = []
        if 'phone_number' in data:
            profile.phone_number = (data['phone_number'] or '').strip() or None
            changed_profile.append('phone_number')
        if 'address' in data:
            profile.address = (data['address'] or '').strip() or None
            changed_profile.append('address')
        if changed_profile:
            profile.save(update_fields=changed_profile)
        activity_log(
            request.user, 'customer', 'Customer Updated',
            target_type='customer', target_id=user.id,
            target_label=user.get_full_name() or user.username,
        )
        return Response(self._serialize(user))


class AdminCustomerCreateView(APIView):
    """Admin creates a customer account (with phone + address) in one request."""
    permission_classes = [IsStaff]

    def post(self, request):
        username = (request.data.get('username') or '').strip()
        password = request.data.get('password', '')
        first_name = (request.data.get('first_name') or '').strip()
        last_name = (request.data.get('last_name') or '').strip()
        email = (request.data.get('email') or '').strip()
        phone = (request.data.get('phone_number') or '').strip()
        address = (request.data.get('address') or '').strip()

        if not username:
            return Response({'username': 'Username is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(password) < 6:
            return Response({'password': 'Password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username=username).exists():
            return Response({'username': 'Username already taken.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            is_active=True,
        )
        user.set_password(password)
        user.save()

        profile = user.profile
        if phone:
            profile.phone_number = phone
        if address:
            profile.address = address
        profile.user_type = 'customer'
        profile.save(update_fields=['phone_number', 'address', 'user_type'])

        activity_log(
            request.user, 'customer', 'Customer Created',
            target_type='customer', target_id=user.id,
            target_label=user.get_full_name() or user.username,
            details={'username': user.username},
        )
        return Response({
            'id': user.id,
            'username': user.username,
            'name': user.get_full_name() or user.username,
            'phone': profile.phone_number,
            'address': profile.address,
        }, status=status.HTTP_201_CREATED)


class AdminResetPasswordView(APIView):
    """Admin resets any user's password. POST with {new_password} or {generate: true}."""
    permission_classes = [IsStaff]

    def post(self, request, user_id):
        import secrets
        import string
        user = get_object_or_404(User, pk=user_id)
        generate = request.data.get('generate', False)
        new_password = (request.data.get('new_password') or '').strip()

        if generate:
            alphabet = string.ascii_letters + string.digits
            new_password = ''.join(secrets.choice(alphabet) for _ in range(10))
        elif len(new_password) < 6:
            return Response(
                {'new_password': 'Password must be at least 6 characters.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()
        activity_log(
            request.user, 'user', 'Password Reset by Admin',
            target_type='user', target_id=user.id,
            target_label=user.username,
        )
        return Response({
            'detail': 'Password updated.',
            'new_password': new_password if generate else None,
        })


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


class GoogleAuthView(APIView):
    """Sign in or register via Google OAuth. New users are always created as customers."""
    permission_classes = (AllowAny,)

    def post(self, request):
        import requests as google_req
        import re
        from rest_framework_simplejwt.tokens import RefreshToken

        access_token = (request.data.get('access_token') or '').strip()
        if not access_token:
            return Response({'error': 'access_token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Verify token & get user info from Google
        try:
            res = google_req.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10,
            )
        except Exception:
            return Response({'error': 'Could not reach Google servers.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if not res.ok:
            return Response({'error': 'Invalid or expired Google token.'}, status=status.HTTP_401_UNAUTHORIZED)

        data = res.json()
        email = data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Google account has no email address.'}, status=status.HTTP_400_BAD_REQUEST)

        # Find existing user or create a new customer
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            base = re.sub(r'[^a-zA-Z0-9_]', '', email.split('@')[0])[:20] or 'user'
            username, counter = base, 1
            while User.objects.filter(username=username).exists():
                username = f'{base}{counter}'
                counter += 1

            user = User.objects.create(
                username=username,
                email=email,
                first_name=data.get('given_name', ''),
                last_name=data.get('family_name', ''),
                is_active=True,
            )
            user.set_unusable_password()
            user.save()

            profile = user.profile
            profile.user_type = 'customer'
            profile.save(update_fields=['user_type'])

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })


class AdminSendNotificationView(APIView):
    """Send push notifications to users. Staff only.

    POST body:
      title         – notification title (required)
      body          – notification message (required)
      recipient_type – 'all' | 'customers' | 'riders' (default: 'all')
      user_ids      – list of user IDs (when recipient_type is 'specific', optional)
    """
    permission_classes = [IsStaff]

    def post(self, request):
        from core.notifications import send_push_notification

        title = (request.data.get('title') or '').strip()
        body = (request.data.get('body') or '').strip()
        recipient_type = request.data.get('recipient_type', 'all')
        user_ids = request.data.get('user_ids', [])

        if not title:
            return Response({'title': 'Title is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not body:
            return Response({'body': 'Message body is required.'}, status=status.HTTP_400_BAD_REQUEST)

        qs = UserProfile.objects.exclude(expo_push_token__isnull=True).exclude(expo_push_token='')

        if recipient_type == 'customers':
            qs = qs.filter(user_type='customer')
        elif recipient_type == 'riders':
            qs = qs.filter(user_type='delivery_boy')
        elif recipient_type == 'specific' and user_ids:
            qs = qs.filter(user__id__in=user_ids)

        tokens = list(qs.values_list('expo_push_token', flat=True))
        sent = 0
        for token in tokens:
            result = send_push_notification(token, title, body, data={'type': 'admin_broadcast'})
            if result:
                sent += 1

        activity_log(
            request.user, 'user', 'Push Notification Sent',
            target_type='broadcast', target_id=None,
            target_label=f'{recipient_type} ({sent} sent)',
            details={'title': title, 'recipient_type': recipient_type, 'sent': sent},
        )

        return Response({'sent': sent, 'total_tokens': len(tokens)})


# ── Mobile profile field config ──────────────────────────────────────────────

class MobileProfileConfigView(APIView):
    """Returns the field visibility/editability config for the current user's type."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_type = getattr(request.user, 'profile', None)
        user_type = user_type.user_type if user_type else 'customer'
        if user_type not in ('delivery_boy', 'staff'):
            return Response({'user_type': user_type, 'fields': {}})
        return Response({
            'user_type': user_type,
            'fields': MobileProfileConfig.for_type(user_type),
        })


class AdminMobileProfileConfigView(APIView):
    """Admin GET all configs / PATCH a specific user_type config."""
    permission_classes = [IsStaff]

    def get(self, request):
        result = {}
        for ut in ('delivery_boy', 'staff'):
            result[ut] = MobileProfileConfig.for_type(ut)
        return Response(result)

    def patch(self, request, user_type):
        if user_type not in ('delivery_boy', 'staff'):
            return Response({'detail': 'Invalid user_type.'}, status=status.HTTP_400_BAD_REQUEST)

        fields_update = request.data.get('fields', {})
        if not isinstance(fields_update, dict):
            return Response({'detail': 'fields must be an object.'}, status=status.HTTP_400_BAD_REQUEST)

        obj, _ = MobileProfileConfig.objects.get_or_create(user_type=user_type)
        # Merge: only store overrides vs defaults
        defaults = PROFILE_FIELD_DEFAULTS.get(user_type, {})
        current = dict(obj.fields_config)
        for field_key, new_vals in fields_update.items():
            if field_key not in defaults:
                continue
            if field_key not in current:
                current[field_key] = {}
            current[field_key].update({
                k: v for k, v in new_vals.items() if k in ('visible', 'editable')
            })
        obj.fields_config = current
        obj.save()
        return Response({'user_type': user_type, 'fields': obj.get_config()})
