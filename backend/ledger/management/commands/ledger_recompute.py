"""
Reconcile the cached UserProfile.account_balance against the journal.

    manage.py ledger_recompute --check          # report drift, exit 1 if any
    manage.py ledger_recompute --fix            # rewrite balances from the journal
    manage.py ledger_recompute --check --user-id 42

Worth running on a cron for the first few weeks after automatic charges go live:
a non-zero drift means something wrote account_balance outside ledger/service.py.
"""

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Sum

from accounts.models import UserProfile
from ledger.models import LedgerEntry
from ledger.service import ZERO, _dec


class Command(BaseCommand):
    help = 'Check or repair account_balance against the ledger journal.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--check', action='store_true',
            help='Report drift without changing anything (exits 1 if drift found).',
        )
        parser.add_argument(
            '--fix', action='store_true',
            help='Set account_balance to the journal total for every drifting user.',
        )
        parser.add_argument('--user-id', type=int, help='Limit to one user.')

    def handle(self, *args, **options):
        if not options['check'] and not options['fix']:
            raise CommandError('Pass --check or --fix.')

        profiles = UserProfile.objects.select_related('user')
        if options['user_id']:
            profiles = profiles.filter(user_id=options['user_id'])

        # Journal totals for every customer, in one query.
        totals = {
            row['customer_id']: _dec(row['total'])
            for row in LedgerEntry.objects.values('customer_id').annotate(total=Sum('amount'))
        }

        drifted = []
        for profile in profiles:
            cached = _dec(profile.account_balance)
            journal = totals.get(profile.user_id, ZERO)
            if cached != journal:
                drifted.append((profile, cached, journal))

        if not drifted:
            self.stdout.write(self.style.SUCCESS(
                f'No drift across {profiles.count()} profile(s).'
            ))
            return

        for profile, cached, journal in drifted:
            self.stdout.write(self.style.WARNING(
                f'  {profile.user.username:<24} cached={cached:>12} '
                f'journal={journal:>12} drift={cached - journal:>12}'
            ))

        if options['fix']:
            for profile, _cached, journal in drifted:
                UserProfile.objects.filter(pk=profile.pk).update(account_balance=journal)
            self.stdout.write(self.style.SUCCESS(
                f'Repaired {len(drifted)} balance(s) from the journal.'
            ))
            return

        raise CommandError(f'{len(drifted)} profile(s) drifted from the journal.')
