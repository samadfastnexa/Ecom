from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('localization', '0002_translationcategory_alter_translation_options_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='LanguageAccessSetting',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('allowed_user_types', models.JSONField(
                    default=list,
                    help_text='List of user_type values that can toggle language (e.g. ["customer", "delivery_boy"]). Empty = no one.',
                )),
            ],
            options={
                'verbose_name': 'Language Access Setting',
            },
        ),
    ]
