from django.urls import path
from .views import (
    OrderListCreateView, 
    OrderDetailView,
    DeliveryBoyOrderListView,
    DeliveryBoyOrderDetailView,
    delivery_boy_stats,
    update_availability,
    delivery_status_list
)

urlpatterns = [
    path('', OrderListCreateView.as_view(), name='order-list-create'),
    path('<int:id>/', OrderDetailView.as_view(), name='order-detail'),
    
    # Delivery boy endpoints
    path('delivery/orders/', DeliveryBoyOrderListView.as_view(), name='delivery-orders'),
    path('delivery/orders/<int:id>/', DeliveryBoyOrderDetailView.as_view(), name='delivery-order-detail'),
    path('delivery/stats/', delivery_boy_stats, name='delivery-stats'),
    path('delivery/availability/', update_availability, name='delivery-availability'),
    path('delivery/statuses/', delivery_status_list, name='delivery-status-list'),
]
