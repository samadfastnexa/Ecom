from django.urls import path
from .views import ComplaintListCreateView

urlpatterns = [
    path('complaints/', ComplaintListCreateView.as_view(), name='complaint-list-create'),
]
