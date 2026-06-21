from rest_framework import serializers
from core.image_limits import validate_image_list
from .models import Complaint, ComplaintImage


class ComplaintImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplaintImage
        fields = ['id', 'image']


class ComplaintSerializer(serializers.ModelSerializer):
    images = ComplaintImageSerializer(many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Complaint
        fields = ['id', 'subject', 'description', 'status', 'admin_reply',
                  'admin_reply_at', 'created_at', 'images', 'uploaded_images']
        read_only_fields = ['status', 'admin_reply', 'admin_reply_at', 'created_at']

    def validate_uploaded_images(self, files):
        return validate_image_list(files)

    def create(self, validated_data):
        uploaded = validated_data.pop('uploaded_images', None)
        complaint = super().create(validated_data)
        if uploaded:
            for f in uploaded:
                ComplaintImage.objects.create(complaint=complaint, image=f)
        return complaint


class AdminComplaintSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    images = ComplaintImageSerializer(many=True, read_only=True)

    class Meta:
        model = Complaint
        fields = ['id', 'user_name', 'user_email', 'subject', 'description',
                  'status', 'admin_reply', 'admin_reply_at', 'created_at', 'images']

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_user_email(self, obj):
        return obj.user.email
