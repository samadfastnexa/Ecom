from rest_framework import serializers
from .models import Complaint

class ComplaintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = ['id', 'subject', 'description', 'status', 'created_at']
        read_only_fields = ['status', 'created_at']
