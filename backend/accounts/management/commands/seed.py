"""Idempotent seeder for all default settings data.

Run on a fresh database (e.g. the MySQL DB on shared hosting) to populate every
admin-configurable setting in one shot:

    python manage.py seed

Safe to re-run: existing rows are left in place (singletons are updated only
when still at their defaults). Use --flush-translations to force-refresh the
translation strings to match the code.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import MobileProfileConfig, PROFILE_FIELD_DEFAULTS
from localization.models import (
    LanguageAccessSetting,
    Translation,
    TranslationCategory,
)
from localization.seed_data import TRANSLATIONS
from orders.models import DeliveryStatus
from plant.models import BottleType, CustomerType, PlantSettings
from products.models import Category


# ── Default data ─────────────────────────────────────────────────────────────

PRODUCT_CATEGORIES = [
    {'name': 'Electronics', 'icon': 'hardware-chip'},
    {'name': 'Fashion', 'icon': 'shirt'},
    {'name': 'Home', 'icon': 'home'},
    {'name': 'Beauty', 'icon': 'rose'},
    {'name': 'Sports', 'icon': 'football'},
]

DELIVERY_STATUSES = [
    {'name': 'Pending', 'color': '#007AFF', 'background_color': '#f0f8ff', 'border_color': '#007AFF', 'order': 1},
    {'name': 'Delivered', 'color': '#155724', 'background_color': '#d4edda', 'border_color': '#c3e6cb', 'order': 2},
    {'name': 'Not Responding', 'color': '#856404', 'background_color': '#fff3cd', 'border_color': '#ffeaa7', 'order': 3},
    {'name': 'Not Needed', 'color': '#721c24', 'background_color': '#f8d7da', 'border_color': '#f5c6cb', 'order': 4},
]

CUSTOMER_TYPES = [
    {'name': 'Residential', 'order': 1},
    {'name': 'Commercial', 'order': 2},
]

BOTTLE_TYPES = [
    {'name': 'Labelled', 'order': 1},
    {'name': 'Nestlé', 'order': 2},
    {'name': 'Sprinkle', 'order': 3},
]

# user_types allowed to switch the app language by default
DEFAULT_LANGUAGE_USER_TYPES = ['customer', 'delivery_boy']


class Command(BaseCommand):
    help = 'Populate all default settings data (idempotent). Safe to re-run.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush-translations',
            action='store_true',
            help='Overwrite existing translation strings to match the code.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        self.created = 0
        self.skipped = 0

        self.stdout.write(self.style.MIGRATE_HEADING('Seeding settings data...'))
        self._seed_product_categories()
        self._seed_delivery_statuses()
        self._seed_customer_types()
        self._seed_bottle_types()
        self._seed_plant_settings()
        self._seed_language_access()
        self._seed_profile_configs()
        self._seed_translations(flush=options['flush_translations'])

        self.stdout.write(self.style.SUCCESS(
            f'\nDone. {self.created} created, {self.skipped} already present.'
        ))

    # ── helpers ──────────────────────────────────────────────────────────────

    def _line(self, created, label):
        if created:
            self.created += 1
            self.stdout.write(self.style.SUCCESS(f'  + {label}'))
        else:
            self.skipped += 1
            self.stdout.write(f'  . {label} (exists)')

    def _seed_product_categories(self):
        self.stdout.write('Product categories:')
        for data in PRODUCT_CATEGORIES:
            _, created = Category.objects.get_or_create(
                name=data['name'], defaults={'icon': data['icon']},
            )
            self._line(created, data['name'])

    def _seed_delivery_statuses(self):
        self.stdout.write('Delivery statuses:')
        for data in DELIVERY_STATUSES:
            _, created = DeliveryStatus.objects.get_or_create(
                name=data['name'],
                defaults={
                    'color': data['color'],
                    'background_color': data['background_color'],
                    'border_color': data['border_color'],
                    'order': data['order'],
                    'is_active': True,
                },
            )
            self._line(created, data['name'])

    def _seed_customer_types(self):
        self.stdout.write('Customer types:')
        for data in CUSTOMER_TYPES:
            _, created = CustomerType.objects.get_or_create(
                name=data['name'], defaults={'order': data['order'], 'is_active': True},
            )
            self._line(created, data['name'])

    def _seed_bottle_types(self):
        self.stdout.write('Bottle types:')
        for data in BOTTLE_TYPES:
            _, created = BottleType.objects.get_or_create(
                name=data['name'], defaults={'order': data['order'], 'is_active': True},
            )
            self._line(created, data['name'])

    def _seed_plant_settings(self):
        self.stdout.write('Plant settings:')
        created = not PlantSettings.objects.filter(pk=1).exists()
        PlantSettings.load()  # ensures the singleton row exists
        self._line(created, 'standard unit price')

    def _seed_language_access(self):
        self.stdout.write('Language access:')
        created = not LanguageAccessSetting.objects.filter(pk=1).exists()
        setting = LanguageAccessSetting.load()
        if created and not setting.allowed_user_types:
            setting.allowed_user_types = DEFAULT_LANGUAGE_USER_TYPES
            setting.save()
        self._line(created, f'allowed = {setting.allowed_user_types}')

    def _seed_profile_configs(self):
        self.stdout.write('Mobile profile configs:')
        for user_type in PROFILE_FIELD_DEFAULTS:
            _, created = MobileProfileConfig.objects.get_or_create(
                user_type=user_type, defaults={'fields_config': {}},
            )
            self._line(created, user_type)

    def _seed_translations(self, flush=False):
        self.stdout.write('Translations:')
        total, new = 0, 0
        for category_name, items in TRANSLATIONS.items():
            category, _ = TranslationCategory.objects.get_or_create(name=category_name)
            for t in items:
                obj, created = Translation.objects.get_or_create(
                    slug=t['slug'],
                    defaults={
                        'category': category,
                        'text_en': t['text_en'],
                        'text_ur': t['text_ur'],
                    },
                )
                if created:
                    new += 1
                elif flush:
                    obj.category = category
                    obj.text_en = t['text_en']
                    obj.text_ur = t['text_ur']
                    obj.save()
                total += 1
        self.created += new
        self.skipped += total - new
        verb = 'refreshed' if flush else 'present'
        self.stdout.write(f'  {new} new, {total} total {verb} across '
                          f'{len(TRANSLATIONS)} categories')
