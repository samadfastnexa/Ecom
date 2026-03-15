from rest_framework import generics
from .models import Translation
from .serializers import TranslationSerializer
from rest_framework.permissions import AllowAny

class TranslationListView(generics.ListAPIView):
    queryset = Translation.objects.all()
    serializer_class = TranslationSerializer
    permission_classes = [AllowAny]
