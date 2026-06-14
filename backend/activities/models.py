from django.db import models
from django.contrib.auth.models import User


class ActivityLog(models.Model):
    CATEGORY_ORDER = 'order'
    CATEGORY_RIDER = 'rider'
    CATEGORY_CUSTOMER = 'customer'
    CATEGORY_USER = 'user'

    CATEGORIES = [
        (CATEGORY_ORDER, 'Order'),
        (CATEGORY_RIDER, 'Rider'),
        (CATEGORY_CUSTOMER, 'Customer'),
        (CATEGORY_USER, 'User'),
    ]

    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    actor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='activity_logs',
    )
    actor_name = models.CharField(max_length=150, blank=True)
    category = models.CharField(max_length=20, choices=CATEGORIES, db_index=True)
    action = models.CharField(max_length=100, db_index=True)
    target_type = models.CharField(max_length=50, blank=True)
    target_id = models.IntegerField(null=True, blank=True)
    target_label = models.CharField(max_length=250, blank=True)
    details = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['category', 'timestamp']),
            models.Index(fields=['target_type', 'target_id']),
        ]

    def __str__(self):
        return f'[{self.category}] {self.action} by {self.actor_name} at {self.timestamp:%Y-%m-%d %H:%M}'
