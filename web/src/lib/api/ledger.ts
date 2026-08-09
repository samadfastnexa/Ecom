import { apiDownload, apiFetch, apiShare } from "./client";
import type {
  BusinessInfo,
  LedgerEntry,
  LedgerStatement,
  LedgerSummary,
  ManualEntryInput,
  Receivable,
  RecordPaymentInput,
  StatementFilters,
} from "../types";

function query(filters: StatementFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.start) params.set("start", filters.start);
  if (filters.end) params.set("end", filters.end);
  if (filters.source) params.set("source", filters.source);
  if (filters.entry_type) params.set("entry_type", filters.entry_type);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Customer ledger.
 *
 * Every `balance` returned here is **owed-positive** — a positive number means
 * the customer owes money. That is the opposite of the stored account_balance
 * and matches the printed statement, so never mix the two.
 */
export const ledgerApi = {
  /** Business identity. Readable signed-out — it is what the storefront's
   *  "contact us" button uses — so no `auth` here. */
  business() {
    return apiFetch<BusinessInfo>("/ledger/business/");
  },

  /** Admin-only; the server 403s anyone else on the same URL. */
  updateBusiness(patch: Partial<Pick<BusinessInfo, "share_location_label">>) {
    return apiFetch<BusinessInfo>("/ledger/business/", {
      method: "PATCH",
      body: patch,
      auth: true,
    });
  },

  receivables(opts: { search?: string; only_owing?: boolean } = {}) {
    const params = new URLSearchParams();
    if (opts.search) params.set("search", opts.search);
    if (opts.only_owing) params.set("only_owing", "true");
    const qs = params.toString();
    return apiFetch<{ count: number; results: Receivable[] }>(
      `/ledger/customers/${qs ? `?${qs}` : ""}`,
      { auth: true }
    );
  },

  statement(userId: number, filters: StatementFilters = {}) {
    return apiFetch<LedgerStatement>(
      `/ledger/customers/${userId}/statement/${query(filters)}`,
      { auth: true }
    );
  },

  summary(userId: number) {
    return apiFetch<LedgerSummary>(`/ledger/customers/${userId}/summary/`, {
      auth: true,
    });
  },

  recordPayment(payload: RecordPaymentInput) {
    return apiFetch<LedgerEntry>("/ledger/payments/", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },

  postEntry(payload: ManualEntryInput) {
    return apiFetch<LedgerEntry>("/ledger/entries/", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },

  voidEntry(entryId: number, reason: string) {
    return apiFetch<LedgerEntry>(`/ledger/entries/${entryId}/void/`, {
      method: "POST",
      auth: true,
      body: { reason },
    });
  },

  downloadReceipt(entryId: number, receiptNumber?: string | null) {
    return apiDownload(
      `/ledger/entries/${entryId}/receipt/`,
      `receipt-${receiptNumber || entryId}.pdf`
    );
  },

  downloadStatement(userId: number, username: string, filters: StatementFilters = {}) {
    return apiDownload(
      `/ledger/customers/${userId}/statement.pdf${query(filters)}`,
      `statement-${username}.pdf`
    );
  },

  /**
   * Offer the statement to the OS share sheet (WhatsApp, email, anything).
   * Falls back to a download where the browser cannot share files, which is
   * most desktops — see apiShare.
   */
  shareStatement(
    userId: number,
    username: string,
    customerName: string,
    filters: StatementFilters = {}
  ) {
    return apiShare(
      `/ledger/customers/${userId}/statement.pdf${query(filters)}`,
      `statement-${username}.pdf`,
      `Statement — ${customerName}`,
      `Account statement for ${customerName}.`
    );
  },
};
