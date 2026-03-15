import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from accounts.models import UserProfile

# Delivery user credentials
username = 'delivery1'
email = 'delivery1@gmail.com'
password = '123456'
first_name = 'Delivery'
last_name = 'Boy'

if not User.objects.filter(username=username).exists():
    print(f"Creating delivery user {username}...")
    user = User.objects.create_user(
        username=username, 
        email=email, 
        password=password,
        first_name=first_name,
        last_name=last_name
    )
    
    # Update the user profile to set user_type as delivery_boy
    profile = user.profile
    profile.user_type = 'delivery_boy'
    profile.phone_number = '+1234567890'
    profile.vehicle_type = 'Motorcycle'
    profile.vehicle_number = 'DEL-001'
    profile.is_available = True
    profile.save()
    
    print(f"Delivery user created successfully.")
    print(f"Username: {username}")
    print(f"Password: {password}")
    print(f"User Type: {profile.user_type}")
else:
    print(f"Delivery user {username} already exists.")
    # Ensure the profile has the correct user_type
    user = User.objects.get(username=username)
    profile = user.profile
    if profile.user_type != 'delivery_boy':
        profile.user_type = 'delivery_boy'
        profile.save()
        print(f"Updated user_type to delivery_boy for existing user.")
    else:
        print(f"User type is already set to: {profile.user_type}")
