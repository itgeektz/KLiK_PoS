
import { useEffect, useState, useCallback, useMemo } from "react";
import type { SalesInvoice } from "../../types";

export function useSalesInvoices(searchTerm: string = "") {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const LIMIT = 100;

  // Debounced search term state
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // Debounce search term to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchInvoices = useCallback(async (page = 0, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const start = page * LIMIT;
      const frontendStartTime = performance.now();
      console.log(`🚀 Frontend: Fetching sales invoices - page: ${page}, start: ${start}, limit: ${LIMIT}, search: ${debouncedSearchTerm}`);

      const searchParam = debouncedSearchTerm ? `&search=${encodeURIComponent(debouncedSearchTerm)}` : '';
      const response = await fetch(
        `/api/method/klik_pos.api.sales_invoice.get_sales_invoices?limit=${LIMIT}&start=${start}${searchParam}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          credentials: 'include'
        }
      );

      const networkTime = performance.now();
      console.log(`📊 Frontend: Network request completed in ${(networkTime - frontendStartTime).toFixed(2)}ms`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const resData = await response.json();
      const parseTime = performance.now();
      console.log(`📊 Frontend: JSON parsing completed in ${(parseTime - networkTime).toFixed(2)}ms`);

      if (!resData.message || !resData.message.success) {
        throw new Error(resData.message?.error || resData.error || "Failed to fetch invoices");
      }

      const rawInvoices = resData.message.data;
      const newInvoicesCount = rawInvoices.length;
      const totalCountFromAPI = resData.message.total_count || 0;

      // Check if we have more invoices to load
      setHasMore(newInvoicesCount === LIMIT);
      setTotalCount(totalCountFromAPI);

      const transformed: SalesInvoice[] = rawInvoices.map((invoice: Record<string, unknown>) => {
        const status = invoice.status as string;
        const items = invoice.items || [];

        // Determine if invoice can be returned
        let canReturn = true;

        if (status === "Credit Note Issued") {
          // For credit notes, only show return button if there are items that can still be returned
          const itemsWithAvailableQty = items.filter((item: any) => item.available_qty > 0);
          canReturn = itemsWithAvailableQty.length > 0;

          // console.log(`🔄 Credit Note ${invoice.name}: Total items: ${items.length}, Items with available_qty > 0: ${itemsWithAvailableQty.length}, canReturn: ${canReturn}`);
          // console.log(`🔄 Credit Note Items:`, items.map((item: any) => ({
          //   item_code: item.item_code,
          //   qty: item.qty,
          //   returned_qty: item.returned_qty,
          //   available_qty: item.available_qty
          // })));
        } else {
          // For all other invoices (Paid, Draft, etc.), show return button by default
          canReturn = true;
        }

        return {
          id: invoice.name,
          date: invoice.posting_date || new Date().toISOString().split("T")[0],
          time: invoice.posting_time || "00:00:00",
          cashier: invoice.cashier_name,
          cashierId: invoice.owner || "",
          customer: invoice.customer_name || "",
          customerId: invoice.customer || "",
          items: items,
          subtotal:
            (Number(invoice.base_grand_total) || 0) -
            (Number(invoice.total_taxes_and_charges) || 0) +
            (Number(invoice.discount_amount) || 0),
          giftCardDiscount: Number(invoice.discount_amount) || 0,
          giftCardCode: String(invoice.discount_code) || "",
          taxAmount: Number(invoice.total_taxes_and_charges) || 0,
          totalAmount: Number(invoice.base_grand_total) || 0,
          paymentMethod: invoice.mode_of_payment || "-",
          payment_methods: invoice.payment_methods || [],
          amountPaid: Number(invoice.base_rounded_total) || 0,
          changeGiven: Number(invoice.change_amount) || 0,
          status:
            (status as
              | "Draft"
              | "Unpaid"
              | "Partly Paid"
              | "Paid"
              | "Overdue"
              | "Cancelled"
              | "Return"
              | "Credit Note Issued"
              | "Completed"
              | "Pending"
              | "Refunded") || "Completed",
          refundAmount:
            status === "Refunded" ? Number(invoice.base_grand_total) || 0 : 0,
          custom_zatca_submit_status:
            (invoice.custom_zatca_submit_status as
              | "Pending"
              | "Reported"
              | "Not Reported"
              | "Cleared"
              | "Not Cleared") || "Draft",
          currency: invoice.currency || "USD",
          notes: invoice.remarks || "",
          posProfile: invoice.pos_profile || "",
          custom_pos_opening_entry: invoice.custom_pos_opening_entry || "",
          canReturn: canReturn,
        };
      });

      const transformTime = performance.now();
      console.log(`📊 Frontend: Data transformation completed in ${(transformTime - parseTime).toFixed(2)}ms`);

      if (append) {
        setInvoices(prev => [...prev, ...transformed]);
        setTotalLoaded(prev => prev + newInvoicesCount);
      } else {
        setInvoices(transformed);
        setTotalLoaded(newInvoicesCount);
      }

      const totalFrontendTime = performance.now() - frontendStartTime;
      console.log(`📊 Frontend: TOTAL TIME: ${totalFrontendTime.toFixed(2)}ms for ${newInvoicesCount} invoices (page ${page})`);

      setCurrentPage(page);
      setError(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Unknown error occurred");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [debouncedSearchTerm]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchInvoices(currentPage + 1, true);
    }
  }, [currentPage, isLoadingMore, hasMore, fetchInvoices]);

  const refetch = useCallback(() => {
    setCurrentPage(0);
    setTotalLoaded(0);
    setHasMore(true);
    fetchInvoices(0, false);
  }, [fetchInvoices]);

  // Initial load and refetch when debounced search term changes
  useEffect(() => {
    setCurrentPage(0);
    setTotalLoaded(0);
    setHasMore(true);
    fetchInvoices(0, false);
  }, [debouncedSearchTerm, fetchInvoices]);

  return {
    invoices,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    totalLoaded,
    totalCount,
    loadMore,
    refetch,
  };
}
