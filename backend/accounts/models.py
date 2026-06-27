from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from datetime import date

# ── Mobile profile field config ──────────────────────────────────────────────

PROFILE_FIELD_DEFAULTS = {
    'delivery_boy': {
        'first_name':        {'visible': True,  'editable': True,  'label': 'First Name'},
        'last_name':         {'visible': True,  'editable': True,  'label': 'Last Name'},
        'phone_number':      {'visible': True,  'editable': True,  'label': 'Phone Number'},
        'address':           {'visible': True,  'editable': True,  'label': 'Address'},
        'emergency_contact': {'visible': True,  'editable': True,  'label': 'Emergency Contact'},
        'employee_id':       {'visible': True,  'editable': False, 'label': 'Employee ID'},
        'designation':       {'visible': True,  'editable': False, 'label': 'Designation'},
        'department':        {'visible': True,  'editable': False, 'label': 'Department'},
        'vehicle_type':      {'visible': True,  'editable': False, 'label': 'Vehicle Type'},
        'vehicle_number':    {'visible': True,  'editable': False, 'label': 'Vehicle Number'},
        'cnic_number':       {'visible': False, 'editable': False, 'label': 'CNIC Number'},
        'date_of_birth':     {'visible': False, 'editable': False, 'label': 'Date of Birth'},
        'date_of_joining':   {'visible': False, 'editable': False, 'label': 'Date of Joining'},
        'salary':            {'visible': False, 'editable': False, 'label': 'Salary'},
        'remarks':           {'visible': False, 'editable': False, 'label': 'Remarks'},
    },
    'staff': {
        'first_name':        {'visible': True,  'editable': True,  'label': 'First Name'},
        'last_name':         {'visible': True,  'editable': True,  'label': 'Last Name'},
        'phone_number':      {'visible': True,  'editable': True,  'label': 'Phone Number'},
        'address':           {'visible': True,  'editable': True,  'label': 'Address'},
        'emergency_contact': {'visible': True,  'editable': True,  'label': 'Emergency Contact'},
        'employee_id':       {'visible': True,  'editable': False, 'label': 'Employee ID'},
        'designation':       {'visible': True,  'editable': False, 'label': 'Designation'},
        'department':        {'visible': True,  'editable': False, 'label': 'Department'},
        'vehicle_type':      {'visible': False, 'editable': False, 'label': 'Vehicle Type'},
        'vehicle_number':    {'visible': False, 'editable': False, 'label': 'Vehicle Number'},
        'cnic_number':       {'visible': False, 'editable': False, 'label': 'CNIC Number'},
        'date_of_birth':     {'visible': False, 'editable': False, 'label': 'Date of Birth'},
        'date_of_joining':   {'visible': False, 'editable': False, 'label': 'Date of Joining'},
        'salary':            {'visible': False, 'editable': False, 'label': 'Salary'},
        'remarks':           {'visible': False, 'editable': False, 'label': 'Remarks'},
    },
}


class MobileProfileConfig(models.Model):
    user_type = models.CharField(max_length=20, unique=True)
    fields_config = models.JSONField(default=dict)

    def get_config(self):
        defaults = PROFILE_FIELD_DEFAULTS.get(self.user_type, {})
        merged = {k: dict(v) for k, v in defaults.items()}
        for key, val in self.fields_config.items():
            if key in merged:
                merged[key].update(val)
        return merged

    @classmethod
    def for_type(cls, user_type):
        obj, _ = cls.objects.get_or_create(user_type=user_type)
        return obj.get_config()

    def __str__(self):
        return f'MobileProfileConfig({self.user_type})'


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
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_staff',
        help_text="Admin who created this staff account",
    )

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


class NotificationHistory(models.Model):
    """Store history of sent push notifications for admin tracking."""
    RECIPIENT_TYPE_CHOICES = [
        ('all', 'Everyone'),
        ('customers', 'Customers Only'),
        ('riders', 'Delivery Boys Only'),
        ('admins', 'Admins Only'),
        ('test', 'Test Mode'),
    ]

    title = models.CharField(max_length=200)
    body = models.TextField()
    recipient_type = models.CharField(max_length=20, choices=RECIPIENT_TYPE_CHOICES, default='all')
    image_url = models.URLField(blank=True, null=True)
    sent_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='sent_notifications')
    sent_count = models.IntegerField(default=0, help_text="Number of devices that received the notification")
    total_devices = models.IntegerField(default=0, help_text="Total number of target devices")
    scheduled_for = models.DateTimeField(blank=True, null=True, help_text="When notification is scheduled to be sent")
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(blank=True, null=True, help_text="When notification was actually sent")

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Notification Histories'

    def __str__(self):
        return f"{self.title} - {self.recipient_type} ({self.created_at.strftime('%Y-%m-%d')})"

    @property
    def success_rate(self):
        """Calculate percentage of successful sends."""
        if self.total_devices == 0:
            return 0
        return round((self.sent_count / self.total_devices) * 100, 2)


class NotificationTemplate(models.Model):
    """Reusable push-notification template an admin can save and re-send."""
    RECIPIENT_TYPE_CHOICES = NotificationHistory.RECIPIENT_TYPE_CHOICES

    name = models.CharField(max_length=120, help_text="Short label for this template")
    title = models.CharField(max_length=200)
    body = models.TextField()
    recipient_type = models.CharField(
        max_length=20, choices=RECIPIENT_TYPE_CHOICES, default='all'
    )
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='notification_templates',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.name
