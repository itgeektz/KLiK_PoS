import { Loader2 } from "lucide-react";
import { useState } from "react";
import type { MpesaRegisterPayment } from "../../services/mpesa";
import { formatCurrencyWithSymbol } from "../../utils/currency";

type Tab = "stk" | "reconcile";

interface MpesaOptionsModalProps {
  isOpen: boolean;
  modeOfPayment: string;
  amount: number;
  phoneNumber: string;
  currencySymbol: string;
  searchTerm: string;
  payments: MpesaRegisterPayment[];
  pendingCount: number;
  selectedPaymentNames: string[];
  selectedTotal: number;
  mergePayments: boolean;
  isLoadingPayments: boolean;
  isProcessing: boolean;
  onClose: () => void;
  onPhoneNumberChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onTogglePayment: (paymentName: string) => void;
  onToggleMergePayments: (checked: boolean) => void;
  onInitiateStk: () => void;
  onAddPayments: () => void;
}

export default function MpesaOptionsModal({
  isOpen,
  modeOfPayment,
  amount,
  phoneNumber,
  currencySymbol,
  searchTerm,
  payments,
  pendingCount,
  selectedPaymentNames,
  selectedTotal,
  mergePayments,
  isLoadingPayments,
  isProcessing,
  onClose,
  onPhoneNumberChange,
  onSearchChange,
  onTogglePayment,
  onToggleMergePayments,
  onInitiateStk,
  onAddPayments,
}: MpesaOptionsModalProps) {
  const [tab, setTab] = useState<Tab>("stk");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">M-Pesa Payment Options</h2>
            <p className="text-sm text-gray-500">
              {modeOfPayment} • Expected{" "}
              {formatCurrencyWithSymbol(amount, currencySymbol)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-sm border px-3 py-1 rounded"
          >
            Close
          </button>
        </div>

        <div className="flex border-b">
          <button
            onClick={() => setTab("stk")}
            className={`flex-1 py-3 text-sm font-medium ${
              tab === "stk"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-gray-500"
            }`}
          >
            STK Push
          </button>
          <button
            onClick={() => setTab("reconcile")}
            className={`flex-1 py-3 text-sm font-medium ${
              tab === "reconcile"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500"
            }`}
          >
            Reconcile ({pendingCount})
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 space-y-4">
          {tab === "stk" && (
            <>
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <input
                  value={phoneNumber}
                  onChange={(e) => onPhoneNumberChange(e.target.value)}
                  disabled={isProcessing}
                  className="w-full mt-1 border rounded-lg px-3 py-2"
                />
              </div>

              <button
                onClick={onInitiateStk}
                disabled={isProcessing}
                className="w-full bg-emerald-600 text-white py-3 rounded-lg flex justify-center gap-2"
              >
                {isProcessing && <Loader2 className="animate-spin" size={16} />}
                Send STK Push
              </button>
            </>
          )}

          {/* RECONCILE TAB */}
          {tab === "reconcile" && (
            <>
              <input
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search..."
                className="w-full border rounded-lg px-3 py-2"
              />

              <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
                {isLoadingPayments ? (
                  <div className="p-4 flex gap-2 text-sm">
                    <Loader2 className="animate-spin" size={16} />
                    Loading...
                  </div>
                ) : payments.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">No results</div>
                ) : (
                  payments.map((p) => {
                    const checked = selectedPaymentNames.includes(p.name);
                    return (
                      <label
                        key={p.name}
                        className="flex gap-3 p-3 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onTogglePayment(p.name)}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span>{p.full_name || p.name}</span>
                            <span className="font-semibold">
                              {formatCurrencyWithSymbol(
                                Number(p.transamount || 0),
                                currencySymbol
                              )}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {p.transid}
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={mergePayments}
                  onChange={(e) => onToggleMergePayments(e.target.checked)}
                />
                Merge payments
              </label>

              <div className="flex justify-between text-sm bg-gray-800 p-3 rounded">
                <span>Total</span>
                <span className="font-semibold">
                  {formatCurrencyWithSymbol(selectedTotal, currencySymbol)}
                </span>
              </div>

              <button
                onClick={onAddPayments}
                disabled={selectedPaymentNames.length === 0 || isProcessing}
                className="w-full bg-blue-600 text-white py-3 rounded-lg flex justify-center gap-2"
              >
                {isProcessing && <Loader2 className="animate-spin" size={16} />}
                Add Payments
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
