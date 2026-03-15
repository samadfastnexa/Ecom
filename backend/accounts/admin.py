from django.contrib import admin
from django.contrib.auth.models import User, Group, Permission
from django.contrib.auth.admin import UserAdmin, GroupAdmin as BaseGroupAdmin
from django.utils.html import format_html
from .models import UserProfile

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'User Profile'
    fk_name = 'user'

# Custom Group Admin
class GroupAdmin(BaseGroupAdmin):
    list_display = ('name', 'get_permissions_count', 'get_users_count')
    search_fields = ('name',)
    filter_horizontal = ('permissions',)
    
    def get_permissions_count(self, obj):
        return obj.permissions.count()
    get_permissions_count.short_description = 'Permissions'
    
    def get_users_count(self, obj):
        return obj.user_set.count()
    get_users_count.short_description = 'Users'

# Custom Permission Admin (optional, for advanced users)
@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ('name', 'content_type', 'codename')
    list_filter = ('content_type',)
    search_fields = ('name', 'codename')
    ordering = ('content_type', 'codename')

class CustomUserAdmin(UserAdmin):
    inlines = (UserProfileInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'get_user_type', 'get_groups', 'is_staff', 'is_active')
    list_filter = ('profile__user_type', 'groups', 'is_staff', 'is_active')
    
    # Add password_hash to readonly fields
    readonly_fields = UserAdmin.readonly_fields + ('password_hash',)
    
    # Add groups and permissions to the form
    filter_horizontal = UserAdmin.filter_horizontal + ('groups', 'user_permissions')
    
    # Add bulk actions
    actions = ['assign_customer_role', 'assign_delivery_boy_role', 'assign_admin_role']
    
    # Override fieldsets to include password hash
    fieldsets = UserAdmin.fieldsets + (
        ('Password Information', {
            'fields': ('password_hash',),
            'description': 'Django stores passwords as secure hashes. The original password cannot be retrieved.',
        }),
    )
    
    def get_user_type(self, obj):
        return obj.profile.user_type if hasattr(obj, 'profile') else 'N/A'
    get_user_type.short_description = 'User Type'
    
    def get_groups(self, obj):
        return ", ".join([g.name for g in obj.groups.all()]) or "No groups"
    get_groups.short_description = 'Groups/Roles'
    
    def password_hash(self, obj):
        """Display the password hash with a simple note"""
        if obj and obj.password:
            return format_html(
                '<div style="background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 10px 0;">'
                '<strong>⚠️ Important:</strong> Django stores passwords as secure hashes. '
                'The original password <strong>cannot be retrieved</strong>.<br><br>'
                'To set a new password, use the "Change password" link above, or use the quick reset buttons below.'
                '</div>'
                '<div style="font-family: monospace; background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 10px;">'
                '<strong>Current Password Hash:</strong><br>'
                '<code style="word-break: break-all;">{}</code>'
                '</div>',
                obj.password
            )
        return "No password set"
    password_hash.short_description = '🔐 Password Information'
    
    def change_view(self, request, object_id, form_url='', extra_context=None):
        """Override change view to add password reset buttons"""
        extra_context = extra_context or {}
        
        # Add custom HTML for password reset buttons
        extra_context['password_reset_buttons'] = format_html(
            '<div style="background: #e7f3ff; padding: 15px; border-radius: 4px; margin: 15px 0;">'
            '<h3 style="margin-top: 0;">⚡ Quick Password Reset</h3>'
            '<p>Set password to a known value for testing:</p>'
            '<form method="post" style="display: inline;">'
            '<input type="hidden" name="csrfmiddlewaretoken" value="{}">'
            '<input type="hidden" name="set_password" value="123456">'
            '<button type="submit" style="background: #417690; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Set to: 123456</button>'
            '</form>'
            '<form method="post" style="display: inline;">'
            '<input type="hidden" name="csrfmiddlewaretoken" value="{}">'
            '<input type="hidden" name="set_password" value="Password123!">'
            '<button type="submit" style="background: #417690; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Set to: Password123!</button>'
            '</form>'
            '<form method="post" style="display: inline;">'
            '<input type="hidden" name="csrfmiddlewaretoken" value="{}">'
            '<input type="hidden" name="set_password" value="deliveryboy1">'
            '<button type="submit" style="background: #417690; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">Set to: deliveryboy1</button>'
            '</form>'
            '<p style="margin-top: 10px; font-size: 12px; color: #666;">After clicking, the password will be set immediately. You can then login with the new password.</p>'
            '</div>',
            request.META.get('CSRF_COOKIE', ''),
            request.META.get('CSRF_COOKIE', ''),
            request.META.get('CSRF_COOKIE', '')
        )
        
        # Handle password reset
        if request.method == 'POST' and 'set_password' in request.POST:
            from django.contrib.auth.models import User
            from django.contrib import messages
            
            user = User.objects.get(pk=object_id)
            new_password = request.POST['set_password']
            user.set_password(new_password)
            user.save()
            messages.success(request, f'Password set to: {new_password}')
            
        return super().change_view(request, object_id, form_url, extra_context)

    
    def get_inline_instances(self, request, obj=None):
        if not obj:
            return list()
        return super().get_inline_instances(request, obj)
    
    # Bulk actions for role assignment
    def assign_customer_role(self, request, queryset):
        customer_group = Group.objects.get_or_create(name='Customer')[0]
        for user in queryset:
            user.groups.add(customer_group)
        self.message_user(request, f"{queryset.count()} user(s) assigned to Customer role")
    assign_customer_role.short_description = "Assign Customer role to selected users"
    
    def assign_delivery_boy_role(self, request, queryset):
        delivery_group = Group.objects.get_or_create(name='Delivery Boy')[0]
        for user in queryset:
            user.groups.add(delivery_group)
            # Also update user_type in profile
            if hasattr(user, 'profile'):
                user.profile.user_type = 'delivery_boy'
                user.profile.save()
        self.message_user(request, f"{queryset.count()} user(s) assigned to Delivery Boy role")
    assign_delivery_boy_role.short_description = "Assign Delivery Boy role to selected users"
    
    def assign_admin_role(self, request, queryset):
        admin_group = Group.objects.get_or_create(name='Admin')[0]
        for user in queryset:
            user.groups.add(admin_group)
            user.is_staff = True
            user.save()
        self.message_user(request, f"{queryset.count()} user(s) assigned to Admin role")
    assign_admin_role.short_description = "Assign Admin role to selected users"

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'user_type', 'phone_number', 'is_available', 'vehicle_type')
    list_filter = ('user_type', 'is_available', 'vehicle_type')
    search_fields = ('user__username', 'user__email', 'phone_number', 'vehicle_number')
    list_editable = ('user_type', 'is_available')
    
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'user_type', 'expo_push_token')
        }),
        ('Delivery Boy Details', {
            'fields': ('phone_number', 'address', 'is_available', 'current_location', 
                      'vehicle_type', 'vehicle_number'),
            'classes': ('collapse',)
        }),
    )

# Unregister the default User and Group admins, then register our custom ones
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)

admin.site.unregister(Group)
admin.site.register(Group, GroupAdmin)