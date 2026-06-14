from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    RegisterView, UserProfileView, ChangePasswordView, UpdatePushTokenView,
    AdminStaffListCreateView, AdminStaffDetailView,
    AdminStaffDocumentView, AdminStaffHistoryView,
    AdminCustomerListView, AdminCustomerCreateView, AdminCustomerDetailView,
    AdminResetPasswordView, AdminSendNotificationView, GoogleAuthView,
    MobileProfileConfigView, AdminMobileProfileConfigView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('google/', GoogleAuthView.as_view(), name='google_auth'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('device/', UpdatePushTokenView.as_view(), name='update_device_token'),

    # Admin customer management
    path('admin/customers/', AdminCustomerListView.as_view(), name='admin-customer-list'),
    path('admin/customers/create/', AdminCustomerCreateView.as_view(), name='admin-customer-create'),
    path('admin/customers/<int:user_id>/', AdminCustomerDetailView.as_view(), name='admin-customer-detail'),

    # Staff management
    path('admin/staff/', AdminStaffListCreateView.as_view(), name='admin-staff-list'),
    path('admin/staff/<int:pk>/', AdminStaffDetailView.as_view(), name='admin-staff-detail'),
    path('admin/staff/<int:pk>/documents/', AdminStaffDocumentView.as_view(), name='admin-staff-documents'),
    path('admin/staff/<int:pk>/history/', AdminStaffHistoryView.as_view(), name='admin-staff-history'),

    path('admin/reset-password/<int:user_id>/', AdminResetPasswordView.as_view(), name='admin-reset-password'),
    path('admin/notifications/send/', AdminSendNotificationView.as_view(), name='admin-send-notification'),

    # Mobile profile field config
    path('mobile-profile-config/', MobileProfileConfigView.as_view(), name='mobile-profile-config'),
    path('admin/mobile-profile-config/', AdminMobileProfileConfigView.as_view(), name='admin-mobile-profile-config-list'),
    path('admin/mobile-profile-config/<str:user_type>/', AdminMobileProfileConfigView.as_view(), name='admin-mobile-profile-config'),

    # Legacy rider aliases (keep for backward compat)
    path('admin/riders/', AdminStaffListCreateView.as_view(), name='admin-rider-list'),
    path('admin/riders/<int:pk>/', AdminStaffDetailView.as_view(), name='admin-rider-detail'),
    path('admin/riders/<int:pk>/history/', AdminStaffHistoryView.as_view(), name='admin-rider-history'),
]
