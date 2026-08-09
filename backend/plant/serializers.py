from decimal import Decimal

from rest_framework import serializers
from django.contrib.auth.models import User

from accounts.models import DiscountCategory, line_discount_amount
from .models import (
    DeliveryRecord, CustomerType, BottleType, PlantSettings, resolve_price,
)


class CustomerTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerType
        fields = ['id', 'name', 'default_price', 'order', 'is_active']


class BottleTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = BottleType
        fields = ['id', 'name', 'default_price', 'order', 'is_active']


class DeliveryRecordSerializer(serializers.ModelSerializer):
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='customer',
        required=False,
        allow_null=True,
    )
    customer_name = serializers.SerializerMethodField()
    customer_type_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomerType.objects.all(),
        source='customer_type',
        required=False,
        allow_null=True,
    )
    customer_type_name = serializers.CharField(
        source='customer_type.name', read_only=True, default=None
    )
    bottle_type_id = serializers.PrimaryKeyRelatedField(
        queryset=BottleType.objects.all(),
        source='bottle_type',
        required=False,
        allow_null=True,
    )
    bottle_type_name = serializers.CharField(
        source='bottle_type.name', read_only=True, default=None
    )
    amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    pending = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    payment_status = serializers.CharField(read_only=True)
    # The frozen billing snapshot — derived server-side, never client input.
    gross_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    discount_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    # Honoured only for staff with can_override_discount; the viewset 403s
    # everyone else before validation runs.
    discount_override = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0'),
        required=False, allow_null=True, write_only=True,
    )

    class Meta:
        model = DeliveryRecord
        fields = [
            'id', 'date', 'customer_id', 'customer_name',
            'customer_type_id', 'customer_type_name',
            'bottle_type_id', 'bottle_type_name', 'house',
            'bottles', 'unit_price', 'amount', 'empties_collected',
            'gross_amount', 'discount_amount', 'discount_category',
            'discount_category_name', 'discount_type', 'discount_value',
            'discount_overridden', 'discount_override',
            'paid', 'paid_amount', 'pending', 'payment_status',
            'notes', 'created_at',
        ]
        read_only_fields = [
            'paid', 'discount_category', 'discount_category_name',
            'discount_type', 'discount_value', 'discount_overridden',
        ]

    def get_customer_name(self, obj):
        if obj.customer:
            return obj.customer.get_full_name() or obj.customer.username
        return None

    def validate(self, attrs):
        # `customer` may be absent on PATCH; fall back to the existing instance.
        customer = attrs.get(
            'customer', getattr(self.instance, 'customer', None)
        )
        house = attrs.get('house', getattr(self.instance, 'house', '')) or ''

        if not house.strip() and not customer:
            raise serializers.ValidationError(
                "Provide a house/address or select a customer."
            )
        # Auto-fill the house label from the customer when left blank.
        if not house.strip() and customer:
            attrs['house'] = customer.get_full_name() or customer.username

        # Resolve the price when CREATING a record without an explicit price.
        # On updates (PATCH) we must not touch a price that wasn't sent.
        if self.instance is None and not attrs.get('unit_price'):
            standard = PlantSettings.load().standard_unit_price
            customer_type = attrs.get(
                'customer_type', getattr(self.instance, 'customer_type', None)
            )
            bottle_type = attrs.get(
                'bottle_type', getattr(self.instance, 'bottle_type', None)
            )
            attrs['unit_price'] = resolve_price(
                customer, customer_type, bottle_type, standard
            )
        return attrs

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        override = validated_data.pop('discount_override', None)
        if override is None:
            # DeliveryRecord.save() freezes the customer's category snapshot
            # and derives gross / discount / net itself.
            return super().create(validated_data)

        record = DeliveryRecord(**validated_data)
        # Freeze the category for display even though the amount is pinned —
        # the receipt still reads "Discount (Wholesale)".
        category = DiscountCategory.for_customer(record.customer)
        auto = (
            category.line_discount(record.bottles, record.unit_price)
            if category else Decimal('0.00')
        )
        if category:
            record.discount_category = category
            record.discount_category_name = category.name
            record.discount_type = category.discount_type
            record.discount_value = category.discount_value
        record.discount_overridden = True
        record.discount_amount = override
        record.save()
        record._auto_discount_amount = auto  # for the viewset's audit log
        return record

    def update(self, instance, validated_data):
        override = validated_data.pop('discount_override', None)
        record = super().update(instance, validated_data)
        if override is not None:
            # What billing would have charged under the frozen snapshot, for
            # the audit trail.
            auto = (
                line_discount_amount(
                    record.discount_type, record.discount_value,
                    record.bottles, record.unit_price,
                )
                if record.discount_type else Decimal('0.00')
            )
            record.discount_overridden = True
            record.discount_amount = override
            record.save()
            record._auto_discount_amount = auto
        return record


class PlantCustomerSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'name', 'address', 'phone']

    def get_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_address(self, obj):
        return getattr(getattr(obj, 'profile', None), 'address', None)

    def get_phone(self, obj):
        return getattr(getattr(obj, 'profile', None), 'phone_number', None)
