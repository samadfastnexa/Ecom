from rest_framework import serializers
from .models import Complaint

class ComplaintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = ['id', 'subject', 'description', 'status', 'admin_reply', 'admin_reply_at', 'created_at']
        read_only_fields = ['status', 'admin_reply', 'admin_reply_at', 'created_at']


class AdminComplaintSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = ['id', 'user_name', 'user_email', 'subject', 'description',
                  'status', 'admin_reply', 'admin_reply_at', 'created_at']

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_user_email(self, obj):
        return obj.user.email
