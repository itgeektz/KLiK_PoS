import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, ShoppingCart, History, Search } from "lucide-react";
import { formatCurrencyWithSymbol } from "../../utils/currency";
import { usePOSProfileStore } from "../../stores/posProfileStore";
import {
  getLegacyInvoicesForCustomer,
  getLegacyInvoiceDetail,
  type LegacyInvoiceListRow,
  type LegacyInvoiceDetail,
} from "../../services/legacyInvoice";
import { addLegacyInvoiceToCart } from "../../utils/legacyInvoiceToCart";
import type { Customer } from "../../types/customer";

interface LegacyInvoicesPanelProps {
  customerId: string;
  customer: Customer | null;
  isMobile?: boolean;
}

export default function LegacyInvoicesPanel({ customerId, customer, isMobile }: LegacyInvoicesPanelProps) {
  const navigate = useNavigate();
  const { posDetails } = usePOSProfileStore();

  const [rows, setRows] = useState<LegacyInvoiceListRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedName, setExpandedName] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, LegacyInvoiceDetail>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [cartLoadingName, setCartLoadingName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!customerId) {
      setRows([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getLegacyInvoicesForCustomer(customerId)
      .then((res) => {
        if (!cancelled) setRows(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load old system bills");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const toggleExpand = async (row: LegacyInvoiceListRow) => {
    if (expandedName === row.name) {
      setExpandedName(null);
      return;
    }
    setExpandedName(row.name);
    if (!detailCache[row.name]) {
      setDetailLoading(row.name);
      try {
        const res = await getLegacyInvoiceDetail(row.name);
        setDetailCache((prev) => ({ ...prev, [row.name]: res.data }));
      } catch {
        // Row stays expanded with an inline error; not fatal to the rest of the list.
      } finally {
        setDetailLoading(null);
      }
    }
  };

  const handleAddToCart = async (row: LegacyInvoiceListRow) => {
    setCartLoadingName(row.name);
    const result = await addLegacyInvoiceToCart(row.name, customer);
    setCartLoadingName(null);
    if (result.success) {
      navigate("/");
    }
  };

  const currency = posDetails?.currency || "USD";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-500 dark:text-gray-400">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-beveren-600 mr-2" />
        Loading old system bills...
      </div>
    );
  }

  if (error) {
    return <p className="py-6 text-center text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (rows.length === 0) {
    return (
      <div className="py-10 text-center">
        <History className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No bills for this customer in the old system.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-600">
      <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/10 text-xs text-amber-800 dark:text-amber-300">
        Read-only history from your previous system. Use "Add to Cart" to re-create a bill here so it can be
        checked out as a normal invoice.
      </div>
      {rows.map((row) => {
        const isOpen = expandedName === row.name;
        const detail = detailCache[row.name];
        return (
          <div key={row.name}>
            <button
              type="button"
              onClick={() => toggleExpand(row)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div className="flex items-center gap-2 min-w-0">
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {row.posting_date} &middot; Old Sale #{row.legacy_saleno}
                  </div>
                  {row.item_count !== undefined && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{row.item_count} item(s)</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrencyWithSymbol(row.net_amount || row.gross_amount, currency)}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(row);
                  }}
                  disabled={cartLoadingName === row.name}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-beveren-600 text-white hover:bg-beveren-700 disabled:opacity-50"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  {cartLoadingName === row.name ? "Loading..." : "Add to Cart"}
                </button>
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 bg-gray-50 dark:bg-gray-900/40">
                {detailLoading === row.name && !detail ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 py-2">Loading items...</p>
                ) : detail ? (
                  <table className="w-full text-xs mt-1">
                    <thead>
                      <tr className="text-gray-500 dark:text-gray-400">
                        <th className="text-left font-medium py-1">Item</th>
                        <th className="text-right font-medium py-1">Qty</th>
                        <th className="text-right font-medium py-1">Rate</th>
                        <th className="text-right font-medium py-1">Amount</th>
                        <th className="text-left font-medium py-1 pl-3">Catalog</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {detail.items.map((it, idx) => (
                        <tr key={idx} className="text-gray-700 dark:text-gray-200">
                          <td className="py-1 pr-2">{it.item_name_legacy}</td>
                          <td className="py-1 text-right">{it.qty}</td>
                          <td className="py-1 text-right">{formatCurrencyWithSymbol(it.rate, currency)}</td>
                          <td className="py-1 text-right">{formatCurrencyWithSymbol(it.amount, currency)}</td>
                          <td className="py-1 pl-3">
                            {it.matched_item ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                matched
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                manual
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-red-500 py-2">Could not load items for this bill.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
      {!isMobile && (
        <div className="px-4 py-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Search className="w-3.5 h-3.5" />
          Looking for a bill under a name that isn't this customer? Use "Search Old Bills" from the Customers
          list -- some old-system names were never added as a formal customer here.
        </div>
      )}
    </div>
  );
}
