"""
Seed the journal from the balances that already exist, then open for business.

    manage.py ledger_backfill --dry-run
    manage.py ledger_backfill --opening-date 2026-08-01
    manage.py ledger_backfill --enable-auto-charge
    manage.py ledger_backfill --undo

Policy: **opening balances only.** Nothing in this codebase has ever charged an
order's total to `account_balance`, so the historical debit side does not exist
and today's balance cannot be rebuilt from the records. That number is the
business's own belief about what each customer owes, so it is preserved as a
single opening entry and the journal starts clean from go-live.

Crucially this does NOT write `account_balance` — the field already holds the
figure being recorded, so writing it again would double every balance.
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import UserProfile
from ledger.models import LedgerEntry, LedgerSettings
from ledger.service import ZERO, _dec, ensure_customer_code, post_entry


class Command(BaseCommand):
    help = 'Create opening-balance ledger entries from existing account balances.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Report what would happen, change nothing.')
        parser.add_argument('--opening-date', type=str,
                            help='Date for the opening entries (YYYY-MM-DD). Defaults to today.')
        parser.add_argument('--enable-auto-charge', action='store_true',
                            help='Turn on automatic charges from orders and deliveries.')
        parser.add_argument('--undo', action='store_true',
                            help='Delete the opening entries created by this command.')

    def handle(self, *args, **options):
        if options['undo']:
            return self._undo(options['dry_run'])

        opening_date = timezone.localdate()
        if options['opening_date']:
            from datetime import datetime
            try:
                opening_date = datetime.strptime(options['opening_date'], '%Y-%m-%d').date()
            except ValueError:
                raise CommandError('--opening-date must be YYYY-MM-DD.')

        profiles = list(
            UserProfile.objects.select_related('user').exclude(account_balance=0)
        )
        already = set(
            LedgerEntry.objects
            .filter(source_ref__startswith='opening:')
            .values_list('customer_id', flat=True)
        )
        todo = [p for p in profiles if p.user_id not in already]

        self.stdout.write(
            f'{len(profiles)} profile(s) with a non-zero balance; '
            f'{len(already)} already have an opening entry; {len(todo)} to create.'
        )

        if options['dry_run']:
            for p in todo[:20]:
                self.stdout.write(f'  would open {p.user.username:<24} {p.account_balance:>12}')
            if len(todo) > 20:
                self.stdout.write(f'  … and {len(todo) - 20} more')
            self.stdout.write(self.style.WARNING('Dry run — nothing written.'))
            return

        created = 0
        with transaction.atomic():
            for profile in todo:
                balance = _dec(profile.account_balance)
                if balance == ZERO:
                    continue
                ensure_customer_code(profile.user)
                post_entry(
                    customer=profile.user,
                    entry_type=LedgerEntry.OPENING,
                    amount=balance,
                    entry_date=opening_date,
                    description='Opening balance (migrated)',
                    source_ref=f'opening:{profile.user_id}',
                    source_key=f'opening:{profile.user_id}',
                    # The balance already contains this figure — writing it
                    # again would double it.
                    update_balance=False,
                )
                created += 1

            settings_obj = LedgerSettings.load()
            settings_obj.ledger_start_date = opening_date
            if options['enable_auto_charge']:
                settings_obj.auto_charge_enabled = True
            settings_obj.save()

        self.stdout.write(self.style.SUCCESS(f'Created {created} opening entry/entries.'))
        self.stdout.write(
            f'ledger_start_date set to {opening_date} — records dated before this '
            f'are never auto-charged.'
        )
        if options['enable_auto_charge']:
            self.stdout.write(self.style.SUCCESS(
                'Automatic charges are now ON. Orders reaching Delivered and bottle '
                'deliveries will post to the ledger.'
            ))
        else:
            self.stdout.write(self.style.WARNING(
                'Automatic charges remain OFF. Re-run with --enable-auto-charge, or '
                'flip auto_charge_enabled in the admin, when you are ready.'
            ))
        self.stdout.write('Verify with: manage.py ledger_recompute --check')

    def _undo(self, dry_run):
        entries = LedgerEntry.objects.filter(source_ref__startswith='opening:')
        count = entries.count()
        if dry_run:
            self.stdout.write(self.style.WARNING(f'Would delete {count} opening entry/entries.'))
            return

        balances_before = {
            p.user_id: p.account_balance
            for p in UserProfile.objects.exclude(account_balance=0)
        }
        entries.delete()
        drifted = [
            p.user_id for p in UserProfile.objects.exclude(account_balance=0)
            if balances_before.get(p.user_id) != p.account_balance
        ]
        if drifted:
            raise CommandError(f'account_balance changed for {len(drifted)} profile(s) — investigate.')

        self.stdout.write(self.style.SUCCESS(
            f'Deleted {count} opening entry/entries; account_balance untouched.'
        ))
