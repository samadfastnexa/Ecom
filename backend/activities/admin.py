from django.contrib import admin
from .models import ActivityLog


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'category', 'action', 'actor_name', 'target_label')
    list_filter = ('category', 'action')
    search_fields = ('actor_name', 'action', 'target_label')
    readonly_fields = ('timestamp', 'actor', 'actor_name', 'category', 'action',
                       'target_type', 'target_id', 'target_label', 'details')
    ordering = ('-timestamp',)
