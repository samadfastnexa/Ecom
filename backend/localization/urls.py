from django.urls import path
from .views import TranslationListView

urlpatterns = [
    path('translations/', TranslationListView.as_view(), name='translation-list'),
]
