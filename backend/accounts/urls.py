from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    RegisterView, UserProfileView, ChangePasswordView, UpdatePushTokenView,
    AdminStaffListCreateView, AdminStaffDetailView,
    AdminStaffDocumentView, AdminStaffHistoryView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('device/', UpdatePushTokenView.as_view(), name='update_device_token'),

    # Staff management
    path('admin/staff/', AdminStaffListCreateView.as_view(), name='admin-staff-list'),
    path('admin/staff/<int:pk>/', AdminStaffDetailView.as_view(), name='admin-staff-detail'),
    path('admin/staff/<int:pk>/documents/', AdminStaffDocumentView.as_view(), name='admin-staff-documents'),
    path('admin/staff/<int:pk>/history/', AdminStaffHistoryView.as_view(), name='admin-staff-history'),

    # Legacy rider aliases (keep for backward compat)
    path('admin/riders/', AdminStaffListCreateView.as_view(), name='admin-rider-list'),
    path('admin/riders/<int:pk>/', AdminStaffDetailView.as_view(), name='admin-rider-detail'),
    path('admin/riders/<int:pk>/history/', AdminStaffHistoryView.as_view(), name='admin-rider-history'),
]
