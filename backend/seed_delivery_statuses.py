import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from orders.models import DeliveryStatus

# Default delivery statuses with colors
default_statuses = [
    {
        'name': 'Pending',
        'color': '#007AFF',
        'background_color': '#f0f8ff',
        'border_color': '#007AFF',
        'order': 1
    },
    {
        'name': 'Delivered',
        'color': '#155724',
        'background_color': '#d4edda',
        'border_color': '#c3e6cb',
        'order': 2
    },
    {
        'name': 'Not Responding',
        'color': '#856404',
        'background_color': '#fff3cd',
        'border_color': '#ffeaa7',
        'order': 3
    },
    {
        'name': 'Not Needed',
        'color': '#721c24',
        'background_color': '#f8d7da',
        'border_color': '#f5c6cb',
        'order': 4
    },
]

def seed_delivery_statuses():
    print("Seeding delivery statuses...")
    
    for status_data in default_statuses:
        status, created = DeliveryStatus.objects.get_or_create(
            name=status_data['name'],
            defaults={
                'color': status_data['color'],
                'background_color': status_data['background_color'],
                'border_color': status_data['border_color'],
                'order': status_data['order'],
                'is_active': True
            }
        )
        
        if created:
            print(f"✅ Created: {status.name}")
        else:
            print(f"ℹ️  Already exists: {status.name}")
    
    print("\n✅ Delivery statuses seeded successfully!")
    print(f"Total active statuses: {DeliveryStatus.objects.filter(is_active=True).count()}")

if __name__ == '__main__':
    seed_delivery_statuses()
