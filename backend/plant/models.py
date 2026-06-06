from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class CustomerType(models.Model):
    """Admin-managed category for a delivery (e.g. Residential, Commercial)."""

    name = models.CharField(max_length=100, unique=True)
    default_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Optional default per-bottle price for this customer type",
    )
    order = models.PositiveIntegerField(default=0, help_text="Display order")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class BottleType(models.Model):
    """Admin-managed type of bottle delivered (e.g. Labelled, Nestlé, Sprinkle)."""

    name = models.CharField(max_length=100, unique=True)
    default_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Optional default per-bottle price for this bottle type",
    )
    order = models.PositiveIntegerField(default=0, help_text="Display order")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class DeliveryRecord(models.Model):
    """A single bottle-delivery / collection entry in the plant ledger."""

    date = models.DateField(default=timezone.localdate, db_index=True)
    customer_type = models.ForeignKey(
        CustomerType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='records',
    )
    bottle_type = models.ForeignKey(
        BottleType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='records',
    )

    # A record can be tied to a registered customer, typed as free text, or both.
    customer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='plant_records',
        help_text="Optional link to a registered customer",
    )
    house = models.CharField(
        max_length=255,
        blank=True,
        help_text="House name / number or address",
    )

    bottles = models.PositiveIntegerField(default=0)
    unit_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, help_text="Price per bottle"
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        editable=False,
        help_text="Auto-calculated: bottles × unit price",
    )

    paid = models.BooleanField(default=False, help_text="True when fully paid")
    paid_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Amount actually received from the customer",
    )
    notes = models.TextField(blank=True)

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='plant_records_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name = 'Delivery Record'
        verbose_name_plural = 'Delivery Records'

    def save(self, *args, **kwargs):
        # Total is always derived from bottles × unit price.
        self.amount = (self.bottles or 0) * (self.unit_price or 0)
        if self.paid_amount is None:
            self.paid_amount = 0
        # Keep the boolean in sync: fully paid when received covers the total.
        self.paid = self.amount > 0 and self.paid_amount >= self.amount
        super().save(*args, **kwargs)

    @property
    def pending(self):
        balance = (self.amount or 0) - (self.paid_amount or 0)
        return balance if balance > 0 else 0

    @property
    def payment_status(self):
        if self.amount > 0 and self.paid_amount >= self.amount:
            return 'paid'
        if self.paid_amount and self.paid_amount > 0:
            return 'partial'
        return 'unpaid'

    def __str__(self):
        label = self.house or (self.customer and self.customer.username) or "—"
        return f"{self.date} · {label} · {self.bottles} bottles"


class PlantSettings(models.Model):
    """Singleton holding plant-wide configuration (the standard bottle price)."""

    standard_unit_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Default per-bottle price used when no customer override exists",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Plant Settings'
        verbose_name_plural = 'Plant Settings'

    def __str__(self):
        return f"Standard price: {self.standard_unit_price}"

    def save(self, *args, **kwargs):
        self.pk = 1  # enforce a single row
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


def effective_price(customer, standard):
    """A customer's custom price if set, otherwise the standard price."""
    profile = getattr(customer, 'profile', None) if customer else None
    if profile and profile.custom_bottle_price is not None:
        return profile.custom_bottle_price
    return standard


def resolve_price(customer, customer_type, bottle_type, standard):
    """Price priority: customer override → bottle-type → customer-type → standard."""
    profile = getattr(customer, 'profile', None) if customer else None
    if profile and profile.custom_bottle_price is not None:
        return profile.custom_bottle_price
    if bottle_type is not None and bottle_type.default_price is not None:
        return bottle_type.default_price
    if customer_type is not None and customer_type.default_price is not None:
        return customer_type.default_price
    return standard
