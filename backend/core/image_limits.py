"""Shared limits/validation for multi-image uploads (products, complaints)."""

from rest_framework import serializers

# Up to 3 images per item, each at most 5 MB.
MAX_IMAGES = 3
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB in bytes


def validate_image_list(files):
    """Validate a list of uploaded image files against the count/size limits."""
    if len(files) > MAX_IMAGES:
        raise serializers.ValidationError(
            f"You can upload at most {MAX_IMAGES} images."
        )
    for f in files:
        if f.size > MAX_IMAGE_SIZE:
            raise serializers.ValidationError(
                "Each image must be 5 MB or smaller."
            )
    return files
