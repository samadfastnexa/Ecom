"""Canonical values for the structured delivery address.

`portion` used to be free text, which meant the same floor arrived as "Ground",
"ground floor", "GF" and "g" — impossible to group by later. Fixing the list
here makes the field reportable: "how many deliveries go to upper portions"
becomes a query rather than a guess.

Kept deliberately short and matched to how houses are actually split locally.
Adding a value is safe; renaming or removing one strands the rows already
stored under the old value, so migrate those first.
"""

PORTION_GROUND = 'ground'
PORTION_UPPER = 'upper'
PORTION_LOWER = 'lower'
PORTION_FIRST = 'first_floor'
PORTION_SECOND = 'second_floor'
PORTION_BASEMENT = 'basement'

PORTION_CHOICES = [
    (PORTION_GROUND, 'Ground'),
    (PORTION_UPPER, 'Upper'),
    (PORTION_LOWER, 'Lower'),
    (PORTION_FIRST, '1st Floor'),
    (PORTION_SECOND, '2nd Floor'),
    (PORTION_BASEMENT, 'Basement'),
]

PORTION_VALUES = [value for value, _label in PORTION_CHOICES]
PORTION_LABELS = dict(PORTION_CHOICES)

# Free-text portions written before the list existed, mapped onto it so old
# records still group correctly. Compared lower-cased with punctuation stripped.
LEGACY_PORTION_ALIASES = {
    'ground': PORTION_GROUND,
    'ground floor': PORTION_GROUND,
    'gf': PORTION_GROUND,
    'g': PORTION_GROUND,
    'upper': PORTION_UPPER,
    'upper portion': PORTION_UPPER,
    'up': PORTION_UPPER,
    'lower': PORTION_LOWER,
    'lower portion': PORTION_LOWER,
    'first': PORTION_FIRST,
    'first floor': PORTION_FIRST,
    '1st': PORTION_FIRST,
    '1st floor': PORTION_FIRST,
    '1': PORTION_FIRST,
    'second': PORTION_SECOND,
    'second floor': PORTION_SECOND,
    '2nd': PORTION_SECOND,
    '2nd floor': PORTION_SECOND,
    '2': PORTION_SECOND,
    'basement': PORTION_BASEMENT,
    'bsmt': PORTION_BASEMENT,
}


def normalize_portion(value):
    """Best-effort map of any portion string onto a canonical value.

    Returns '' for anything blank or unrecognised — an unknown portion is
    dropped rather than guessed, since a wrong floor sends a rider to the wrong
    door. Already-canonical values pass straight through.
    """
    if not value:
        return ''
    text = str(value).strip().lower().replace('.', '').replace('-', ' ')
    text = ' '.join(text.split())
    if text in PORTION_LABELS:
        return text
    return LEGACY_PORTION_ALIASES.get(text, '')
