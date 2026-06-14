from rest_framework import serializers
from .models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = [
            'id', 'timestamp', 'actor_name',
            'category', 'action',
            'target_type', 'target_id', 'target_label',
            'details',
        ]
