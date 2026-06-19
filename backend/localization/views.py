from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

from .models import Translation, LanguageAccessSetting
from .serializers import TranslationSerializer, LanguageAccessSettingSerializer


class TranslationListView(generics.ListAPIView):
    queryset = Translation.objects.all()
    serializer_class = TranslationSerializer
    permission_classes = [AllowAny]


@api_view(['GET', 'PATCH'])
def language_access_view(request):
    """
    GET  — open to any authenticated user (mobile reads this on startup).
    PATCH — admin only, sets allowed_user_types list.
    """
    if request.method == 'PATCH' and not request.user.is_staff:
        return Response({'detail': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)

    obj = LanguageAccessSetting.load()
    if request.method == 'PATCH':
        serializer = LanguageAccessSettingSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    return Response(LanguageAccessSettingSerializer(obj).data)
