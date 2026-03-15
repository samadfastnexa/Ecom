from django.db import models

class TranslationCategory(models.Model):
    name = models.CharField(max_length=100, unique=True, help_text="Name of the page or section (e.g., 'Home Screen')")
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Translation Categories"
        ordering = ['name']

    def __str__(self):
        return self.name

class Translation(models.Model):
    category = models.ForeignKey(TranslationCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='translations', help_text="The page or section this translation belongs to")
    slug = models.SlugField(unique=True, help_text="Unique key for the translation (e.g., 'home_welcome_message')")
    text_en = models.TextField(verbose_name="English Text")
    text_ur = models.TextField(verbose_name="Urdu Text", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category', 'slug']

    def __str__(self):
        return f"{self.slug} ({self.category})" if self.category else self.slug
