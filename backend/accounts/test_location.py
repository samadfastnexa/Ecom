"""Rider live-location tracking: reporting, admin reads, staleness and pruning."""

from datetime import timedelta
from decimal import Decimal
from io import StringIO

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import (
    LOCATION_STALE_AFTER_MINUTES, RiderLocation, RiderLocationPing, TrackingSettings,
)
from orders.models import Order

POST_URL = '/api/auth/rider/location/'
LIST_URL = '/api/auth/admin/riders/locations/'
CONFIG_URL = '/api/auth/tracking-config/'

# Somewhere in Lahore — the business only ever operates in one city.
LAT = '31.520370'
LNG = '74.358749'


class RiderLocationTestMixin:
    """Two riders, an admin and a customer — every access rule needs all four."""

    def setUp(self):
        # DRF throttle state lives in the cache and leaks between tests,
        # which would 429 later cases (anon rate is 10/minute).
        cache.clear()
        self.client = APIClient()

        self.rider = User.objects.create_user(
            username='rider1', password='RiderPass1!', first_name='Asif', last_name='Khan',
        )
        self.rider.profile.user_type = 'delivery_boy'
        self.rider.profile.is_rider = True
        self.rider.profile.phone_number = '03001234567'
        self.rider.profile.vehicle_number = 'LEA-4421'
        self.rider.profile.save()

        self.other_rider = User.objects.create_user(
            username='rider2', password='RiderPass2!',
        )
        self.other_rider.profile.user_type = 'delivery_boy'
        self.other_rider.profile.is_rider = True
        self.other_rider.profile.save()

        self.admin = User.objects.create_user(
            username='trackadmin', password='AdminPass1!', is_staff=True,
        )
        self.customer = User.objects.create_user(
            username='trackcust', password='CustPass1!',
        )

    def trail_url(self, user=None):
        return f'/api/auth/admin/riders/{(user or self.rider).id}/trail/'


class RiderLocationPostTests(RiderLocationTestMixin, TestCase):
    """POST /api/auth/rider/location/"""

    def test_rider_reports_own_position(self):
        self.client.force_authenticate(self.rider)
        res = self.client.post(
            POST_URL, {'latitude': LAT, 'longitude': LNG, 'battery_level': 71}, format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['accepted'], 1)

        current = RiderLocation.objects.get(rider=self.rider)
        self.assertEqual(current.latitude, Decimal(LAT))
        self.assertEqual(current.longitude, Decimal(LNG))
        self.assertEqual(current.battery_level, 71)
        self.assertEqual(RiderLocationPing.objects.filter(rider=self.rider).count(), 1)

    def test_rider_cannot_move_another_riders_pin(self):
        """The rider is taken from request.user; any id in the body is ignored."""
        self.client.force_authenticate(self.rider)
        res = self.client.post(POST_URL, {
            'rider': self.other_rider.id,
            'rider_id': self.other_rider.id,
            'user': self.other_rider.id,
            'user_id': self.other_rider.id,
            'latitude': LAT,
            'longitude': LNG,
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(RiderLocation.objects.filter(rider=self.rider).exists())
        self.assertFalse(RiderLocation.objects.filter(rider=self.other_rider).exists())
        self.assertFalse(RiderLocationPing.objects.filter(rider=self.other_rider).exists())

    def test_report_overwrites_the_riders_single_current_row(self):
        self.client.force_authenticate(self.rider)
        self.client.post(POST_URL, {'latitude': LAT, 'longitude': LNG}, format='json')
        self.client.post(
            POST_URL, {'latitude': '31.600000', 'longitude': '74.400000'}, format='json',
        )

        self.assertEqual(RiderLocation.objects.filter(rider=self.rider).count(), 1)
        self.assertEqual(
            RiderLocation.objects.get(rider=self.rider).latitude, Decimal('31.600000'),
        )
        # …while the trail keeps both.
        self.assertEqual(RiderLocationPing.objects.filter(rider=self.rider).count(), 2)

    def test_batch_out_of_order_pins_the_newest_fix(self):
        now = timezone.now()
        offsets = [10, 2, 7, 4]  # minutes ago, deliberately unsorted
        batch = [{
            'latitude': f'31.5{20 + minutes:04d}',
            'longitude': LNG,
            'recorded_at': (now - timedelta(minutes=minutes)).isoformat(),
        } for minutes in offsets]

        self.client.force_authenticate(self.rider)
        res = self.client.post(POST_URL, {'pings': batch}, format='json')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['accepted'], len(batch))
        self.assertEqual(RiderLocationPing.objects.filter(rider=self.rider).count(), len(batch))

        current = RiderLocation.objects.get(rider=self.rider)
        newest = now - timedelta(minutes=min(offsets))
        self.assertAlmostEqual(current.recorded_at, newest, delta=timedelta(seconds=1))
        self.assertEqual(current.latitude, Decimal('31.50022'))

    def test_bare_list_body_is_accepted(self):
        """An offline queue flushes as a plain JSON array."""
        self.client.force_authenticate(self.rider)
        res = self.client.post(POST_URL, [
            {'latitude': LAT, 'longitude': LNG},
            {'latitude': '31.530000', 'longitude': LNG},
        ], format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(RiderLocationPing.objects.filter(rider=self.rider).count(), 2)

    def test_a_late_older_batch_does_not_drag_the_pin_backwards(self):
        now = timezone.now()
        self.client.force_authenticate(self.rider)
        self.client.post(POST_URL, {
            'latitude': '31.600000', 'longitude': LNG, 'recorded_at': now.isoformat(),
        }, format='json')
        self.client.post(POST_URL, {
            'latitude': '31.100000', 'longitude': LNG,
            'recorded_at': (now - timedelta(hours=2)).isoformat(),
        }, format='json')

        current = RiderLocation.objects.get(rider=self.rider)
        self.assertEqual(current.latitude, Decimal('31.600000'))
        # The stale fix is still kept as history.
        self.assertEqual(RiderLocationPing.objects.filter(rider=self.rider).count(), 2)

    def test_out_of_range_coordinates_are_rejected(self):
        self.client.force_authenticate(self.rider)
        for lat, lng in (('91.0', LNG), ('-91.0', LNG), (LAT, '181.0'), (LAT, '-181.0')):
            with self.subTest(latitude=lat, longitude=lng):
                res = self.client.post(
                    POST_URL, {'latitude': lat, 'longitude': lng}, format='json',
                )
                self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(RiderLocation.objects.filter(rider=self.rider).exists())
        self.assertFalse(RiderLocationPing.objects.filter(rider=self.rider).exists())

    def test_one_bad_fix_rejects_the_whole_batch(self):
        self.client.force_authenticate(self.rider)
        res = self.client.post(POST_URL, {'pings': [
            {'latitude': LAT, 'longitude': LNG},
            {'latitude': '999.0', 'longitude': LNG},
        ]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(RiderLocationPing.objects.count(), 0)

    def test_high_precision_fix_is_rounded_not_rejected(self):
        """A GPS chip reporting 8 dp is normal; 400ing it would lose the fix."""
        self.client.force_authenticate(self.rider)
        res = self.client.post(
            POST_URL, {'latitude': '31.52037777', 'longitude': '74.35874999'}, format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        current = RiderLocation.objects.get(rider=self.rider)
        self.assertEqual(current.latitude, Decimal('31.520378'))
        self.assertEqual(current.longitude, Decimal('74.358750'))

    def test_unknown_sensor_readings_are_stored_as_null(self):
        """expo-location sends -1 for a reading it could not determine."""
        self.client.force_authenticate(self.rider)
        res = self.client.post(POST_URL, {
            'latitude': LAT, 'longitude': LNG,
            'accuracy_m': -1, 'speed_kmh': -1, 'heading': -1,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        current = RiderLocation.objects.get(rider=self.rider)
        self.assertIsNone(current.accuracy_m)
        self.assertIsNone(current.speed_kmh)
        self.assertIsNone(current.heading)

    def test_heading_is_normalised(self):
        self.client.force_authenticate(self.rider)
        self.client.post(
            POST_URL, {'latitude': LAT, 'longitude': LNG, 'heading': 450}, format='json',
        )
        self.assertEqual(RiderLocation.objects.get(rider=self.rider).heading, 90)

    def test_future_timestamp_is_rejected(self):
        self.client.force_authenticate(self.rider)
        res = self.client.post(POST_URL, {
            'latitude': LAT, 'longitude': LNG,
            'recorded_at': (timezone.now() + timedelta(hours=3)).isoformat(),
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_body_is_rejected(self):
        self.client.force_authenticate(self.rider)
        self.assertEqual(
            self.client.post(POST_URL, [], format='json').status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            self.client.post(POST_URL, {'pings': []}, format='json').status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_oversized_batch_is_rejected(self):
        self.client.force_authenticate(self.rider)
        batch = [{'latitude': LAT, 'longitude': LNG}] * 201
        res = self.client.post(POST_URL, {'pings': batch}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(RiderLocationPing.objects.count(), 0)

    def test_customer_cannot_report_a_location(self):
        self.client.force_authenticate(self.customer)
        res = self.client.post(POST_URL, {'latitude': LAT, 'longitude': LNG}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(RiderLocation.objects.count(), 0)

    def test_admin_cannot_report_a_location(self):
        """Staff are not riders; only a rider's own device writes a position."""
        self.client.force_authenticate(self.admin)
        res = self.client.post(POST_URL, {'latitude': LAT, 'longitude': LNG}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_report_a_location(self):
        res = self.client.post(POST_URL, {'latitude': LAT, 'longitude': LNG}, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(RiderLocation.objects.count(), 0)

    def test_reporting_writes_no_activity_log(self):
        """One row per ping would bury every real business event."""
        from activities.models import ActivityLog

        self.client.force_authenticate(self.rider)
        self.client.post(POST_URL, {'latitude': LAT, 'longitude': LNG}, format='json')
        self.assertEqual(ActivityLog.objects.count(), 0)


class AdminRiderLocationListTests(RiderLocationTestMixin, TestCase):
    """GET /api/auth/admin/riders/locations/"""

    def setUp(self):
        super().setUp()
        self.current = RiderLocation.objects.create(
            rider=self.rider, latitude=Decimal(LAT), longitude=Decimal(LNG),
            speed_kmh=18.5, battery_level=64, is_moving=True,
            recorded_at=timezone.now() - timedelta(minutes=2),
        )

    def test_admin_sees_riders_with_a_known_position(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(LIST_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 1)

        row = res.data['results'][0]
        self.assertEqual(row['rider_id'], self.rider.id)
        self.assertEqual(row['profile_id'], self.rider.profile.id)
        self.assertEqual(row['name'], 'Asif Khan')
        self.assertEqual(row['phone'], '03001234567')
        self.assertEqual(row['vehicle_number'], 'LEA-4421')
        self.assertFalse(row['is_stale'])
        self.assertLess(row['minutes_ago'], LOCATION_STALE_AFTER_MINUTES)
        self.assertEqual(row['active_orders'], 0)

    def test_coordinates_are_json_numbers(self):
        """A Google Maps LatLngLiteral needs numbers; a string is a pin that never draws."""
        self.client.force_authenticate(self.admin)
        row = self.client.get(LIST_URL).json()['results'][0]
        self.assertIsInstance(row['latitude'], float)
        self.assertIsInstance(row['longitude'], float)
        self.assertAlmostEqual(row['latitude'], 31.520370, places=6)

    def test_riders_without_a_position_are_omitted(self):
        self.client.force_authenticate(self.admin)
        usernames = [r['username'] for r in self.client.get(LIST_URL).data['results']]
        self.assertNotIn('rider2', usernames)

    def test_active_order_count_excludes_finished_orders(self):
        for order_status in ('Pending', 'Processing', 'Delivered', 'Cancelled'):
            Order.objects.create(
                user=self.customer, total_price=100, status=order_status,
                shipping_address='H-1', assigned_delivery_boy=self.rider.profile,
            )
        self.client.force_authenticate(self.admin)
        row = self.client.get(LIST_URL).data['results'][0]
        self.assertEqual(row['active_orders'], 2)

    def test_stale_flag_flips_around_the_threshold(self):
        self.client.force_authenticate(self.admin)

        fresh = timezone.now() - timedelta(minutes=LOCATION_STALE_AFTER_MINUTES - 1)
        RiderLocation.objects.filter(pk=self.current.pk).update(recorded_at=fresh)
        self.assertFalse(self.client.get(LIST_URL).data['results'][0]['is_stale'])

        stale = timezone.now() - timedelta(minutes=LOCATION_STALE_AFTER_MINUTES + 1)
        RiderLocation.objects.filter(pk=self.current.pk).update(recorded_at=stale)
        self.assertTrue(self.client.get(LIST_URL).data['results'][0]['is_stale'])

    def test_pagination_uses_the_shared_shape(self):
        RiderLocation.objects.create(
            rider=self.other_rider, latitude=Decimal('31.4'), longitude=Decimal('74.3'),
            recorded_at=timezone.now(),
        )
        self.client.force_authenticate(self.admin)
        res = self.client.get(LIST_URL, {'limit': 1, 'offset': 1})
        self.assertEqual(res.data['count'], 2)  # unsliced total
        self.assertEqual(len(res.data['results']), 1)
        self.assertEqual(res.data['limit'], 1)
        self.assertEqual(res.data['offset'], 1)

    def test_garbage_pagination_falls_back_to_defaults(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(LIST_URL, {'limit': 'lots', 'offset': 'later'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['limit'], 100)
        self.assertEqual(res.data['offset'], 0)

    def test_customer_cannot_see_rider_locations(self):
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get(LIST_URL).status_code, status.HTTP_403_FORBIDDEN)

    def test_rider_cannot_see_the_fleet(self):
        """A rider reports their own position but is not an admin."""
        self.client.force_authenticate(self.rider)
        self.assertEqual(self.client.get(LIST_URL).status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_see_rider_locations(self):
        self.assertEqual(self.client.get(LIST_URL).status_code, status.HTTP_401_UNAUTHORIZED)


class AdminRiderTrailTests(RiderLocationTestMixin, TestCase):
    """GET /api/auth/admin/riders/<user_id>/trail/"""

    def setUp(self):
        super().setUp()
        self.now = timezone.now()
        self.today_count = 5
        for minutes in range(self.today_count):
            RiderLocationPing.objects.create(
                rider=self.rider, latitude=Decimal(LAT), longitude=Decimal(LNG),
                recorded_at=self.now - timedelta(minutes=minutes),
            )
        self.old = RiderLocationPing.objects.create(
            rider=self.rider, latitude=Decimal('31.4'), longitude=Decimal('74.3'),
            recorded_at=self.now - timedelta(days=3),
        )

    def test_trail_defaults_to_today(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.trail_url())
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], self.today_count)
        self.assertNotIn(self.old.id, [row['id'] for row in res.data['results']])

    def test_trail_is_chronological(self):
        """Results feed a polyline, so they must already be in travel order."""
        self.client.force_authenticate(self.admin)
        stamps = [row['recorded_at'] for row in self.client.get(self.trail_url()).data['results']]
        self.assertEqual(stamps, sorted(stamps))

    def test_date_filter_selects_a_local_calendar_day(self):
        self.client.force_authenticate(self.admin)
        day = timezone.localtime(self.old.recorded_at).date().isoformat()
        res = self.client.get(self.trail_url(), {'date': day})
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['id'], self.old.id)

    def test_since_filter(self):
        self.client.force_authenticate(self.admin)
        since = (self.now - timedelta(minutes=2)).isoformat()
        res = self.client.get(self.trail_url(), {'since': since})
        self.assertEqual(res.data['count'], 3)

    def test_result_count_is_capped(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.trail_url(), {'limit': 99999})
        self.assertEqual(res.data['limit'], 2000)

    def test_bad_date_is_rejected(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.trail_url(), {'date': 'yesterday'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bad_since_is_rejected(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(self.trail_url(), {'since': 'a while back'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_rider_is_404(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(
            self.client.get('/api/auth/admin/riders/999999/trail/').status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_customer_cannot_read_a_trail(self):
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get(self.trail_url()).status_code, status.HTTP_403_FORBIDDEN)

    def test_rider_cannot_read_a_trail(self):
        self.client.force_authenticate(self.rider)
        self.assertEqual(self.client.get(self.trail_url()).status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_read_a_trail(self):
        self.assertEqual(self.client.get(self.trail_url()).status_code, status.HTTP_401_UNAUTHORIZED)


class TrackingConfigTests(RiderLocationTestMixin, TestCase):
    """GET /api/auth/tracking-config/"""

    def test_default_mode_is_always(self):
        """The business chose 24/7 tracking; the app must default to it."""
        self.client.force_authenticate(self.rider)
        res = self.client.get(CONFIG_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['tracking_enabled'])
        self.assertEqual(res.data['tracking_mode'], 'always')
        self.assertEqual(res.data['ping_interval_seconds'], 60)
        self.assertEqual(res.data['ping_distance_meters'], 50)
        self.assertEqual(res.data['trail_retention_days'], 7)
        self.assertEqual(res.data['stale_after_minutes'], LOCATION_STALE_AFTER_MINUTES)

    def test_config_is_a_singleton(self):
        TrackingSettings.load()
        TrackingSettings.load()
        self.assertEqual(TrackingSettings.objects.count(), 1)

    def test_admin_change_reaches_the_app_without_a_rebuild(self):
        cfg = TrackingSettings.load()
        cfg.tracking_mode = 'foreground'
        cfg.ping_interval_seconds = 300
        cfg.save()

        self.client.force_authenticate(self.rider)
        res = self.client.get(CONFIG_URL)
        self.assertEqual(res.data['tracking_mode'], 'foreground')
        self.assertEqual(res.data['ping_interval_seconds'], 300)

    def test_any_authenticated_user_may_read_the_config(self):
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get(CONFIG_URL).status_code, status.HTTP_200_OK)

    def test_anonymous_cannot_read_the_config(self):
        self.assertEqual(self.client.get(CONFIG_URL).status_code, status.HTTP_401_UNAUTHORIZED)


class LocationWiringTests(RiderLocationTestMixin, TestCase):
    """The two global settings a high-frequency endpoint has to opt out of."""

    def test_location_posts_get_their_own_throttle_budget(self):
        """
        The shared 'user' rate is 100/minute for ALL of a rider's traffic, which
        24/7 pinging would exhaust. Setting throttle_classes replaces it.
        """
        from accounts.views import RiderLocationThrottle, RiderLocationView

        self.assertEqual(RiderLocationView.throttle_classes, [RiderLocationThrottle])
        rate, seconds = RiderLocationThrottle().parse_rate(
            RiderLocationThrottle().get_rate()
        )
        self.assertGreaterEqual(rate / seconds, 1 / 60)  # a 60s pinger never 429s
        self.assertEqual((rate, seconds), (240, 60))

    def test_location_posts_are_not_request_logged(self):
        """A boxed 7-line log per ping would bury every other request."""
        self.client.force_authenticate(self.rider)
        with self.assertNoLogs('api', level='INFO'):
            res = self.client.post(
                POST_URL, {'latitude': LAT, 'longitude': LNG}, format='json',
            )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_other_endpoints_are_still_request_logged(self):
        self.client.force_authenticate(self.rider)
        with self.assertLogs('api', level='INFO'):
            self.client.get(CONFIG_URL)


class PruneRiderPingsTests(RiderLocationTestMixin, TestCase):
    """manage.py prune_rider_pings"""

    def setUp(self):
        super().setUp()
        now = timezone.now()
        self.retention = TrackingSettings.load().trail_retention_days
        self.keep = [
            RiderLocationPing.objects.create(
                rider=self.rider, latitude=Decimal(LAT), longitude=Decimal(LNG),
                recorded_at=now - timedelta(days=days),
            )
            for days in (0, 1, self.retention - 1)
        ]
        self.drop = [
            RiderLocationPing.objects.create(
                rider=self.rider, latitude=Decimal(LAT), longitude=Decimal(LNG),
                recorded_at=now - timedelta(days=days),
            )
            for days in (self.retention + 1, self.retention + 30)
        ]

    def test_prune_deletes_only_rows_past_retention(self):
        call_command('prune_rider_pings', stdout=StringIO())
        surviving = set(RiderLocationPing.objects.values_list('id', flat=True))
        self.assertEqual(surviving, {ping.id for ping in self.keep})

    def test_days_override(self):
        call_command('prune_rider_pings', days=1, stdout=StringIO())
        # Only the fix from "now" is inside a one-day window.
        self.assertEqual(RiderLocationPing.objects.count(), 1)

    def test_dry_run_deletes_nothing(self):
        before = RiderLocationPing.objects.count()
        out = StringIO()
        call_command('prune_rider_pings', dry_run=True, stdout=out)
        self.assertEqual(RiderLocationPing.objects.count(), before)
        self.assertIn('Would delete', out.getvalue())

    def test_current_position_survives_pruning(self):
        """Pruning trims history; it must never blank the live map."""
        RiderLocation.objects.create(
            rider=self.rider, latitude=Decimal(LAT), longitude=Decimal(LNG),
            recorded_at=timezone.now() - timedelta(days=90),
        )
        call_command('prune_rider_pings', stdout=StringIO())
        self.assertTrue(RiderLocation.objects.filter(rider=self.rider).exists())
