import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from localization.models import Translation, TranslationCategory
from localization.seed_data import TRANSLATIONS

# Translations live in localization/seed_data.py (shared with the
# `python manage.py seed` command). This script is a thin standalone wrapper;
# prefer `python manage.py seed` for new setups.

for category_name, items in TRANSLATIONS.items():
    category, _ = TranslationCategory.objects.get_or_create(name=category_name)
    print(f"Processing Category: {category_name}")

    for t in items:
        obj, created = Translation.objects.get_or_create(
            slug=t['slug'],
            defaults={
                'category': category,
                'text_en': t['text_en'],
                'text_ur': t['text_ur'],
            },
        )

        # Keep existing records in sync with the code.
        obj.category = category
        obj.text_en = t['text_en']
        obj.text_ur = t['text_ur']
        obj.save()

        status = "Created" if created else "Updated"
        # print(f"  - {status}: {t['slug']}")

print("Seed completed successfully.")
