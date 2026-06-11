from django.db.models.signals import pre_save
from django.dispatch import receiver
from .models import Order
from core.notifications import send_push_notification


@receiver(pre_save, sender=Order)
def order_change_notifications(sender, instance, **kwargs):
    if not instance.pk:
        return  # handled in post_save for new orders

    try:
        old = Order.objects.get(pk=instance.pk)
    except Order.DoesNotExist:
        return

    # Notify customer when their order status changes
    if old.status != instance.status and instance.user_id:
        user = instance.user
        if hasattr(user, 'profile') and user.profile.expo_push_token:
            send_push_notification(
                user.profile.expo_push_token,
                f"Order #{instance.id} Update",
                f"Your order has been updated to: {instance.status}.",
                {"orderId": instance.id, "status": instance.status},
            )

    # Notify rider when they are newly assigned to an order
    old_rider_id = old.assigned_delivery_boy_id
    new_rider_id = instance.assigned_delivery_boy_id
    if new_rider_id and new_rider_id != old_rider_id:
        rider_profile = instance.assigned_delivery_boy
        if rider_profile and rider_profile.expo_push_token:
            customer_label = (
                instance.user.get_full_name() or instance.user.username
                if instance.user_id
                else instance.guest_name or "Guest"
            )
            send_push_notification(
                rider_profile.expo_push_token,
                "New Delivery Assigned",
                f"Order #{instance.id} for {customer_label} has been assigned to you.",
                {"orderId": instance.id, "type": "assignment"},
            )
