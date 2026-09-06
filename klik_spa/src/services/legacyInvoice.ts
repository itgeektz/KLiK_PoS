// services/legacyInvoice.ts
// Thin fetch wrappers around klik_pos.api.legacy_invoice.* -- read-only access to
// bills imported from the pre-migration MySQL system. See that module's docstring
// for the data model; nothing here ever touches `tabSales Invoice`.

export interface LegacyInvoiceListRow {
  name: string;
  legacy_saleno: string;
  legacy_refno?: string;
  posting_date: string;
  posting_time?: string;
  legacy_customer_name: string;
  customer?: string;
  customer_match_status?: string;
  net_amount: number;
  gross_amount: number;
  served_by?: string;
  item_count?: number;
}

export interface LegacyInvoiceListResponse {
  success: boolean;
  data: LegacyInvoiceListRow[];
  total_count: number;
}

export interface LegacyInvoiceDetailItem {
  item_code_legacy?: string;
  item_name_legacy: string;
  qty: number;
  rate: number;
  amount: number;
  matched_item?: string;
  match_method?: string;
}

export interface LegacyInvoiceDetail {
  name: string;
  legacy_saleno: string;
  legacy_refno?: string;
  posting_date: string;
  posting_time?: string;
  customer?: string;
  customer_match_status: string;
  legacy_customer_name: string;
  served_by?: string;
  gross_amount: number;
  vat_amount: number;
  net_amount: number;
  payment_breakdown: {
    cash: number;
    invoice: number;
    cheque: number;
    credit_card: number;
    voucher: number;
    returned: number;
  };
  items: LegacyInvoiceDetailItem[];
}

export interface LegacyResolvedLine {
  legacy_item_name: string;
  legacy_item_code?: string;
  qty: number;
  legacy_rate: number;
  matched: boolean;
  match_method: string;
  item_code: string | null;
  item_name: string;
  image: string;
  uom: string;
  disabled: number;
  rate: number;
}

export interface LegacyResolvedInvoice {
  name: string;
  customer?: string;
  legacy_customer_name: string;
  posting_date: string;
  total_lines: number;
  matched_lines: number;
  items: LegacyResolvedLine[];
}

async function callMethod<T>(method: string, params: Record<string, string | number | boolean | undefined>): Promise<T> {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");

  const response = await fetch(`/api/method/${method}${query ? `?${query}` : ""}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const resData = await response.json();
  if (!resData.message || resData.message.success === false) {
    throw new Error(resData.message?.error || resData.error || `${method} failed`);
  }
  return resData.message as T;
}

export function getLegacyInvoicesForCustomer(customer: string, limit = 50, start = 0) {
  return callMethod<LegacyInvoiceListResponse>(
    "klik_pos.api.legacy_invoice.get_legacy_invoices_for_customer",
    { customer, limit, start },
  );
}

export function searchLegacyInvoices(params: {
  search_text?: string;
  item_name?: string;
  date_from?: string;
  date_to?: string;
  unmatched_only?: boolean;
  limit?: number;
  start?: number;
}) {
  return callMethod<LegacyInvoiceListResponse>(
    "klik_pos.api.legacy_invoice.search_legacy_invoices",
    { ...params },
  );
}

export function getLegacyInvoiceDetail(name: string) {
  return callMethod<{ success: boolean; data: LegacyInvoiceDetail }>(
    "klik_pos.api.legacy_invoice.get_legacy_invoice_detail",
    { name },
  );
}

export function resolveLegacyInvoiceForCart(name: string) {
  return callMethod<{ success: boolean; data: LegacyResolvedInvoice }>(
    "klik_pos.api.legacy_invoice.resolve_legacy_invoice_for_cart",
    { name },
  );
}
