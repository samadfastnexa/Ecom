from rest_framework import viewsets, permissions
from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter


class IsStaffOrReadOnly(permissions.BasePermission):
    """Allow anyone to read; only staff can write."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'description']

    def get_queryset(self):
        # Staff see all products (including inactive); customers see only active
        if self.request.user and self.request.user.is_authenticated and self.request.user.is_staff:
            return Product.objects.select_related('category').order_by('-created_at')
        return Product.objects.filter(is_active=True).select_related('category').order_by('-created_at')
