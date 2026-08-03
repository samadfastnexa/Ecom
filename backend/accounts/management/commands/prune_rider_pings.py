"""
Delete rider breadcrumb pings past the configured retention window.

    manage.py prune_rider_pings                 # uses TrackingSettings.trail_retention_days
    manage.py prune_rider_pings --days 30       # override the window
    manage.py prune_rider_pings --dry-run       # count only, delete nothing

Belongs on a daily cron. The trail grows by roughly 1,440 rows per rider per
day at the 60-second default interval, so nothing else ever removes it.
"""

from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from accounts.models import RiderLocationPing, TrackingSettings

# Deleted in slices rather than one statement: a single DELETE over months of
# pings holds a very large transaction open on a shared MySQL host.
DELETE_BATCH = 5000


class Command(BaseCommand):
    help = 'Prune rider location pings older than the trail retention window.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days', type=int,
            help='Retention window in days. Defaults to TrackingSettings.trail_retention_days.',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Report what would be deleted without deleting anything.',
        )

    def handle(self, *args, **options):
        days = options['days']
        if days is None:
            days = TrackingSettings.load().trail_retention_days
        if days < 1:
            raise CommandError('Retention must be at least 1 day.')

        cutoff = timezone.now() - timedelta(days=days)
        stale = RiderLocationPing.objects.filter(recorded_at__lt=cutoff)
        total = stale.count()

        if not total:
            self.stdout.write(self.style.SUCCESS(
                f'Nothing older than {cutoff:%Y-%m-%d %H:%M} ({days} day(s)).'
            ))
            return

        if options['dry_run']:
            self.stdout.write(self.style.WARNING(
                f'Would delete {total} ping(s) recorded before {cutoff:%Y-%m-%d %H:%M}.'
            ))
            self.stdout.write('Dry run — nothing written.')
            return

        deleted = 0
        while True:
            ids = list(stale.values_list('id', flat=True)[:DELETE_BATCH])
            if not ids:
                break
            deleted += RiderLocationPing.objects.filter(id__in=ids).delete()[0]

        self.stdout.write(self.style.SUCCESS(
            f'Deleted {deleted} ping(s) recorded before {cutoff:%Y-%m-%d %H:%M} '
            f'({days} day(s) retained).'
        ))
