from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from datetime import date


class UserProfile(models.Model):
    USER_TYPE_CHOICES = [
        ('customer', 'Customer'),
        ('delivery_boy', 'Delivery Boy'),
        ('staff', 'Staff'),
        ('admin', 'Admin'),
    ]

    WORKING_STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
        ('Resigned', 'Resigned'),
        ('Terminated', 'Terminated'),
        ('On Leave', 'On Leave'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default='customer')
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    current_location = models.CharField(max_length=255, blank=True, null=True)
    is_available = models.BooleanField(default=True)
    vehicle_type = models.CharField(max_length=50, blank=True, null=True)
    vehicle_number = models.CharField(max_length=50, blank=True, null=True)
    expo_push_token = models.CharField(max_length=255, blank=True, null=True)
    custom_bottle_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Custom per-bottle price for this customer; "
                  "falls back to the standard price when empty",
    )
    account_balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Running balance: positive = customer has credit, negative = customer owes",
    )

    # ── Staff / HR fields ────────────────────────────────────────────────────
    is_rider = models.BooleanField(
        default=False,
        help_text="If checked, this staff member can be assigned deliveries/orders.",
    )
    employee_id = models.CharField(max_length=50, blank=True, null=True, unique=True)
    cnic_number = models.CharField(max_length=20, blank=True, null=True)
    profile_picture = models.ImageField(upload_to='staff/profile/', blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    date_of_joining = models.DateField(blank=True, null=True)
    working_status = models.CharField(
        max_length=20, choices=WORKING_STATUS_CHOICES, default='Active',
    )
    emergency_contact = models.CharField(max_length=20, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    designation = models.CharField(max_length=100, blank=True, null=True)
    salary = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)

    # ── Document uploads ─────────────────────────────────────────────────────
    cnic_front = models.ImageField(upload_to='staff/docs/', blank=True, null=True)
    cnic_back = models.ImageField(upload_to='staff/docs/', blank=True, null=True)
    driving_license = models.ImageField(upload_to='staff/docs/', blank=True, null=True)

    @property
    def age(self):
        if not self.date_of_birth:
            return None
        today = date.today()
        dob = self.date_of_birth
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    def __str__(self):
        return f"{self.user.username} - {self.get_user_type_display()}"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()
    else:
        UserProfile.objects.get_or_create(user=instance)
