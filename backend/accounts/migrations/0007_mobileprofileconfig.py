from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_userprofile_created_by'),
    ]

    operations = [
        migrations.CreateModel(
            name='MobileProfileConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_type', models.CharField(max_length=20, unique=True)),
                ('fields_config', models.JSONField(default=dict)),
            ],
        ),
    ]
