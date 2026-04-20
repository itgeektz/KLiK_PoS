import { Calculator } from "lucide-react";
import { formatCurrencyWithSymbol } from "../../utils/currency";
import { subtractCurrency } from "../../utils/currencyMath";
import type { Calculations } from "./types";

interface TotalsSectionProps {
  calculations: Calculations;
  roundOffAmount: number;
  roundOffInput: string;
  roundOffEnabled: boolean;
  invoiceSubmitted: boolean;
  isProcessingPayment: boolean;
  totalPaidAmount: number;
  outstandingAmount: number;
  displayCurrencySymbol: string;
  isB2B: boolean;
  isB2C: boolean;
  onRoundOffChange: (value: string) => void;
  onRoundOff: () => void;
}

export default function TotalsSection({
  calculations,
  roundOffAmount,
  roundOffInput,
  roundOffEnabled,
  invoiceSubmitted,
  isProcessingPayment,
  totalPaidAmount,
  outstandingAmount,
  displayCurrencySymbol,
  isB2B,
  isB2C,
  onRoundOffChange,
  onRoundOff,
}: TotalsSectionProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {isB2B ? "Invoice Summary" : "Payment Summary"}
      </h3>
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Round Off</label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={roundOffInput}
                onChange={(e) => onRoundOffChange(e.target.value)}
                disabled={invoiceSubmitted || isProcessingPayment || !roundOffEnabled}
                placeholder="-0.00"
                className={`flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-beveren-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${invoiceSubmitted || isProcessingPayment ? "cursor-not-allowed opacity-50" : ""}`}
              />
              <button
                onClick={onRoundOff}
                disabled={invoiceSubmitted || isProcessingPayment || !roundOffEnabled}
                className={`px-3 py-2 bg-beveren-600 text-white rounded-lg hover:bg-beveren-700 transition-colors ${invoiceSubmitted || isProcessingPayment || !roundOffEnabled ? "cursor-not-allowed opacity-50" : ""}`}
                title="Auto Round"
              >
                <Calculator size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-600 pt-3 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatCurrencyWithSymbol(calculations.subtotal, displayCurrencySymbol)}
            </span>
          </div>
          {calculations.couponDiscount > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Coupon Discount</span>
              <span>-{formatCurrencyWithSymbol(calculations.couponDiscount, displayCurrencySymbol)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              Tax ({calculations.selectedTax?.rate}% {calculations.isInclusive ? "Incl." : "Excl."})
            </span>
            <span className={`font-medium ${calculations.isInclusive ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>
              {calculations.isInclusive
                ? `(${formatCurrencyWithSymbol(calculations.taxAmount, displayCurrencySymbol)})`
                : formatCurrencyWithSymbol(calculations.taxAmount, displayCurrencySymbol)}
            </span>
          </div>
          {roundOffAmount !== 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Round Off</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrencyWithSymbol(roundOffAmount, displayCurrencySymbol)}
              </span>
            </div>
          )}
          <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
            <div className="flex justify-between">
              <span className="text-xl font-bold text-gray-900 dark:text-white">Grand Total</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrencyWithSymbol(calculations.grandTotal, displayCurrencySymbol)}
              </span>
            </div>
          </div>

          {(isB2C || isB2B) && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Paid</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {formatCurrencyWithSymbol(totalPaidAmount, displayCurrencySymbol)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Outstanding Amount</span>
                <span className={`font-bold ${outstandingAmount > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                  {formatCurrencyWithSymbol(outstandingAmount, displayCurrencySymbol)}
                </span>
              </div>
              {totalPaidAmount > calculations.grandTotal && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Change</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {formatCurrencyWithSymbol(subtractCurrency(totalPaidAmount, calculations.grandTotal), displayCurrencySymbol)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}