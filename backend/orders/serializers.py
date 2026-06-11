from decimal import Decimal
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Order, OrderItem, DeliveryStatus
from products.serializers import ProductSerializer
from products.models import Product

class DeliveryStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryStatus
        fields = ['id', 'name', 'color', 'background_color', 'border_color', 'order']

class OrderItemSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True
    )

    class Meta:
        model = OrderItem
        fields = ['id', 'product_id', 'product_details', 'quantity', 'price']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    user = serializers.ReadOnlyField(source='user.username')
    assigned_delivery_boy_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ['id', 'user', 'items', 'total_price', 'status', 'shipping_address',
                  'payment_method', 'payment_number', 'is_paid', 'created_at',
                  'assigned_delivery_boy', 'assigned_delivery_boy_name', 'delivery_notes',
                  'delivery_assigned_at', 'delivery_completed_at',
                  'number_of_bottles', 'delivery_status', 'delivery_status_updated_at',
                  'cash_received', 'cash_amount']
        read_only_fields = ['status', 'created_at', 'user', 'is_paid', 'delivery_status_updated_at']

    def get_assigned_delivery_boy_name(self, obj):
        if obj.assigned_delivery_boy:
            return obj.assigned_delivery_boy.user.get_full_name() or obj.assigned_delivery_boy.user.username
        return None

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        user = self.context['request'].user
        order = Order.objects.create(user=user, **validated_data)
        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)
        return order


class AdminOrderSerializer(OrderSerializer):
    """Extended read serializer for staff — includes customer contact details and account balance."""
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    customer_balance = serializers.SerializerMethodField()

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + [
            'guest_name', 'guest_phone', 'is_hidden',
            'customer_name', 'customer_email', 'customer_phone', 'customer_balance',
        ]

    def get_customer_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return obj.guest_name or "Guest"

    def get_customer_email(self, obj):
        return obj.user.email if obj.user else None

    def get_customer_phone(self, obj):
        if obj.user:
            try:
                return obj.user.profile.phone_number
            except Exception:
                return None
        return obj.guest_phone

    def get_customer_balance(self, obj):
        if obj.user:
            try:
                return float(obj.user.profile.account_balance)
            except Exception:
                return None
        return None


class AdminOrderUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            'status', 'is_paid', 'is_hidden',
            'assigned_delivery_boy', 'delivery_notes',
            'cash_amount', 'cash_received',
            'delivery_status',          # staff can override anytime — lock only applies to rider mobile app
        ]

    def update(self, instance, validated_data):
        new_cash = validated_data.get('cash_amount')
        if new_cash is not None and instance.user_id:
            old_cash = instance.cash_amount or Decimal('0')
            delta = Decimal(str(new_cash)) - old_cash
            if delta != 0:
                profile = instance.user.profile
                profile.account_balance += delta
                profile.save(update_fields=['account_balance'])
            # Auto-resolve is_paid unless the caller explicitly set it
            if 'is_paid' not in validated_data:
                validated_data['is_paid'] = new_cash >= instance.total_price
            if 'cash_received' not in validated_data:
                validated_data['cash_received'] = new_cash > 0
        return super().update(instance, validated_data)


class AdminOrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.PrimaryKeyRelatedField(queryset=Product.objects.filter(is_active=True))
    quantity = serializers.IntegerField(min_value=1)


class AdminOrderCreateSerializer(serializers.ModelSerializer):
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='user', required=False, allow_null=True
    )
    items = AdminOrderItemInputSerializer(many=True, write_only=True)

    class Meta:
        model = Order
        fields = [
            'user_id', 'guest_name', 'guest_phone',
            'shipping_address', 'payment_method', 'payment_number',
            'assigned_delivery_boy', 'delivery_notes', 'status', 'items',
        ]
        extra_kwargs = {
            'status': {'default': 'Processing'},
            'shipping_address': {'required': True},
        }

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        total = sum(
            item['product_id'].price * item['quantity']
            for item in items_data
        )
        order = Order.objects.create(total_price=total, **validated_data)
        for item in items_data:
            OrderItem.objects.create(
                order=order,
                product=item['product_id'],
                quantity=item['quantity'],
                price=item['product_id'].price,
            )
        return order
