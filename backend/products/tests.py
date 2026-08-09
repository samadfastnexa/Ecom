"""Category CRUD and who is allowed to see which categories."""

from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status as http
from rest_framework.test import APIClient

from .models import Category, Product

CATEGORIES_URL = '/api/categories/'


class CategoryVisibilityTests(TestCase):
    """Customers only ever see active categories; staff manage the full list."""

    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            username='catadmin', password='AdminPass1!', is_staff=True,
        )
        self.shopper = User.objects.create_user(
            username='shopper', password='ShopPass1!',
        )
        self.live = Category.objects.create(name='Water Bottles')
        self.retired = Category.objects.create(name='Beauty', is_active=False)

    def _names(self, res):
        rows = res.data['results'] if isinstance(res.data, dict) else res.data
        return {row['name'] for row in rows}

    def test_anonymous_sees_only_active(self):
        res = self.client.get(CATEGORIES_URL)
        self.assertEqual(res.status_code, http.HTTP_200_OK)
        self.assertEqual(self._names(res), {'Water Bottles'})

    def test_signed_in_customer_sees_only_active(self):
        self.client.force_authenticate(self.shopper)
        self.assertEqual(self._names(self.client.get(CATEGORIES_URL)), {'Water Bottles'})

    def test_staff_sees_everything_by_default(self):
        """The manager screen must reach a hidden category to switch it back on."""
        self.client.force_authenticate(self.staff)
        self.assertEqual(
            self._names(self.client.get(CATEGORIES_URL)),
            {'Water Bottles', 'Beauty'},
        )

    def test_staff_can_ask_for_active_only(self):
        """What the product form uses, so a retired category is not offered."""
        self.client.force_authenticate(self.staff)
        res = self.client.get(CATEGORIES_URL, {'active': 'true'})
        self.assertEqual(self._names(res), {'Water Bottles'})

    def test_new_categories_default_to_active(self):
        self.assertTrue(Category.objects.create(name='Dispensers').is_active)


class CategoryCrudTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            username='crudadmin', password='AdminPass1!', is_staff=True,
        )
        self.client.force_authenticate(self.staff)

    def test_create(self):
        res = self.client.post(
            CATEGORIES_URL, {'name': 'Dispensers', 'icon': 'water'}, format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_201_CREATED, res.data)
        self.assertTrue(res.data['is_active'])
        self.assertEqual(res.data['slug'], 'dispensers')

    def test_rename(self):
        category = Category.objects.create(name='Botles')
        res = self.client.patch(
            f'{CATEGORIES_URL}{category.id}/', {'name': 'Bottles'}, format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_200_OK, res.data)
        category.refresh_from_db()
        self.assertEqual(category.name, 'Bottles')

    def test_toggle_active(self):
        category = Category.objects.create(name='Beauty')
        res = self.client.patch(
            f'{CATEGORIES_URL}{category.id}/', {'is_active': False}, format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_200_OK, res.data)
        category.refresh_from_db()
        self.assertFalse(category.is_active)

    def test_delete(self):
        category = Category.objects.create(name='Scrap')
        res = self.client.delete(f'{CATEGORIES_URL}{category.id}/')
        self.assertEqual(res.status_code, http.HTTP_204_NO_CONTENT)
        self.assertFalse(Category.objects.filter(pk=category.pk).exists())

    def test_deleting_a_category_keeps_its_products(self):
        """The FK is SET_NULL — losing a category must not lose the product."""
        category = Category.objects.create(name='Doomed')
        product = Product.objects.create(
            name='19L Bottle', price=Decimal('150.00'), category=category,
        )
        self.client.delete(f'{CATEGORIES_URL}{category.id}/')
        product.refresh_from_db()
        self.assertIsNone(product.category)

    def test_hiding_a_category_keeps_its_products_labelled(self):
        """Hiding is the non-destructive alternative to deleting."""
        category = Category.objects.create(name='Beauty')
        product = Product.objects.create(
            name='Face Wash', price=Decimal('99.00'), category=category,
        )
        self.client.patch(
            f'{CATEGORIES_URL}{category.id}/', {'is_active': False}, format='json',
        )
        product.refresh_from_db()
        self.assertEqual(product.category, category)

    def test_duplicate_name_is_rejected_case_insensitively(self):
        Category.objects.create(name='Bottles')
        res = self.client.post(CATEGORIES_URL, {'name': 'bottles'}, format='json')
        self.assertEqual(res.status_code, http.HTTP_400_BAD_REQUEST)
        self.assertIn('name', res.data)

    def test_blank_name_is_rejected(self):
        res = self.client.post(CATEGORIES_URL, {'name': '   '}, format='json')
        self.assertEqual(res.status_code, http.HTTP_400_BAD_REQUEST)

    def test_slug_is_not_client_settable(self):
        res = self.client.post(
            CATEGORIES_URL, {'name': 'Dispensers', 'slug': 'hacked'}, format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['slug'], 'dispensers')


class CategoryWritePermissionTests(TestCase):
    """Only staff may change the category list."""

    def setUp(self):
        self.client = APIClient()
        self.category = Category.objects.create(name='Bottles')

    def _assert_denied(self, res):
        self.assertIn(
            res.status_code,
            (http.HTTP_401_UNAUTHORIZED, http.HTTP_403_FORBIDDEN),
        )

    def test_anonymous_cannot_create(self):
        self._assert_denied(
            self.client.post(CATEGORIES_URL, {'name': 'Sneaky'}, format='json')
        )

    def test_customer_cannot_create(self):
        self.client.force_authenticate(
            User.objects.create_user(username='cust', password='CustPass1!')
        )
        self._assert_denied(
            self.client.post(CATEGORIES_URL, {'name': 'Sneaky'}, format='json')
        )

    def test_customer_cannot_hide_a_category(self):
        self.client.force_authenticate(
            User.objects.create_user(username='cust2', password='CustPass1!')
        )
        self._assert_denied(
            self.client.patch(
                f'{CATEGORIES_URL}{self.category.id}/',
                {'is_active': False}, format='json',
            )
        )
        self.category.refresh_from_db()
        self.assertTrue(self.category.is_active)

    def test_customer_cannot_delete(self):
        self.client.force_authenticate(
            User.objects.create_user(username='cust3', password='CustPass1!')
        )
        self._assert_denied(
            self.client.delete(f'{CATEGORIES_URL}{self.category.id}/')
        )
        self.assertTrue(Category.objects.filter(pk=self.category.pk).exists())
