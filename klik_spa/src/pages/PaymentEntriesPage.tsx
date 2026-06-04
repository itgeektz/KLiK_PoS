import { useEffect, useMemo, useState } from "react";
import { Banknote, FileText, Loader2, Search, User } from "lucide-react";
import BottomNavigation from "../components/BottomNavigation";
import CustomerPaymentEntryModal from "../components/customer/CustomerPaymentEntryModal";
import { useCustomers } from "../hooks/useCustomers";
import type { Customer } from "../types/customer";
import {
  getOutstandingSalesInvoices,
  type OutstandingSalesInvoice,
} from "../services/paymentEntry";
import { formatCurrencyWithSymbol } from "../utils/currency";

type PaymentTab = "invoice" | "customer";

export default function PaymentEntriesPage() {
  const [activeTab, setActiveTab] = useState<PaymentTab>("invoice");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [invoices, setInvoices] = useState<OutstandingSalesInvoice[]>([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<OutstandingSalesInvoice | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { customers, isLoading: isLoadingCustomers, error: customerError } = useCustomers(customerSearch);

  useEffect(() => {
    let isCurrent = true;
    const timer = window.setTimeout(async () => {
      setIsLoadingInvoices(true);
      setInvoiceError(null);
      try {
        const response = await getOutstandingSalesInvoices(invoiceSearch);
        if (!isCurrent) return;
        setInvoices(response.data || []);
        setInvoiceTotal(response.total_count || 0);
      } catch (err) {
        if (!isCurrent) return;
        setInvoiceError(err instanceof Error ? err.message : "Failed to fetch outstanding invoices");
        setInvoices([]);
        setInvoiceTotal(0);
      } finally {
        if (isCurrent) setIsLoadingInvoices(false);
      }
    }, invoiceSearch ? 300 : 0);

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [invoiceSearch]);

  const invoiceCustomer = useMemo(() => {
    if (!selectedInvoice) return null;
    return {
      id: selectedInvoice.customer,
      name: selectedInvoice.customer_name || selectedInvoice.customer,
      email: "",
      phone: "",
      address: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
      },
      loyaltyPoints: 0,
      totalSpent: 0,
      totalOrders: 0,
      preferredPaymentMethod: "Cash",
      tags: [],
      status: "active",
      type: "individual",
      createdAt: new Date().toISOString(),
    } as Customer;
  }, [selectedInvoice]);

  const closePaymentModal = () => {
    setSelectedInvoice(null);
    setSelectedCustomer(null);
  };

  const handlePaymentCreated = () => {
    getOutstandingSalesInvoices(invoiceSearch)
      .then((response) => {
        setInvoices(response.data || []);
        setInvoiceTotal(response.total_count || 0);
      })
      .catch(() => {
        // The toast from the modal already confirms creation; avoid noisy reload errors.
      });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 dark:bg-gray-900 lg:ml-20 lg:pb-12">
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Entries</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {invoiceTotal} outstanding invoice{invoiceTotal === 1 ? "" : "s"}
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800">
              <button
                type="button"
                onClick={() => setActiveTab("invoice")}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  activeTab === "invoice"
                    ? "bg-white text-beveren-700 shadow-sm dark:bg-gray-900 dark:text-beveren-300"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                <FileText size={16} />
                <span>By Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("customer")}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  activeTab === "customer"
                    ? "bg-white text-beveren-700 shadow-sm dark:bg-gray-900 dark:text-beveren-300"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                <User size={16} />
                <span>By Customer</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 py-6 sm:px-6">
        {activeTab === "invoice" ? (
          <section className="space-y-4">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={invoiceSearch}
                onChange={(event) => setInvoiceSearch(event.target.value)}
                placeholder="Search invoice or customer"
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-beveren-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                        Invoice
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                        Date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                        Outstanding
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {isLoadingInvoices ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-2">
                            <Loader2 size={18} className="animate-spin" />
                            Loading invoices...
                          </span>
                        </td>
                      </tr>
                    ) : invoiceError ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-red-600 dark:text-red-400">
                          {invoiceError}
                        </td>
                      </tr>
                    ) : invoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                          No outstanding invoices found.
                        </td>
                      </tr>
                    ) : (
                      invoices.map((invoice) => (
                        <tr key={invoice.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-white">{invoice.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{invoice.status}</div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {invoice.customer_name || invoice.customer}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {invoice.posting_date}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                            {formatCurrencyWithSymbol(invoice.outstanding_amount, invoice.currency)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedInvoice(invoice)}
                              className="inline-flex items-center gap-2 rounded-lg bg-beveren-600 px-3 py-2 text-sm font-medium text-white hover:bg-beveren-700"
                            >
                              <Banknote size={16} />
                              <span>Receive</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder="Search customer"
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-beveren-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {isLoadingCustomers ? (
                <div className="rounded-lg border border-gray-200 bg-white p-5 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    Loading customers...
                  </span>
                </div>
              ) : customerError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  {customerError.message}
                </div>
              ) : customers.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-5 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  No customers found.
                </div>
              ) : (
                customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gray-900 dark:text-white">{customer.name}</div>
                        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{customer.id}</div>
                        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {customer.phone || customer.email || "No contact"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(customer)}
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-beveren-600 px-3 py-2 text-sm font-medium text-white hover:bg-beveren-700"
                      >
                        <Banknote size={16} />
                        <span>Receive</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>

      {selectedInvoice && invoiceCustomer && (
        <CustomerPaymentEntryModal
          customer={invoiceCustomer}
          salesInvoiceName={selectedInvoice.name}
          outstandingAmount={selectedInvoice.outstanding_amount}
          defaultAmount={selectedInvoice.outstanding_amount}
          invoiceCurrency={selectedInvoice.currency}
          onClose={closePaymentModal}
          onCreated={handlePaymentCreated}
        />
      )}

      {selectedCustomer && (
        <CustomerPaymentEntryModal
          customer={selectedCustomer}
          onClose={closePaymentModal}
          onCreated={handlePaymentCreated}
        />
      )}

      <BottomNavigation />
    </div>
  );
}
