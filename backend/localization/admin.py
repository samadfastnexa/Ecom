from django.contrib import admin
from django.http import HttpResponse
from django.shortcuts import render, redirect
from django.urls import path
from django.utils.html import format_html
from django.contrib import messages
from django import forms
import csv
import json
import io
from .models import Translation, TranslationCategory

class CsvImportForm(forms.Form):
    csv_file = forms.FileField()

@admin.register(TranslationCategory)
class TranslationCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'translation_count')
    search_fields = ('name',)

    def translation_count(self, obj):
        return obj.translations.count()
    translation_count.short_description = 'Translations'

@admin.register(Translation)
class TranslationAdmin(admin.ModelAdmin):
    list_display = ('slug', 'text_en', 'text_ur', 'category', 'updated_at')
    list_filter = ('category', 'updated_at')
    search_fields = ('slug', 'text_en', 'text_ur')
    list_editable = ('text_en', 'text_ur', 'category')
    list_per_page = 20
    
    fieldsets = (
        ('Categorization', {
            'fields': ('category', 'slug')
        }),
        ('Translations', {
            'fields': ('text_en', 'text_ur'),
            'description': 'Enter translations below. Urdu text will appear Right-to-Left.'
        }),
    )

    actions = ['export_as_csv', 'export_as_json']
    change_list_template = "admin/localization/translation/change_list.html"

    # Removed text_ur_display to allow list_editable

    class Media:
        # Inject CSS to make text_ur inputs RTL
        css = {
            'all': ('css/admin_rtl.css',)
        }
    
    # --- Export Actions ---

    def export_as_csv(self, request, queryset):
        meta = self.model._meta
        field_names = ['slug', 'category__name', 'text_en', 'text_ur']
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename={}.csv'.format(meta)
        response.write(u'\ufeff'.encode('utf8')) # BOM for Excel

        writer = csv.writer(response)
        writer.writerow(['Slug', 'Category', 'English', 'Urdu'])

        for obj in queryset:
            writer.writerow([obj.slug, obj.category.name if obj.category else '', obj.text_en, obj.text_ur])

        return response
    export_as_csv.short_description = "Export Selected to CSV"

    def export_as_json(self, request, queryset):
        data = []
        for obj in queryset:
            data.append({
                'slug': obj.slug,
                'category': obj.category.name if obj.category else None,
                'text_en': obj.text_en,
                'text_ur': obj.text_ur,
            })
        
        response = HttpResponse(json.dumps(data, ensure_ascii=False, indent=2), content_type='application/json')
        response['Content-Disposition'] = 'attachment; filename=translations.json'
        return response
    export_as_json.short_description = "Export Selected to JSON"

    # --- Import Functionality ---

    def get_urls(self):
        urls = super().get_urls()
        my_urls = [
            path('import-csv/', self.import_csv),
        ]
        return my_urls + urls

    def import_csv(self, request):
        if request.method == "POST":
            csv_file = request.FILES["csv_file"]
            
            if not csv_file.name.endswith('.csv'):
                messages.error(request, 'This is not a csv file')
                return redirect("..")
            
            file_data = csv_file.read().decode("utf-8")
            csv_data = csv.reader(io.StringIO(file_data), delimiter=',')
            
            # Skip header if present
            header = next(csv_data, None)
            # Basic validation check on header could go here

            count = 0
            for row in csv_data:
                if len(row) < 4: continue
                slug = row[0]
                category_name = row[1]
                text_en = row[2]
                text_ur = row[3]

                category = None
                if category_name:
                    category, _ = TranslationCategory.objects.get_or_create(name=category_name)

                Translation.objects.update_or_create(
                    slug=slug,
                    defaults={
                        'category': category,
                        'text_en': text_en,
                        'text_ur': text_ur
                    }
                )
                count += 1
            
            self.message_user(request, f"Successfully imported {count} translations")
            return redirect("..")
            
        form = CsvImportForm()
        payload = {"form": form}
        return render(
            request, "admin/csv_form.html", payload
        )
