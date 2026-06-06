from rest_framework.permissions import BasePermission, DjangoModelPermissions


class PlantModelPermission(DjangoModelPermissions):
    """
    Granular model permissions for the records endpoint, but require the
    `view` permission for reads too. Staff/superusers always pass.
    """

    perms_map = {
        'GET': ['%(app_label)s.view_%(model_name)s'],
        'OPTIONS': [],
        'HEAD': [],
        'POST': ['%(app_label)s.add_%(model_name)s'],
        'PUT': ['%(app_label)s.change_%(model_name)s'],
        'PATCH': ['%(app_label)s.change_%(model_name)s'],
        'DELETE': ['%(app_label)s.delete_%(model_name)s'],
    }

    def has_permission(self, request, view):
        user = request.user
        if user and user.is_authenticated and (user.is_superuser or user.is_staff):
            return True
        return super().has_permission(request, view)


class CanAccessPlant(BasePermission):
    """Read access for staff/superusers or anyone with the view permission."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return (
            user.is_superuser
            or user.is_staff
            or user.has_perm('plant.view_deliveryrecord')
        )


class IsPlantAdmin(BasePermission):
    """Write access for staff/superusers (used for managing settings/types)."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                user.is_superuser
                or user.is_staff
                or user.has_perm('plant.change_customertype')
            )
        )
