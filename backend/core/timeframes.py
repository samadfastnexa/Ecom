"""Local-date filtering that does not depend on MySQL's timezone tables.

Django compiles a `__date` lookup on an aware column into
`DATE(CONVERT_TZ(col, 'UTC', 'Asia/Karachi'))`. On a MySQL server whose
timezone tables were never loaded with `mysql_tzinfo_to_sql`, CONVERT_TZ with a
named zone returns NULL, so every such filter silently matches nothing — no
error, just empty results. Comparing against half-open datetime bounds gives
the same answer on any server and lets the column's index be used instead of
wrapping it in a function.
"""

from datetime import datetime, time, timedelta

from django.utils import timezone


def local_day_start(day):
    """Midnight on `day` in the project timezone, as an aware datetime."""
    return timezone.make_aware(
        datetime.combine(day, time.min), timezone.get_current_timezone(),
    )


def scope_to_days(qs, field, date_from=None, date_to=None):
    """Filter `qs` to an inclusive local-date range. Either bound may be None."""
    if date_from:
        qs = qs.filter(**{f'{field}__gte': local_day_start(date_from)})
    if date_to:
        qs = qs.filter(
            **{f'{field}__lt': local_day_start(date_to + timedelta(days=1))}
        )
    return qs


def on_local_day(qs, field, day=None):
    """Filter `qs` to a single local date, defaulting to today."""
    day = day or timezone.localdate()
    return scope_to_days(qs, field, day, day)
