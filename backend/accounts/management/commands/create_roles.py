from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType


class Command(BaseCommand):
    help = 'Create predefined user roles (groups) with appropriate permissions'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Creating predefined roles...'))
        
        # Create roles
        self.create_customer_role()
        self.create_delivery_boy_role()
        self.create_admin_role()
        
        self.stdout.write(self.style.SUCCESS('\n✅ All roles created successfully!'))
        self.stdout.write(self.style.SUCCESS('\nYou can now assign these roles to users in the Django admin.'))

    def create_customer_role(self):
        """Create Customer role with basic permissions"""
        group, created = Group.objects.get_or_create(name='Customer')
        
        if created:
            self.stdout.write(self.style.SUCCESS('\n📦 Creating Customer role...'))
        else:
            self.stdout.write(self.style.WARNING('\n📦 Customer role already exists, updating permissions...'))
            group.permissions.clear()
        
        # Get content types
        from products.models import Product, Category
        from orders.models import Order, OrderItem
        from support.models import Complaint
        from localization.models import Translation
        
        product_ct = ContentType.objects.get_for_model(Product)
        category_ct = ContentType.objects.get_for_model(Category)
        order_ct = ContentType.objects.get_for_model(Order)
        orderitem_ct = ContentType.objects.get_for_model(OrderItem)
        complaint_ct = ContentType.objects.get_for_model(Complaint)
        translation_ct = ContentType.objects.get_for_model(Translation)
        
        # Customer permissions
        permissions = [
            # Products - View only
            Permission.objects.get(codename='view_product', content_type=product_ct),
            Permission.objects.get(codename='view_category', content_type=category_ct),
            
            # Orders - Create and view own orders
            Permission.objects.get(codename='add_order', content_type=order_ct),
            Permission.objects.get(codename='view_order', content_type=order_ct),
            Permission.objects.get(codename='add_orderitem', content_type=orderitem_ct),
            Permission.objects.get(codename='view_orderitem', content_type=orderitem_ct),
            
            # Support - Create and view own complaints
            Permission.objects.get(codename='add_complaint', content_type=complaint_ct),
            Permission.objects.get(codename='view_complaint', content_type=complaint_ct),
            
            # Translations - View only
            Permission.objects.get(codename='view_translation', content_type=translation_ct),
        ]
        
        group.permissions.set(permissions)
        self.stdout.write(self.style.SUCCESS(f'   ✓ Added {len(permissions)} permissions to Customer role'))

    def create_delivery_boy_role(self):
        """Create Delivery Boy role with delivery-specific permissions"""
        group, created = Group.objects.get_or_create(name='Delivery Boy')
        
        if created:
            self.stdout.write(self.style.SUCCESS('\n🚚 Creating Delivery Boy role...'))
        else:
            self.stdout.write(self.style.WARNING('\n🚚 Delivery Boy role already exists, updating permissions...'))
            group.permissions.clear()
        
        # Get content types
        from orders.models import Order, OrderItem
        from products.models import Product
        from localization.models import Translation
        
        order_ct = ContentType.objects.get_for_model(Order)
        orderitem_ct = ContentType.objects.get_for_model(OrderItem)
        product_ct = ContentType.objects.get_for_model(Product)
        translation_ct = ContentType.objects.get_for_model(Translation)
        
        # Delivery Boy permissions
        permissions = [
            # Orders - View and update assigned orders
            Permission.objects.get(codename='view_order', content_type=order_ct),
            Permission.objects.get(codename='change_order', content_type=order_ct),
            Permission.objects.get(codename='view_orderitem', content_type=orderitem_ct),
            
            # Products - View only (to see order details)
            Permission.objects.get(codename='view_product', content_type=product_ct),
            
            # Translations - View only
            Permission.objects.get(codename='view_translation', content_type=translation_ct),
        ]
        
        group.permissions.set(permissions)
        self.stdout.write(self.style.SUCCESS(f'   ✓ Added {len(permissions)} permissions to Delivery Boy role'))

    def create_admin_role(self):
        """Create Admin role with full permissions"""
        group, created = Group.objects.get_or_create(name='Admin')
        
        if created:
            self.stdout.write(self.style.SUCCESS('\n👑 Creating Admin role...'))
        else:
            self.stdout.write(self.style.WARNING('\n👑 Admin role already exists, updating permissions...'))
            group.permissions.clear()
        
        # Get content types for all models
        from products.models import Product, Category
        from orders.models import Order, OrderItem
        from support.models import Complaint
        from accounts.models import UserProfile
        from localization.models import Translation, TranslationCategory
        
        content_types = [
            ContentType.objects.get_for_model(Product),
            ContentType.objects.get_for_model(Category),
            ContentType.objects.get_for_model(Order),
            ContentType.objects.get_for_model(OrderItem),
            ContentType.objects.get_for_model(Complaint),
            ContentType.objects.get_for_model(UserProfile),
            ContentType.objects.get_for_model(Translation),
            ContentType.objects.get_for_model(TranslationCategory),
        ]
        
        # Admin gets ALL permissions for these models
        permissions = []
        for ct in content_types:
            permissions.extend(Permission.objects.filter(content_type=ct))
        
        group.permissions.set(permissions)
        self.stdout.write(self.style.SUCCESS(f'   ✓ Added {len(permissions)} permissions to Admin role'))
        self.stdout.write(self.style.SUCCESS('   ✓ Admin role has full access to all models'))

