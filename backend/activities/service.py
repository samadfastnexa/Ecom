"""
Central logging service. Import and call log() from any Django view or signal.

Usage:
    from activities.service import log

    log(request.user, 'order', 'Order Created', target_type='order',
        target_id=order.id, target_label=f'Order #{order.id}',
        details={'customer': order.customer_name, 'total': str(order.total_price)})
"""

import logging

from .models import ActivityLog

logger = logging.getLogger(__name__)


def log(
    actor,
    category: str,
    action: str,
    *,
    target_type: str = '',
    target_id: int | None = None,
    target_label: str = '',
    details: dict | None = None,
) -> ActivityLog | None:
    try:
        actor_name = ''
        if actor:
            actor_name = actor.get_full_name() or actor.username
        return ActivityLog.objects.create(
            actor=actor,
            actor_name=actor_name,
            category=category,
            action=action,
            target_type=target_type,
            target_id=target_id,
            target_label=target_label,
            details=details or {},
        )
    except Exception:
        logger.exception('Failed to write activity log')
        return None
