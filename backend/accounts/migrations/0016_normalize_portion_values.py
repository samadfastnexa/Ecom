"""Map free-text portions written before the fixed list onto canonical keys.

Anything unrecognised is cleared rather than guessed: a wrong floor sends a
rider to the wrong door, and the field is optional, so blank is the safe
landing spot. The originals are printed before being changed so an operator can
see what was dropped.
"""

from django.db import migrations

from core.address import normalize_portion


def forwards(apps, schema_editor):
    UserProfile = apps.get_model('accounts', 'UserProfile')
    Order = apps.get_model('orders', 'Order')

    for model, label in ((UserProfile, 'profile'), (Order, 'order')):
        cleared = []
        for row in model.objects.exclude(portion__isnull=True).exclude(portion=''):
            canonical = normalize_portion(row.portion)
            if canonical == row.portion:
                continue
            if not canonical:
                cleared.append(f'{label} #{row.pk}: {row.portion!r}')
            model.objects.filter(pk=row.pk).update(portion=canonical)
        if cleared:
            print(f'\n  Cleared {len(cleared)} unrecognised {label} portion(s):')
            for line in cleared[:20]:
                print(f'    {line}')
            if len(cleared) > 20:
                print(f'    … and {len(cleared) - 20} more')


def backwards(apps, schema_editor):
    """Keys are already human-readable enough; nothing to undo."""


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0015_alter_userprofile_portion'),
        ('orders', '0012_alter_order_portion'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
