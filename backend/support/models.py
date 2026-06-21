from django.db import models
from django.contrib.auth.models import User

class Complaint(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('RESOLVED', 'Resolved'),
    )

    user = models.ForeignKey(User, related_name='complaints', on_delete=models.CASCADE)
    subject = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    admin_reply = models.TextField(blank=True, null=True)
    admin_reply_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.subject} - {self.user.username}"


class ComplaintImage(models.Model):
    """Attachment image for a complaint (up to 3 per complaint, enforced in the API)."""
    complaint = models.ForeignKey(Complaint, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='complaints/')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"Image for complaint #{self.complaint_id}"
