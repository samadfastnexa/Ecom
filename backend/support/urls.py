from django.urls import path
from .views import (
    ComplaintListCreateView,
    AdminComplaintListCreateView,
    AdminComplaintDetailView,
)

urlpatterns = [
    # Customer endpoints
    path('complaints/', ComplaintListCreateView.as_view(), name='complaint-list-create'),

    # Admin endpoints
    path('complaints/admin/', AdminComplaintListCreateView.as_view(), name='complaint-admin-list'),
    path('complaints/<int:pk>/', AdminComplaintDetailView.as_view(), name='complaint-detail'),
]
