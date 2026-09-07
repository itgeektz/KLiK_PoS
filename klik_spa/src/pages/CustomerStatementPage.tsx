import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, Loader2, Calendar, RotateCcw } from "lucide-react";
import { formatCurrencyWithSymbol } from "../utils/currency";
import { usePOSProfileStore } from "../stores/posProfileStore";
import { useCustomerDetails } from "../hooks/useCustomers";

interface StatementEntry {
  posting_date: string;
  voucher_type: string;
  voucher_no: string;
  against_voucher: string | null;
  debit: number;
  credit: number;
  balance: number;
  remarks: string | null;
}

interface StatementData {
  company: string;
  currency: string;
  from_date: string | null;
  to_date: string;
  opening_balance: number;
  closing_balance: number;
  entries: StatementEntry[];
}

// A printable Statement of Account for one customer -- Sales Invoices and Payment
// Entries only, with a running balance, over a date range the user picks. Built
// natively here (rather than linking into Frappe Desk's own Accounts Receivable /
// General Ledger reports) because POS cashiers typically don't have the
// Desk/accounting permissions those reports require, and this way the numbers are
// guaranteed to come from the exact same source as the Customer Detail page's own
// "Outstanding Balance" card.
//
// Note this page renders inside the app's normal layout (RetailSidebar is a fixed,
// 80px-wide bar on desktop, rendered by App.tsx around every route) -- everything
// here is offset with lg:ml-20 so it doesn't sit underneath that sidebar.
export default function CustomerStatementPage() {
  const { id } = useParams();
  const customerId = id ?? "";
  const navigate = useNavigate();

  const { customer } = useCustomerDetails(customerId);
  const { posDetails } = usePOSProfileStore();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFromDate, setAppliedFromDate] = useState("");
  const [appliedToDate, setAppliedToDate] = useState("");

  const [statement, setStatement] = useState<StatementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatement = useCallback(async () => {
    if (!customerId) return;
    setIsLoading(true);
    setError(null);
    try {
      const fromParam = appliedFromDate ? `&from_date=${encodeURIComponent(appliedFromDate)}` : "";
      const toParam = appliedToDate ? `&to_date=${encodeURIComponent(appliedToDate)}` : "";
      const res = await fetch(
        `/api/method/klik_pos.api.customer.get_customer_statement?customer=${encodeURIComponent(customerId)}${fromParam}${toParam}`,
        { method: "GET", credentials: "include" }
      );
      const resData = await res.json();
      if (!resData?.message?.success) {
        throw new Error(resData?.message?.error || "Failed to load statement");
      }
      setStatement(resData.message as StatementData);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Failed to load statement");
      setStatement(null);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, appliedFromDate, appliedToDate]);

  // Load once immediately (all time, until the user narrows it) and again whenever
  // an applied range changes.
  useEffect(() => {
    fetchStatement();
  }, [fetchStatement]);

  const handleApply = () => {
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
  };

  const handleClear = () => {
    setFromDate("");
    setToDate("");
    setAppliedFromDate("");
    setAppliedToDate("");
  };

  const hasActiveFilter = Boolean(appliedFromDate || appliedToDate || fromDate || toDate);

  const currency = statement?.currency || posDetails?.currency || "USD";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companySummary = (posDetails as any)?.company_summary;
  const customerLabel =
    // @ts-expect-error customer_name isn't declared on the Customer type but the API sets it
    customer?.customer_name || customer?.name || customerId;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .statement-no-print { display: none !important; }
          .statement-page-shell { margin-left: 0 !important; padding: 0 !important; }
          .statement-content-wrapper { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .statement-print-area { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; border-radius: 0 !important; font-size: 11px; }
          .statement-print-area table { font-size: 11px; width: 100% !important; }
          .statement-print-area th, .statement-print-area td { padding: 4px 6px !important; }
          .statement-print-area thead { display: table-header-group; }
          .statement-print-area tfoot { display: table-footer-group; }
          .statement-print-area tr { page-break-inside: avoid; }
          body { background: white !important; }
        }
      `}</style>

      {/* Header / controls -- hidden when printing. lg:ml-20 clears the app's fixed
          left sidebar (RetailSidebar, w-20, only shown at the lg breakpoint). */}
      <div className="statement-no-print statement-page-shell lg:ml-20 sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(-1)}
              title="Back"
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Statement of Account</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{customerLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-beveren-50 dark:bg-gray-800 border border-beveren-200 dark:border-gray-700 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-beveren-500 dark:text-beveren-400 shrink-0" />
              <div className="flex flex-col leading-tight">
                <label className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  max={toDate || undefined}
                  className="bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none"
                />
              </div>
              <div className="w-px h-8 bg-beveren-200 dark:bg-gray-700" />
              <div className="flex flex-col leading-tight">
                <label className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  min={fromDate || undefined}
                  className="bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 bg-beveren-600 text-white rounded-lg hover:bg-beveren-700 transition-colors text-sm font-medium shadow-sm"
            >
              Apply
            </button>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={handleClear}
                title="Clear filter, show all time"
                className="flex items-center gap-1 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>All Time</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!statement}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      <div className="statement-content-wrapper lg:ml-20 px-4 sm:px-6 py-6 max-w-4xl mx-auto">
        {/* @ts-expect-error is_walkin isn't declared on the Customer type but the API sets it */}
        {customer?.is_walkin == 1 && (
          <div className="statement-no-print mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
            This is a shared walk-in account used across many unrelated sales, not one customer's
            running account. The running balance below pools all of that activity together, so it
            isn't a meaningful "amount owed" the way it is for a named customer.
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading statement...
          </div>
        )}

        {!isLoading && error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {!isLoading && !error && statement && (
          <div className="statement-print-area bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
            {/* Letterhead */}
            <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {companySummary?.company_name || companySummary?.name || statement.company}
                </h2>
                {companySummary?.tax_id && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tax/PIN: {companySummary.tax_id}</p>
                )}
                {(companySummary?.phone_no || companySummary?.email) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {[companySummary?.phone_no, companySummary?.email].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <div className="text-right">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Statement of Account</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {statement.from_date ? `${statement.from_date} to ${statement.to_date}` : `As of ${statement.to_date}`}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Statement for</p>
              <p className="text-base font-semibold text-gray-900 dark:text-white">{customerLabel}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Customer ID: {customerId}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300 dark:border-gray-600 text-left text-gray-600 dark:text-gray-400">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 font-medium">Reference</th>
                    <th className="py-2 pr-3 font-medium text-right">Debit</th>
                    <th className="py-2 pr-3 font-medium text-right">Credit</th>
                    <th className="py-2 pl-3 font-medium text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.from_date && (
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <td className="py-2 pr-3 text-gray-500 dark:text-gray-400" colSpan={5}>
                        Opening Balance (as of {statement.from_date})
                      </td>
                      <td className="py-2 pl-3 text-right font-medium text-gray-900 dark:text-white">
                        {formatCurrencyWithSymbol(statement.opening_balance, currency)}
                      </td>
                    </tr>
                  )}
                  {statement.entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-400 dark:text-gray-500">
                        No transactions in this period.
                      </td>
                    </tr>
                  ) : (
                    statement.entries.map((entry, idx) => (
                      <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-2 pr-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{entry.posting_date}</td>
                        <td className="py-2 pr-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{entry.voucher_type}</td>
                        <td className="py-2 pr-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {entry.voucher_no}
                          {entry.against_voucher && entry.against_voucher !== entry.voucher_no && (
                            <span className="text-gray-400 dark:text-gray-500"> (against {entry.against_voucher})</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right text-gray-900 dark:text-white whitespace-nowrap">
                          {entry.debit ? formatCurrencyWithSymbol(entry.debit, currency) : ""}
                        </td>
                        <td className="py-2 pr-3 text-right text-gray-900 dark:text-white whitespace-nowrap">
                          {entry.credit ? formatCurrencyWithSymbol(entry.credit, currency) : ""}
                        </td>
                        <td className="py-2 pl-3 text-right font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          {formatCurrencyWithSymbol(entry.balance, currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                    <td colSpan={5} className="py-3 pr-3 text-right font-semibold text-gray-900 dark:text-white">
                      Closing Balance
                    </td>
                    <td className="py-3 pl-3 text-right font-bold text-lg text-gray-900 dark:text-white whitespace-nowrap">
                      {formatCurrencyWithSymbol(statement.closing_balance, currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
              Generated {new Date().toLocaleString()} &middot; A positive balance is owed by the customer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}