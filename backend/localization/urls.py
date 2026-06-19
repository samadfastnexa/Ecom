from django.urls import path
from .views import TranslationListView, language_access_view

urlpatterns = [
    path('translations/', TranslationListView.as_view(), name='translation-list'),
    path('language-access/', language_access_view, name='language-access'),
]
