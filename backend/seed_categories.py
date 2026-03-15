import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from products.models import Category, Product

categories = [
    {'name': 'Electronics', 'icon': 'hardware-chip'},
    {'name': 'Fashion', 'icon': 'shirt'},
    {'name': 'Home', 'icon': 'home'},
    {'name': 'Beauty', 'icon': 'rose'},
    {'name': 'Sports', 'icon': 'football'},
]

for cat_data in categories:
    category, created = Category.objects.get_or_create(
        name=cat_data['name'],
        defaults={'icon': cat_data['icon']}
    )
    if created:
        print(f"Created category: {category.name}")
    else:
        print(f"Category already exists: {category.name}")

# Assign random category to existing products if they don't have one
import random
all_cats = list(Category.objects.all())
products = Product.objects.filter(category__isnull=True)

for product in products:
    product.category = random.choice(all_cats)
    product.save()
    print(f"Assigned {product.category.name} to {product.name}")
