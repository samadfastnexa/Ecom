from django.db.models.signals import pre_save
from django.dispatch import receiver
from .models import Order
from core.notifications import send_push_notification

@receiver(pre_save, sender=Order)
def order_status_change_notification(sender, instance, **kwargs):
    if not instance.pk:
        return  # New order

    try:
        old_order = Order.objects.get(pk=instance.pk)
    except Order.DoesNotExist:
        return

    if old_order.status != instance.status:
        # Status changed
        user = instance.user
        if hasattr(user, 'profile') and user.profile.expo_push_token:
            token = user.profile.expo_push_token
            title = f"Order #{instance.id} Update"
            body = f"Your order status has been updated to {instance.status}."
            data = {"orderId": instance.id, "status": instance.status}
            
            # Send notification (this is synchronous, ideally should be async/celery)
            print(f"Sending notification to {user.username} for order {instance.id}")
            send_push_notification(token, title, body, data)
