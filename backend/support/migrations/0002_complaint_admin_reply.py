from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('support', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='complaint',
            name='admin_reply',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='complaint',
            name='admin_reply_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
