from django.urls import path
from .views import (
    OrderListCreateView,
    OrderDetailView,
    DeliveryBoyOrderListView,
    DeliveryBoyOrderDetailView,
    delivery_boy_stats,
    update_availability,
    delivery_status_list,
    AdminOrderListView,
    AdminOrderUpdateView,
    AdminOrderSummaryView,
    DeliveryBoyListView,
    address_suggestions,
    customer_order_stats,
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

    # Staff / admin endpoints (must come before <int:id> catch-all)
    path('admin/summary/', AdminOrderSummaryView.as_view(), name='admin-order-summary'),
    path('admin/delivery-boys/', DeliveryBoyListView.as_view(), name='admin-delivery-boys'),
    path('admin/address-suggestions/', address_suggestions, name='admin-address-suggestions'),
    path('admin/customer-stats/<int:user_id>/', customer_order_stats, name='admin-customer-stats'),
    path('admin/', AdminOrderListView.as_view(), name='admin-order-list'),
    path('admin/<int:id>/', AdminOrderUpdateView.as_view(), name='admin-order-update'),
]
