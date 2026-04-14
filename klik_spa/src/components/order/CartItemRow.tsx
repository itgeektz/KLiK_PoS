"use client";

import { Minus, Plus, X, Copy } from "lucide-react";
import type { CartItem } from "../../../types";
import { QuantityInput } from "./QuantityInput";
import { BatchSelectField } from "./BatchSelectField";
import { SerialSelectField } from "./SerialSelectField";
import { formatCurrencyWithSymbol } from "../../utils/currency";
import { UOMSelectField } from "./UOMSelectField";

interface CartItemRowProps {
  item: CartItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  itemDiscount: any;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem?: (id: string) => void;
  onUOMChange: (itemId: string, uom: string, price: number) => void;
  onDiscountChange: (itemId: string, field: string, value: number | string) => void;
  onCustomRateChange: (item: CartItem, rate: number) => void;
  onDuplicateItem: (item: CartItem) => void;
  selectedCustomer?: { id: string } | null;
  posDetails: any;
  itemBatches: any[];
  itemSerials: string[];
  currency_symbol?: string;
  isMobile?: boolean;
}

export const CartItemRow = ({
  item,
  isExpanded,
  onToggleExpand,
  itemDiscount,
  onUpdateQuantity,
  onRemoveItem,
  onUOMChange,
  onDiscountChange,
  onCustomRateChange,
  onDuplicateItem,
  selectedCustomer,
  posDetails,
  itemBatches,
  itemSerials,
  currency_symbol,
  isMobile,
}: CartItemRowProps) => {
  const discountedPrice = (() => {
    let price = item.price;
    if (itemDiscount.discountPercentage > 0) price = price * (1 - itemDiscount.discountPercentage / 100);
    if (itemDiscount.discountAmount > 0) price = Math.max(0, price - itemDiscount.discountAmount);
    return Math.max(0, price);
  })();
  const originalTotal = item.price * item.quantity;
  const discountedTotal = discountedPrice * item.quantity;
  const amount = (itemDiscount.customRate || item.price) * item.quantity;

  return (
    <div className={isMobile ? "bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden" : ""}>
      {/* Main item row */}
      <div className={`flex items-center ${isMobile ? "p-3" : "py-2"}`}>
        {/* Expand/Collapse Arrow */}
        <div className="flex-shrink-0 mr-2">
          <button
            onClick={onToggleExpand}
            className={`${
              isMobile ? "w-5 h-5" : "w-5 h-5"
            } rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-500 transition-all duration-200`}
            title="Show/Hide Details"
          >
            <svg
              className={`${
                isMobile ? "w-3 h-3" : "w-4 h-4"
              } text-beveren-500 dark:text-gray-400 transform transition-transform duration-200 ${
                isExpanded ? "rotate-90" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Product Image */}
        {item.image && (
          <div className="flex-shrink-0">
            <img
              src={item.image}
              alt={item.name}
              className={`${
                isMobile ? "w-16 h-16" : "w-12 h-12"
              } rounded-lg object-cover`}
              crossOrigin="anonymous"
            />
          </div>
        )}

        {/* Product Info */}
        <div className="flex-1 min-w-0 px-3">
          <h4
            className={`font-semibold text-gray-900 dark:text-white ${
              isMobile ? "text-base" : "text-sm"
            } truncate`}
          >
            {item.name}
          </h4>
          <p
            className={`text-gray-500 dark:text-gray-400 capitalize font-medium ${
              isMobile ? "text-sm" : "text-xs"
            }`}
          >
            {item.category}
          </p>
          <div className={`${isMobile ? "text-base" : "text-sm"}`}>
            {discountedPrice < item.price ? (
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 line-through text-xs">
                  {formatCurrencyWithSymbol(item.price, currency_symbol)}
                </span>
                <span className="text-beveren-600 dark:text-beveren-400 font-semibold">
                  {formatCurrencyWithSymbol(discountedPrice, currency_symbol)}
                </span>
              </div>
            ) : (
              <div className="text-beveren-600 dark:text-beveren-400 font-semibold">
                {formatCurrencyWithSymbol(item.price, currency_symbol)}
              </div>
            )}
          </div>
        </div>

        {/* Quantity Controls */}
        <div className="flex-shrink-0 flex items-center ml-10 space-x-1 min-w-[70px] justify-center">
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            className={`${
              isMobile ? "w-8 h-8" : "w-5 h-5"
            } rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors`}
          >
            <Minus
              size={isMobile ? 16 : 14}
              className="text-gray-600 dark:text-gray-400"
            />
          </button>
          <span
            className={`${
              isMobile ? "w-10" : "w-8"
            } text-center font-semibold text-gray-900 dark:text-white text-sm`}
          >
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            className={`${
              isMobile ? "w-8 h-8" : "w-7 h-7"
            } rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors`}
          >
            <Plus
              size={isMobile ? 16 : 14}
              className="text-blue-600 dark:text-blue-400"
            />
          </button>
        </div>

        {/* Total Price */}
        <div className="flex-shrink-0 text-right min-w-[80px] px-2">
          {discountedTotal < originalTotal ? (
            <div>
              <p className="text-gray-400 line-through text-xs">
                {formatCurrencyWithSymbol(originalTotal, currency_symbol)}
              </p>
              <p
                className={`text-beveren-600 dark:text-beveren-400 font-semibold ${
                  isMobile ? "text-base" : "text-sm"
                }`}
              >
                {formatCurrencyWithSymbol(discountedTotal, currency_symbol)}
              </p>
            </div>
          ) : (
            <p
              className={`text-beveren-600 dark:text-beveren-400 font-semibold ${
                isMobile ? "text-base" : "text-sm"
              }`}
            >
              {formatCurrencyWithSymbol(amount, currency_symbol)}
            </p>
          )}
        </div>

        {/* Remove Button */}
        <div className="flex-shrink-0 ml-2">
          <button
            onClick={() => onRemoveItem?.(item.id)}
            className={`${
              isMobile ? "w-8 h-8" : "w-6 h-6"
            } rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400 transition-colors`}
            title="Remove item"
          >
            <X size={isMobile ? 16 : 12} />
          </button>
        </div>
      </div>

      {/* Expanded Details Section */}
      {isExpanded && (
        <div
          className={`border-t border-gray-200 dark:border-gray-600 ${
            isMobile ? "px-3 pb-3" : "px-6 py-3 ml-7"
          } bg-gray-25 dark:bg-gray-750`}
        >
          <div className="w-full">
            {/* Row 1: Quantity | UOM */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label
                  className={`block text-gray-700 dark:text-gray-300 font-medium ${isMobile ? "text-sm" : "text-sm"} mb-2`}
                >
                  Quantity
                </label>
                <QuantityInput
                  item={item}
                  onUpdateQuantity={onUpdateQuantity}
                  isMobile={isMobile}
                />
              </div>
              <div>
                <label
                  className={`block text-gray-700 dark:text-gray-300 font-medium ${isMobile ? "text-sm" : "text-sm"} mb-2`}
                >
                  UOM
                </label>
                <UOMSelectField
                  item={item}
                  onUOMChange={onUOMChange}
                  isMobile={isMobile}
                  selectedCustomer={selectedCustomer}
                />
              </div>
            </div>

            {/* Row 2: Rate | Amount */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label
                  className={`block text-gray-700 dark:text-gray-300 font-medium ${isMobile ? "text-sm" : "text-sm"} mb-2`}
                >
                  Rate
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemDiscount.customRate !== undefined ? itemDiscount.customRate : item.price}
                  onChange={(e) => onCustomRateChange(item, parseFloat(e.target.value) || 0)}
                  readOnly={!posDetails?.allow_rate_change}
                  placeholder="Rate"
                  className={`w-full ${isMobile ? "text-sm" : "text-sm"} px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-beveren-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
                />
              </div>
              <div>
                <label
                  className={`block text-gray-700 dark:text-gray-300 font-medium ${isMobile ? "text-sm" : "text-sm"} mb-2`}
                >
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  readOnly
                  className={`w-full ${isMobile ? "text-sm" : "text-sm"} px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed`}
                />
              </div>
            </div>

            {/* Row 3: Discount Amount | Discount (%) */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label
                  className={`block text-gray-700 dark:text-gray-300 font-medium ${isMobile ? "text-sm" : "text-sm"} mb-2`}
                >
                  Discount Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemDiscount.discountAmount || ""}
                  onChange={(e) => onDiscountChange(item.id, "discountAmount", parseFloat(e.target.value) || 0)}
                  readOnly={!posDetails?.allow_discount_change}
                  placeholder="0.00"
                  className={`w-full ${isMobile ? "text-sm" : "text-sm"} px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-beveren-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
                />
              </div>
              <div>
                <label
                  className={`block text-gray-700 dark:text-gray-300 font-medium ${isMobile ? "text-sm" : "text-sm"} mb-2`}
                >
                  Discount (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={itemDiscount.discountPercentage || ""}
                  onChange={(e) => onDiscountChange(item.id, "discountPercentage", parseFloat(e.target.value) || 0)}
                  readOnly={!posDetails?.allow_discount_change}
                  placeholder="0.0"
                  className={`w-full ${isMobile ? "text-sm" : "text-sm"} px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-beveren-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
                />
              </div>
            </div>

            {/* Row 4: Batch | Serial No */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label
                  className={`block text-gray-700 dark:text-gray-300 font-medium ${isMobile ? "text-sm" : "text-sm"} mb-2`}
                >
                  Batch
                </label>
                <BatchSelectField
                  itemId={item.id}
                  itemCode={item.item_code || item.id}
                  options={itemBatches || []}
                  value={itemDiscount.batchNumber || ""}
                  onChange={(selectedBatch, selectedQty) => {
                    onDiscountChange(item.id, "batchNumber", selectedBatch);
                    onDiscountChange(item.id, "availableQuantity", selectedQty);
                  }}
                  isMobile={isMobile}
                />
              </div>
              <div>
                <label
                  className={`block text-gray-700 dark:text-gray-300 font-medium ${isMobile ? "text-sm" : "text-sm"} mb-2`}
                >
                  Serial No
                </label>
                <SerialSelectField
                  itemId={item.id}
                  itemCode={item.item_code || item.id}
                  options={itemSerials || []}
                  value={itemDiscount.serialNumber || ""}
                  onChange={(sn) => onDiscountChange(item.id, "serialNumber", sn)}
                  isMobile={isMobile}
                />
              </div>
            </div>

            {/* Duplicate Line Button */}
            <div className="mt-1 mb-3">
              <button
                type="button"
                onClick={() => onDuplicateItem(item)}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-dashed border-beveren-400 dark:border-beveren-500 text-beveren-600 dark:text-beveren-400 bg-beveren-50 dark:bg-beveren-900/20 hover:bg-beveren-100 dark:hover:bg-beveren-900/40 transition-colors ${
                  isMobile ? "text-sm" : "text-xs"
                } font-medium`}
                title="Add another line for the same product with a different batch, serial or UOM"
              >
                <Copy size={isMobile ? 15 : 13} />
                Duplicate Line
              </button>
            </div>
          </div>

          {/* Discount Summary */}
          {(itemDiscount.discountPercentage > 0 || itemDiscount.discountAmount > 0) && (
            <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
              <div className="text-xs text-green-800 dark:text-green-300 font-medium">
                Discount Applied:
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-green-700 dark:text-green-400">
                  {itemDiscount.discountPercentage > 0 && `${itemDiscount.discountPercentage}% off`}
                  {itemDiscount.discountPercentage > 0 && itemDiscount.discountAmount > 0 && " + "}
                  {itemDiscount.discountAmount > 0 && formatCurrencyWithSymbol(itemDiscount.discountAmount, currency_symbol)}
                </span>
                <span className="text-xs font-semibold text-green-800 dark:text-green-300">
                  Save {formatCurrencyWithSymbol(originalTotal - discountedTotal, currency_symbol)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};