from rest_framework import serializers
from core.image_limits import validate_image_list
from .models import Product, Category, ProductImage

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image']


class ProductSerializer(serializers.ModelSerializer):
    category_details = CategorySerializer(source='category', read_only=True)
    # Gallery images (read). `image` (legacy single field) is kept in sync with
    # the first gallery image for backward compatibility with older clients.
    images = ProductImageSerializer(many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Product
        fields = '__all__'
        extra_kwargs = {
            'category': {'write_only': True}
        }

    def validate_uploaded_images(self, files):
        return validate_image_list(files)

    def create(self, validated_data):
        uploaded = validated_data.pop('uploaded_images', None)
        product = super().create(validated_data)
        if uploaded:
            self._replace_images(product, uploaded)
        return product

    def update(self, instance, validated_data):
        uploaded = validated_data.pop('uploaded_images', None)
        product = super().update(instance, validated_data)
        if uploaded is not None:
            product.images.all().delete()
            self._replace_images(product, uploaded)
        return product

    def _replace_images(self, product, files):
        created = [ProductImage.objects.create(product=product, image=f) for f in files]
        if created:
            # Keep the legacy single image pointing at the first gallery image.
            product.image.name = created[0].image.name
            product.save(update_fields=['image'])
