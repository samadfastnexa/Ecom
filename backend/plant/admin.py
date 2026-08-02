from django.contrib import admin
from .models import DeliveryRecord, CustomerType, BottleType, PlantSettings


@admin.register(CustomerType)
class CustomerTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'default_price', 'order', 'is_active')
    list_editable = ('default_price', 'order', 'is_active')
    search_fields = ('name',)


@admin.register(BottleType)
class BottleTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'default_price', 'order', 'is_active')
    list_editable = ('default_price', 'order', 'is_active')
    search_fields = ('name',)


@admin.register(DeliveryRecord)
class DeliveryRecordAdmin(admin.ModelAdmin):
    list_display = (
        'date', 'house', 'customer', 'bottles', 'unit_price', 'amount', 'paid',
    )
    list_filter = ('date', 'paid')
    search_fields = ('house', 'customer__username', 'notes')
    date_hierarchy = 'date'
    readonly_fields = ('amount', 'created_by', 'created_at', 'updated_at')

    def save_model(self, request, obj, form, change):
        if not obj.pk and not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
        # Keep the customer ledger in step with edits made here, not just
        # through the API.
        from ledger.service import sync_delivery_record
        sync_delivery_record(obj, actor=request.user)

    def delete_model(self, request, obj):
        from ledger.service import void_delivery_record
        void_delivery_record(obj, actor=request.user)  # unwind before the row goes
        super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        from ledger.service import void_delivery_record
        for obj in queryset:
            void_delivery_record(obj, actor=request.user)
        super().delete_queryset(request, queryset)


@admin.register(PlantSettings)
class PlantSettingsAdmin(admin.ModelAdmin):
    list_display = ('standard_unit_price', 'updated_at')

    def has_add_permission(self, request):
        # Singleton: only allow adding when none exists.
        return not PlantSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
