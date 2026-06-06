from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    DeliveryRecordViewSet,
    CustomerTypeViewSet,
    BottleTypeViewSet,
    plant_summary,
    plant_customers,
    plant_export,
    plant_settings,
    plant_analytics,
)

router = DefaultRouter()
router.register(r'records', DeliveryRecordViewSet, basename='plant-record')
router.register(r'customer-types', CustomerTypeViewSet, basename='plant-customer-type')
router.register(r'bottle-types', BottleTypeViewSet, basename='plant-bottle-type')

urlpatterns = [
    path('summary/', plant_summary, name='plant-summary'),
    path('analytics/', plant_analytics, name='plant-analytics'),
    path('customers/', plant_customers, name='plant-customers'),
    path('settings/', plant_settings, name='plant-settings'),
    path('export/', plant_export, name='plant-export'),
    path('', include(router.urls)),
]
