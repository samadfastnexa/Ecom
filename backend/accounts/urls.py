from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    CustomerAddressViewSet,
    AreaListView, AdminAreaListCreateView, AdminAreaDetailView,
    AdminDiscountCategoryListCreateView, AdminDiscountCategoryDetailView,
    DiscountReportView,
    RegisterView, UserProfileView, ChangePasswordView, UpdatePushTokenView,
    AdminStaffListCreateView, AdminStaffDetailView,
    AdminStaffDocumentView, AdminStaffHistoryView,
    AdminCustomerListView, AdminCustomerCreateView, AdminCustomerDetailView,
    CustomerLocationView,
    AdminResetPasswordView, AdminSendNotificationView, AdminNotificationHistoryView,
    NotificationTemplateListCreateView, NotificationTemplateDetailView,
    GoogleAuthView, MobileProfileConfigView, AdminMobileProfileConfigView,
    RiderLocationView, AdminRiderLocationListView, AdminRiderTrailView,
    TrackingConfigView,
)

router = DefaultRouter()
# The signed-in customer's own address book: list/create/update/delete plus
# POST <id>/set_default/. Scoped to request.user inside the viewset.
router.register(r'addresses', CustomerAddressViewSet, basename='customer-address')

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
    # Public — powers the signup form's area dropdown
    path('areas/', AreaListView.as_view(), name='area-list'),
    path('admin/areas/', AdminAreaListCreateView.as_view(), name='admin-area-list'),
    path('admin/areas/<int:pk>/', AdminAreaDetailView.as_view(), name='admin-area-detail'),

    # Customer discount categories — staff-only, deliberately no public list
    path('admin/discount-categories/', AdminDiscountCategoryListCreateView.as_view(),
         name='admin-discount-category-list'),
    path('admin/discount-categories/report/', DiscountReportView.as_view(),
         name='admin-discount-report'),
    path('admin/discount-categories/<int:pk>/', AdminDiscountCategoryDetailView.as_view(),
         name='admin-discount-category-detail'),
    path('google/', GoogleAuthView.as_view(), name='google_auth'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('device/', UpdatePushTokenView.as_view(), name='update_device_token'),

    # Customer delivery pin — staff or the currently-assigned rider
    path('customers/<int:user_id>/location/', CustomerLocationView.as_view(),
         name='customer-location'),

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
    path('admin/notifications/history/', AdminNotificationHistoryView.as_view(), name='admin-notification-history'),
    path('admin/notifications/templates/', NotificationTemplateListCreateView.as_view(), name='admin-notification-templates'),
    path('admin/notifications/templates/<int:pk>/', NotificationTemplateDetailView.as_view(), name='admin-notification-template-detail'),

    # Mobile profile field config
    path('mobile-profile-config/', MobileProfileConfigView.as_view(), name='mobile-profile-config'),
    path('admin/mobile-profile-config/', AdminMobileProfileConfigView.as_view(), name='admin-mobile-profile-config-list'),
    path('admin/mobile-profile-config/<str:user_type>/', AdminMobileProfileConfigView.as_view(), name='admin-mobile-profile-config'),

    # Rider location tracking
    path('rider/location/', RiderLocationView.as_view(), name='rider-location'),
    path('tracking-config/', TrackingConfigView.as_view(), name='tracking-config'),
    # Listed before the <int:pk> staff routes below, and note the trail is keyed
    # by User id while those are keyed by UserProfile id.
    path('admin/riders/locations/', AdminRiderLocationListView.as_view(), name='admin-rider-locations'),
    path('admin/riders/<int:user_id>/trail/', AdminRiderTrailView.as_view(), name='admin-rider-trail'),

    # Legacy rider aliases (keep for backward compat)
    path('admin/riders/', AdminStaffListCreateView.as_view(), name='admin-rider-list'),
    path('admin/riders/<int:pk>/', AdminStaffDetailView.as_view(), name='admin-rider-detail'),
    path('admin/riders/<int:pk>/history/', AdminStaffHistoryView.as_view(), name='admin-rider-history'),
]
