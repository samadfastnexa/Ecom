"""Portion normalisation — the guard on the field's reportability."""

from django.test import TestCase

from .address import (
    PORTION_CHOICES,
    PORTION_LABELS,
    PORTION_VALUES,
    normalize_portion,
)


class NormalizePortionTests(TestCase):
    def test_canonical_values_pass_through(self):
        for value in PORTION_VALUES:
            with self.subTest(value=value):
                self.assertEqual(normalize_portion(value), value)

    def test_labels_map_back_to_their_key(self):
        for value, label in PORTION_CHOICES:
            with self.subTest(label=label):
                self.assertEqual(normalize_portion(label), value)

    def test_common_spellings(self):
        cases = {
            'Ground': 'ground',
            'ground floor': 'ground',
            'GF': 'ground',
            'g': 'ground',
            'Upper Portion': 'upper',
            'lower portion': 'lower',
            '1st Floor': 'first_floor',
            '1st': 'first_floor',
            'first': 'first_floor',
            '2nd floor': 'second_floor',
            'Basement': 'basement',
        }
        for raw, expected in cases.items():
            with self.subTest(raw=raw):
                self.assertEqual(normalize_portion(raw), expected)

    def test_punctuation_and_spacing_are_tolerated(self):
        self.assertEqual(normalize_portion('  1st.  Floor '), 'first_floor')
        self.assertEqual(normalize_portion('ground-floor'), 'ground')

    def test_blank_input(self):
        for value in ('', None, '   '):
            with self.subTest(value=value):
                self.assertEqual(normalize_portion(value), '')

    def test_unrecognised_is_dropped_rather_than_guessed(self):
        """A wrong floor sends a rider to the wrong door — blank is safer."""
        for value in ('near the tree', 'ask neighbour', 'xyz', '7th floor'):
            with self.subTest(value=value):
                self.assertEqual(normalize_portion(value), '')

    def test_every_choice_has_a_label(self):
        self.assertEqual(len(PORTION_LABELS), len(PORTION_CHOICES))
        self.assertTrue(all(PORTION_LABELS[v] for v in PORTION_VALUES))
