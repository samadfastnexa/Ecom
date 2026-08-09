# Records that predate discounts never had one, so their gross IS their net.

from django.db import migrations
from django.db.models import F


def backfill(apps, schema_editor):
    DeliveryRecord = apps.get_model('plant', 'DeliveryRecord')
    DeliveryRecord.objects.filter(gross_amount=0).update(gross_amount=F('amount'))


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('plant', '0008_deliveryrecord_discount_amount_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill, noop),
    ]
