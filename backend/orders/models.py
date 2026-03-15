from django.db import models
from django.contrib.auth.models import User
from products.models import Product
from accounts.models import UserProfile

class DeliveryStatus(models.Model):
    """Admin-configurable delivery status options"""
    name = models.CharField(max_length=50, unique=True, help_text="Status name (e.g., Delivered, Not Responding)")
    color = models.CharField(max_length=7, default='#007AFF', help_text="Hex color code (e.g., #2ecc71)")
    background_color = models.CharField(max_length=7, default='#f0f8ff', help_text="Background hex color")
    border_color = models.CharField(max_length=7, default='#007AFF', help_text="Border hex color")
    order = models.PositiveIntegerField(default=0, help_text="Display order (lower numbers appear first)")
    is_active = models.BooleanField(default=True, help_text="Whether this status is available for use")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'name']
        verbose_name = 'Delivery Status'
        verbose_name_plural = 'Delivery Statuses'

    def __str__(self):
        return self.name

class Order(models.Model):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Processing', 'Processing'),
        ('Shipped', 'Shipped'),
        ('Delivered', 'Delivered'),
        ('Cancelled', 'Cancelled'),
    )

    PAYMENT_METHOD_CHOICES = (
        ('COD', 'Cash on Delivery'),
        ('JazzCash', 'JazzCash'),
        ('EasyPaisa', 'EasyPaisa'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    shipping_address = models.TextField()
    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHOD_CHOICES, default='COD')
    payment_number = models.CharField(max_length=20, blank=True, null=True, help_text="Mobile number for JazzCash/EasyPaisa")
    is_paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Delivery assignment
    assigned_delivery_boy = models.ForeignKey(
        UserProfile, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='assigned_orders',
        limit_choices_to={'user_type': 'delivery_boy'},
        help_text="Delivery boy assigned to this order"
    )
    delivery_assigned_at = models.DateTimeField(null=True, blank=True)
    delivery_completed_at = models.DateTimeField(null=True, blank=True)
    delivery_notes = models.TextField(blank=True, null=True)
    
    # Delivery tracking fields
    number_of_bottles = models.PositiveIntegerField(default=0, help_text="Number of bottles delivered")
    delivery_status = models.CharField(max_length=50, default='Pending', blank=True, help_text="Delivery completion status - managed via DeliveryStatus model")
    delivery_status_updated_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp when delivery status was first updated from Pending")
    cash_received = models.BooleanField(default=False, help_text="Whether cash was received from customer")
    cash_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Amount of cash received")

    def __str__(self):
        return f"Order #{self.id} - {self.user.username}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Price at the time of order

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"
