from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework.validators import UniqueValidator
from .models import UserProfile, NotificationTemplate


class NotificationTemplateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = NotificationTemplate
        fields = (
            'id', 'name', 'title', 'body', 'recipient_type',
            'created_by_name', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_by_name', 'created_at', 'updated_at')

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def validate_name(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Template name is required.')
        return value

    def validate_title(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Title is required.')
        return value

    def validate_body(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Message is required.')
        return value


class UpdateProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        required=False,
        validators=[UniqueValidator(queryset=User.objects.all(), message="Username already taken.")],
    )
    phone_number = serializers.CharField(
        source='profile.phone_number', allow_blank=True, allow_null=True, required=False
    )
    address = serializers.CharField(
        source='profile.address', allow_blank=True, allow_null=True, required=False
    )

    class Meta:
        model = User
        fields = ('username', 'first_name', 'last_name', 'email', 'phone_number', 'address')
        extra_kwargs = {
            'email': {'required': False},
            'first_name': {'required': False},
            'last_name': {'required': False},
        }

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if profile_data:
            profile = instance.profile
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(
        required=True, write_only=True, validators=[validate_password], min_length=8
    )

    def validate_old_password(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password], min_length=8
    )
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm', 'first_name', 'last_name')
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        password = attrs['password']
        if not any(char.isdigit() for char in password):
            raise serializers.ValidationError({"password": "Password must contain at least one digit."})
        if not any(char.isupper() for char in password):
            raise serializers.ValidationError({"password": "Password must contain at least one uppercase letter."})
        if not any(char.islower() for char in password):
            raise serializers.ValidationError({"password": "Password must contain at least one lowercase letter."})
        if not any(not char.isalnum() for char in password):
            raise serializers.ValidationError({"password": "Password must contain at least one special character."})
        return attrs

    def create(self, validated_data):
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            is_active=True,
        )
        user.set_password(validated_data['password'])
        user.save()
        profile = user.profile
        profile.user_type = 'customer'
        profile.save(update_fields=['user_type'])
        return user


# ─── Staff / Rider serializers ────────────────────────────────────────────────

class StaffProfileSerializer(serializers.ModelSerializer):
    """Full staff profile with optional rider delivery stats — staff-admin only."""
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    full_name = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    last_login = serializers.DateTimeField(source='user.last_login', read_only=True)
    date_joined = serializers.DateTimeField(source='user.date_joined', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    total_deliveries = serializers.SerializerMethodField()
    delivered_count = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()
    cnic_front_url = serializers.SerializerMethodField()
    cnic_back_url = serializers.SerializerMethodField()
    driving_license_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'id', 'user_id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'is_active', 'last_login', 'date_joined', 'created_by_name',
            'phone_number', 'address', 'is_available',
            # Rider-specific
            'is_rider', 'vehicle_type', 'vehicle_number',
            # HR fields
            'employee_id', 'cnic_number', 'date_of_birth', 'age', 'date_of_joining',
            'working_status', 'emergency_contact', 'department', 'designation',
            'salary', 'remarks',
            # Media
            'profile_picture_url', 'cnic_front_url', 'cnic_back_url', 'driving_license_url',
            # Stats (riders only)
            'total_deliveries', 'delivered_count',
        ]

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def get_age(self, obj):
        return obj.age

    def get_total_deliveries(self, obj):
        if not obj.is_rider:
            return None
        return obj.assigned_orders.exclude(status='Cancelled').count()

    def get_delivered_count(self, obj):
        if not obj.is_rider:
            return None
        return obj.assigned_orders.filter(status='Delivered').count()

    def _abs_url(self, request, field_value):
        if not field_value:
            return None
        if request:
            return request.build_absolute_uri(field_value.url)
        return field_value.url

    def get_profile_picture_url(self, obj):
        return self._abs_url(self.context.get('request'), obj.profile_picture)

    def get_cnic_front_url(self, obj):
        return self._abs_url(self.context.get('request'), obj.cnic_front)

    def get_cnic_back_url(self, obj):
        return self._abs_url(self.context.get('request'), obj.cnic_back)

    def get_driving_license_url(self, obj):
        return self._abs_url(self.context.get('request'), obj.driving_license)


class CreateStaffSerializer(serializers.Serializer):
    """Creates a Django user as a staff member (rider or non-rider)."""
    username = serializers.CharField()
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    password = serializers.CharField(write_only=True, min_length=6)
    first_name = serializers.CharField(required=False, allow_blank=True, default='')
    last_name = serializers.CharField(required=False, allow_blank=True, default='')
    phone_number = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    # Rider
    is_rider = serializers.BooleanField(required=False, default=False)
    vehicle_type = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    vehicle_number = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    # HR
    employee_id = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    cnic_number = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    date_of_birth = serializers.DateField(required=False, allow_null=True, default=None)
    date_of_joining = serializers.DateField(required=False, allow_null=True, default=None)
    working_status = serializers.ChoiceField(
        choices=UserProfile.WORKING_STATUS_CHOICES, required=False, default='Active'
    )
    emergency_contact = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    department = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    designation = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    salary = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True, default=None)
    remarks = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already taken.")
        return value

    def validate_employee_id(self, value):
        if value and UserProfile.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError("Employee ID already in use.")
        return value

    def create(self, validated_data):
        is_rider = validated_data.pop('is_rider', False)
        profile_fields = [
            'phone_number', 'vehicle_type', 'vehicle_number', 'employee_id', 'cnic_number',
            'date_of_birth', 'date_of_joining', 'working_status', 'emergency_contact',
            'department', 'designation', 'salary', 'remarks', 'address',
        ]
        profile_data = {k: validated_data.pop(k) for k in profile_fields if k in validated_data}
        password = validated_data.pop('password')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        profile = user.profile
        profile.is_rider = is_rider
        profile.user_type = 'delivery_boy' if is_rider else 'staff'
        for attr, value in profile_data.items():
            if value is not None or attr in ('date_of_birth', 'date_of_joining', 'salary'):
                setattr(profile, attr, value)
        profile.save()
        return profile


class UpdateStaffSerializer(serializers.Serializer):
    """PATCH updates to a staff member — user fields + all profile fields."""
    username = serializers.CharField(required=False)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

    def validate_username(self, value):
        if value:
            qs = User.objects.filter(username=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.user.pk)
            if qs.exists():
                raise serializers.ValidationError("Username already taken.")
        return value
    phone_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    # Rider
    is_rider = serializers.BooleanField(required=False)
    is_available = serializers.BooleanField(required=False)
    vehicle_type = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    vehicle_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    # HR
    employee_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    cnic_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    date_of_joining = serializers.DateField(required=False, allow_null=True)
    working_status = serializers.ChoiceField(choices=UserProfile.WORKING_STATUS_CHOICES, required=False)
    emergency_contact = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    department = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    designation = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    salary = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    remarks = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_employee_id(self, value):
        if value:
            qs = UserProfile.objects.filter(employee_id=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("Employee ID already in use.")
        return value

    def update(self, profile, validated_data):
        user_fields = ['username', 'first_name', 'last_name', 'email', 'is_active']
        user_data = {k: validated_data.pop(k) for k in user_fields if k in validated_data}
        if user_data:
            for attr, value in user_data.items():
                setattr(profile.user, attr, value)
            profile.user.save()
        # Sync user_type from is_rider if provided
        is_rider = validated_data.pop('is_rider', None)
        if is_rider is not None:
            profile.is_rider = is_rider
            profile.user_type = 'delivery_boy' if is_rider else 'staff'
        for attr, value in validated_data.items():
            setattr(profile, attr, value)
        profile.save()
        return profile


# ─── Legacy aliases (kept for mobile app compatibility) ───────────────────────

RiderProfileSerializer = StaffProfileSerializer
CreateRiderSerializer = CreateStaffSerializer
UpdateRiderSerializer = UpdateStaffSerializer


# ─── User (self-profile) serializer ──────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    user_type = serializers.CharField(source='profile.user_type', read_only=True)
    phone_number = serializers.CharField(source='profile.phone_number', read_only=True)
    address = serializers.CharField(source='profile.address', read_only=True)
    is_available = serializers.BooleanField(source='profile.is_available', read_only=True)
    vehicle_type = serializers.CharField(source='profile.vehicle_type', read_only=True)
    vehicle_number = serializers.CharField(source='profile.vehicle_number', read_only=True)
    account_balance = serializers.DecimalField(
        source='profile.account_balance', max_digits=12, decimal_places=2, read_only=True
    )
    is_staff = serializers.BooleanField(read_only=True)
    can_manage_plant = serializers.SerializerMethodField()
    # Staff / rider HR fields (null for customers)
    employee_id = serializers.CharField(source='profile.employee_id', read_only=True)
    designation = serializers.CharField(source='profile.designation', read_only=True)
    department = serializers.CharField(source='profile.department', read_only=True)
    emergency_contact = serializers.CharField(source='profile.emergency_contact', read_only=True)
    cnic_number = serializers.CharField(source='profile.cnic_number', read_only=True)
    date_of_birth = serializers.DateField(source='profile.date_of_birth', read_only=True)
    date_of_joining = serializers.DateField(source='profile.date_of_joining', read_only=True)
    salary = serializers.DecimalField(
        source='profile.salary', max_digits=12, decimal_places=2, read_only=True
    )
    remarks = serializers.CharField(source='profile.remarks', read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name',
            'user_type', 'phone_number', 'address', 'is_available',
            'vehicle_type', 'vehicle_number', 'account_balance',
            'is_staff', 'can_manage_plant',
            'employee_id', 'designation', 'department', 'emergency_contact',
            'cnic_number', 'date_of_birth', 'date_of_joining', 'salary', 'remarks',
        )

    def get_can_manage_plant(self, obj):
        return (
            obj.is_superuser
            or obj.is_staff
            or obj.has_perm('plant.view_deliveryrecord')
        )
