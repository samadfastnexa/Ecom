from django.core.management.base import BaseCommand
from products.models import Product

class Command(BaseCommand):
    help = 'Seeds the database with initial products'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')
        
        products = [
            {
                'name': 'Wireless Headphones',
                'description': 'High-quality noise cancelling headphones with 20h battery life.',
                'price': 199.99,
                'is_active': True,
                # Using placeholder images that are accessible
                'image': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60'
            },
            {
                'name': 'Smart Watch Series 5',
                'description': 'Track your fitness, heart rate, and notifications on the go.',
                'price': 299.50,
                'is_active': True,
                'image': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60'
            },
            {
                'name': 'Ergonomic Office Chair',
                'description': 'Comfortable mesh chair with lumbar support for long working hours.',
                'price': 149.00,
                'is_active': True,
                'image': 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=500&auto=format&fit=crop&q=60'
            },
            {
                'name': 'Mechanical Keyboard',
                'description': 'RGB backlit mechanical keyboard with blue switches.',
                'price': 89.99,
                'is_active': True,
                'image': 'https://images.unsplash.com/photo-1587829741301-dc798b91a05c?w=500&auto=format&fit=crop&q=60'
            },
            {
                'name': '4K Monitor 27"',
                'description': 'Ultra HD display with 144Hz refresh rate for gaming and work.',
                'price': 349.00,
                'is_active': True,
                'image': 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&auto=format&fit=crop&q=60'
            },
             {
                'name': 'Laptop Stand',
                'description': 'Aluminum alloy adjustable laptop stand for better ergonomics.',
                'price': 29.99,
                'is_active': True,
                'image': 'https://images.unsplash.com/photo-1616400619175-5beda3a17896?w=500&auto=format&fit=crop&q=60'
            },
        ]

        for prod_data in products:
            # We are not downloading images to local media for simplicity in this seed script,
            # but ideally you would download them. 
            # For now, we will just create the product entries.
            # Note: The 'image' field in Django ImageField expects a file, 
            # but for this quick seed we might need to handle it differently 
            # or just set a placeholder if we want to use external URLs.
            # Since our model uses ImageField, it expects a local file path relative to MEDIA_ROOT.
            # However, to make this work seamlessly with external URLs for the demo,
            # we might need to adjust the frontend to handle both.
            # BUT, let's do it properly: let's save these URLs as text or download them.
            
            # For this specific "add products" request, the user likely wants to see them in the app.
            # The app currently renders `{{ uri: product.image }}`.
            # If `product.image` is a local path (from ImageField), Django serializer returns full URL.
            # If we want to use external URLs without downloading, we'd need a URLField or char field.
            
            # DECISION: To make it easy and robust, I will create the products without local images first,
            # but since the frontend expects images, I will modify the seed to NOT use the ImageField for external URLs
            # directly unless we download them.
            # BETTER APPROACH: I will download these images to a temporary file and save them to the ImageField.
            
            pass 

        # Re-writing the loop to actually download and save images
        import requests
        from django.core.files.base import ContentFile

        for prod_data in products:
            if not Product.objects.filter(name=prod_data['name']).exists():
                self.stdout.write(f"Creating {prod_data['name']}...")
                
                image_url = prod_data.pop('image')
                product = Product(**prod_data)
                
                try:
                    response = requests.get(image_url)
                    if response.status_code == 200:
                        file_name = f"{prod_data['name'].replace(' ', '_').lower()}.jpg"
                        product.image.save(file_name, ContentFile(response.content), save=True)
                    else:
                        self.stdout.write(self.style.WARNING(f"Failed to download image for {prod_data['name']}"))
                        product.save()
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error saving image: {e}"))
                    product.save()
            else:
                self.stdout.write(f"Product {prod_data['name']} already exists.")

        self.stdout.write(self.style.SUCCESS('Successfully seeded products!'))
