"""Idempotent seeder for default user accounts and their roles.

    python manage.py seed_users

Safe to re-run: existing users are updated (password + role reset to match),
missing users are created. The UserProfile is auto-created by a post_save
signal; we set its user_type afterwards to assign the role.
"""

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction


# username, password, user_type, is_staff, is_superuser
USERS = [
    ('admin',        'admin123',     'admin',        True,  True),
    ('deliveryboy1', 'Rider@123',    'delivery_boy', False, False),
    ('hassaan',      'Rider@123',    'delivery_boy', False, False),
    ('customer1',    'Customer@123', 'customer',     False, False),
]


class Command(BaseCommand):
    help = 'Create/refresh default user accounts with their roles (idempotent).'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('Seeding users...'))
        for username, password, user_type, is_staff, is_superuser in USERS:
            user, created = User.objects.get_or_create(username=username)
            user.set_password(password)
            user.is_staff = is_staff
            user.is_superuser = is_superuser
            user.save()

            # profile is auto-created by the post_save signal on User
            profile = user.profile
            profile.user_type = user_type
            profile.save()

            verb = self.style.SUCCESS('+ created') if created else '. updated'
            self.stdout.write(f'  {verb}  {username:<14} role={user_type}')

        self.stdout.write(self.style.SUCCESS(f'\nDone. {len(USERS)} users seeded.'))
