"""Give every existing customer an address book entry from what they already had.

Without this, the first checkout after the upgrade would show an empty picker
to customers who have had an address on file for months. Their single
UserProfile address becomes their default "Home" entry, delivery pin included.

Profiles with no address at all are skipped — an empty entry would just be a
row the customer has to delete.
"""

from django.db import migrations


def forwards(apps, schema_editor):
    UserProfile = apps.get_model('accounts', 'UserProfile')
    CustomerAddress = apps.get_model('accounts', 'CustomerAddress')

    created = 0
    profiles = (
        UserProfile.objects
        .filter(user_type='customer')
        .select_related('user')
    )
    for profile in profiles:
        has_text = any([
            profile.house_number, profile.block, profile.area, profile.address,
        ])
        has_pin = (
            profile.customer_latitude is not None
            and profile.customer_longitude is not None
        )
        if not has_text and not has_pin:
            continue
        if CustomerAddress.objects.filter(user_id=profile.user_id).exists():
            continue

        # The historical model methods are not available here, so the address
        # line is taken as-is rather than recomposed — it is already correct,
        # and recomposing risks changing what a customer sees.
        CustomerAddress.objects.create(
            user_id=profile.user_id,
            label='home',
            house_number=profile.house_number or '',
            portion=profile.portion or '',
            block=profile.block or '',
            area=profile.area or '',
            address=profile.address or '',
            latitude=profile.customer_latitude,
            longitude=profile.customer_longitude,
            is_default=True,
        )
        created += 1

    if created:
        print(f'\n  Seeded {created} address book entry/entries from existing profiles.')


def backwards(apps, schema_editor):
    """The profile still holds the same address, so dropping these loses nothing."""
    apps.get_model('accounts', 'CustomerAddress').objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0017_customeraddress'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
