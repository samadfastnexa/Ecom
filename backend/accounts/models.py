from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

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


class Area(models.Model):
    """
    Admin-managed list of delivery localities (Johar Town, Wapda Town, …).

    Offered as suggestions on the signup form. A customer may still type an
    area that is not on the list, so `UserProfile.area` is free text rather
    than a foreign key — the list drives the dropdown, it does not constrain it.
    """

    name = models.CharField(max_length=120, unique=True)
    is_active = models.BooleanField(
        default=True, help_text="Uncheck to hide from the signup dropdown.",
    )
    order = models.PositiveIntegerField(
        default=0, help_text="Lower numbers appear first.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'name']
        verbose_name = 'Area'
        verbose_name_plural = 'Areas'

    def __str__(self):
        return self.name


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
    customer_code = models.CharField(
        max_length=12, unique=True, null=True, blank=True, db_index=True,
        help_text="Short account code shown on ledger statements, e.g. 00245. "
                  "Assigned automatically on first use.",
    )
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(
        blank=True, null=True,
        help_text="Full delivery address; kept in sync with the structured parts below",
    )
    # ── Structured address parts (composed into `address`) ───────────────────
    house_number = models.CharField(max_length=50, blank=True, null=True)
    portion = models.CharField(
        max_length=50, blank=True, null=True,
        help_text="Ground floor / 1st floor / etc. — optional",
    )
    block = models.CharField(
        max_length=100, blank=True, null=True,
        help_text="Block or street within the area — optional",
    )
    area = models.CharField(
        max_length=150, blank=True, null=True,
        help_text="Locality, e.g. Johar Town. Suggested from the Area list, "
                  "but a customer may enter their own.",
    )
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

    def compose_address(self):
        """Join the structured parts into a single human-readable address line."""
        parts = [self.house_number, self.portion, self.block, self.area]
        return ', '.join(p.strip() for p in parts if p and p.strip())

    def sync_address(self):
        """Refresh `address` from the structured parts when any of them is set."""
        composed = self.compose_address()
        if composed:
            self.address = composed
        return self.address

    def __str__(self):
        return f"{self.user.username} - {self.get_user_type_display()}"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, created, **kwargs):
    # Deliberately does NOT full-save the profile. Doing so wrote back every
    # column from a possibly-stale in-memory copy, which could silently revert
    # a concurrently-updated account_balance. Every caller that changes profile
    # fields saves the profile itself, so nothing relies on that behaviour.
    if created:
        return
    if not hasattr(instance, 'profile'):
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


# ── Rider live location ──────────────────────────────────────────────────────

# A fix older than this is "last seen here" rather than "here now". Ten minutes
# is well clear of the 60-second default ping interval, so a rider in a basement
# or under a flyover does not flicker stale between refreshes.
LOCATION_STALE_AFTER_MINUTES = 10

# Coordinates are Decimal, never float: MySQL float rounding is visible on a map
# as a pin that jumps a few metres every time the row is read back. Six decimal
# places is ~11 cm, finer than any consumer GPS.
LATITUDE_VALIDATORS = [MinValueValidator(Decimal('-90')), MaxValueValidator(Decimal('90'))]
LONGITUDE_VALIDATORS = [MinValueValidator(Decimal('-180')), MaxValueValidator(Decimal('180'))]


class TrackingSettings(models.Model):
    """Singleton holding the rider-tracking policy the mobile app must obey."""

    TRACKING_MODE_CHOICES = [
        ('always', 'Always — 24/7, even with the app closed'),
        ('active_delivery', 'Only while a delivery is in progress'),
        ('foreground', 'Only while the app is open'),
    ]

    tracking_enabled = models.BooleanField(
        default=True,
        help_text="Master switch. Off means the app stops reporting entirely.",
    )
    # The app fetches this on login and obeys it, so the business can dial
    # tracking back — or off — without waiting on a new store build.
    tracking_mode = models.CharField(
        max_length=20, choices=TRACKING_MODE_CHOICES, default='always',
        help_text="'always' is the deliberate business default: riders are tracked "
                  "around the clock, not only on shift.",
    )
    ping_interval_seconds = models.PositiveIntegerField(
        default=60, help_text="Seconds between location reports.",
    )
    ping_distance_meters = models.PositiveIntegerField(
        default=50, help_text="Report early if the rider has moved at least this far.",
    )
    trail_retention_days = models.PositiveIntegerField(
        default=7,
        help_text="How long the breadcrumb trail is kept; prune_rider_pings "
                  "deletes anything older.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Tracking Settings'
        verbose_name_plural = 'Tracking Settings'

    def __str__(self):
        state = 'on' if self.tracking_enabled else 'off'
        return f"Tracking {state} ({self.get_tracking_mode_display()})"

    def save(self, *args, **kwargs):
        self.pk = 1  # enforce a single row
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class RiderLocation(models.Model):
    """
    A rider's CURRENT position — exactly one row per rider, upserted on every
    report. The history it came from lives in RiderLocationPing.
    """

    rider = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='rider_location',
        limit_choices_to={'profile__user_type': 'delivery_boy'},
    )
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, validators=LATITUDE_VALIDATORS,
    )
    longitude = models.DecimalField(
        max_digits=10, decimal_places=6, validators=LONGITUDE_VALIDATORS,
    )
    accuracy_m = models.FloatField(
        null=True, blank=True, help_text="Reported horizontal accuracy in metres.",
    )
    speed_kmh = models.FloatField(null=True, blank=True)
    heading = models.FloatField(
        null=True, blank=True, help_text="Degrees clockwise from true north.",
    )
    battery_level = models.SmallIntegerField(
        null=True, blank=True,
        help_text="Device battery percentage, when the app reports it.",
    )
    is_moving = models.BooleanField(default=False)
    # Two clocks on purpose. A rider flushing an offline queue sends fixes that
    # are minutes or hours old, so staleness has to be judged on when the DEVICE
    # took the fix, not on when the server happened to receive it.
    recorded_at = models.DateTimeField(db_index=True)
    received_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Rider Location'
        verbose_name_plural = 'Rider Locations'
        constraints = [
            # MariaDB may ignore CHECK constraints entirely, so the serializer
            # enforces the same ranges in Python — that is the real guard.
            models.CheckConstraint(
                condition=models.Q(latitude__gte=-90) & models.Q(latitude__lte=90),
                name='rider_location_latitude_range',
            ),
            models.CheckConstraint(
                condition=models.Q(longitude__gte=-180) & models.Q(longitude__lte=180),
                name='rider_location_longitude_range',
            ),
        ]

    def __str__(self):
        return f"{self.rider.username} @ {self.latitude},{self.longitude}"

    @property
    def is_stale(self):
        """True when the last fix is too old for the pin to be trusted."""
        if not self.recorded_at:
            return True
        return self.recorded_at < timezone.now() - timedelta(minutes=LOCATION_STALE_AFTER_MINUTES)

    @property
    def minutes_ago(self):
        if not self.recorded_at:
            return None
        return round((timezone.now() - self.recorded_at).total_seconds() / 60, 1)


class RiderLocationPing(models.Model):
    """
    Append-only breadcrumb trail, one row per reported fix — this is what
    "show today's route" draws. Pruned by the prune_rider_pings command once a
    row is older than TrackingSettings.trail_retention_days.
    """

    rider = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='location_pings',
        limit_choices_to={'profile__user_type': 'delivery_boy'},
    )
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, validators=LATITUDE_VALIDATORS,
    )
    longitude = models.DecimalField(
        max_digits=10, decimal_places=6, validators=LONGITUDE_VALIDATORS,
    )
    accuracy_m = models.FloatField(null=True, blank=True)
    recorded_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Rider Location Ping'
        verbose_name_plural = 'Rider Location Pings'
        ordering = ['-recorded_at']
        indexes = [
            # Every read is "this rider, most recent first" — either the trail
            # for one day or the newest fix. Without this the table is a scan.
            models.Index(fields=['rider', '-recorded_at'], name='rider_ping_recent_idx'),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(latitude__gte=-90) & models.Q(latitude__lte=90),
                name='rider_ping_latitude_range',
            ),
            models.CheckConstraint(
                condition=models.Q(longitude__gte=-180) & models.Q(longitude__lte=180),
                name='rider_ping_longitude_range',
            ),
        ]

    def __str__(self):
        return f"{self.rider.username} {self.recorded_at:%Y-%m-%d %H:%M} {self.latitude},{self.longitude}"
