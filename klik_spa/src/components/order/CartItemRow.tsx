"use client";

import { useState, useEffect, useCallback } from "react";
import { Minus, Plus, X, Copy, Package, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "react-toastify";
import type { CartItem } from "../../../types";
import { QuantityInput } from "./QuantityInput";
import { formatCurrencyWithSymbol } from "../../utils/currency";
import { UOMSelectField } from "./UOMSelectField";
import { SerialBatchBundleModal } from "./SerialBatchBundleSelector";
import { useCartStore } from "../../stores/cartStore";

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
  autoFetchBatch?: boolean;
}

interface BatchData {
  batch_no: string;
  qty: number;
  expiry_date: string;
  manufacturing_date: string;
}

interface SerialData {
  serial_no: string;
}

interface SerialBatchEntry {
  serial_no?: string;
  batch_no?: string;
  qty?: number;
  selected?: boolean;
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
  autoFetchBatch = false,
}: CartItemRowProps) => {
  const { updateItemBundleEntries } = useCartStore();
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [isBundleDetailsOpen, setIsBundleDetailsOpen] = useState(false);
  const [bundleEntries, setBundleEntries] = useState<SerialBatchEntry[]>(() => {
    if (item.bundle_entries && Array.isArray(item.bundle_entries)) {
      return item.bundle_entries;
    }
    return [];
  });
  const [availableBatches, setAvailableBatches] = useState<BatchData[]>([]);
  const [availableSerials, setAvailableSerials] = useState<SerialData[]>([]);
  const [isFetchingBundleData, setIsFetchingBundleData] = useState(false);
  const [modalEntries, setModalEntries] = useState<SerialBatchEntry[]>([]);
  const [modalQty, setModalQty] = useState(item.quantity);

  const hasSerialOrBatch = item.has_serial_no || item.has_batch_no;
  const warehouse = posDetails?.warehouse || "";

  const saveToCart = useCallback((entries: SerialBatchEntry[]) => {
    const validEntries = entries.map(({ selected, ...e }) => e);
    setBundleEntries(validEntries);
    updateItemBundleEntries(item.id, validEntries);
  }, [item.id, updateItemBundleEntries]);

  const fetchBundleData = useCallback(async (qty: number, shouldSaveToCart: boolean = false) => {
    if (!warehouse) return;
    if (!item.has_serial_no && !item.has_batch_no) return;
    
    setIsFetchingBundleData(true);
    try {
      const params = new URLSearchParams({
        item_code: item.item_code || item.id,
        warehouse: warehouse,
        customer: selectedCustomer?.id || "",
        qty: qty.toString(),
        based_on: "FIFO",
        has_serial_no: item.has_serial_no ? "1" : "0",
        has_batch_no: item.has_batch_no ? "1" : "0",
      });

      const response = await fetch(`/api/method/klik_pos.api.item.bundle.get_available_batches_and_serials?${params.toString()}`);
      const result = await response.json();

      if (result.message) {
        const data = result.message;
        
        if (data.batches && Array.isArray(data.batches)) {
          setAvailableBatches(data.batches);
        } else {
          setAvailableBatches([]);
        }

        if (data.serials && Array.isArray(data.serials)) {
          setAvailableSerials(data.serials);
        } else {
          setAvailableSerials([]);
        }
      }

      if (qty > 0) {
        const autoDataResponse = await fetch(`/api/method/erpnext.stock.doctype.serial_and_batch_bundle.serial_and_batch_bundle.get_auto_data?${params.toString()}`);
        const autoDataResult = await autoDataResponse.json();

        if (autoDataResult.message && Array.isArray(autoDataResult.message) && autoDataResult.message.length > 0) {
          const autoEntries = autoDataResult.message.map((row: any) => ({
            serial_no: row.serial_no || undefined,
            batch_no: row.batch_no || undefined,
            qty: row.qty || 1,
            selected: false,
          }));
          setModalEntries(autoEntries);
          if (shouldSaveToCart) {
            saveToCart(autoEntries);
          }
        } else {
          setModalEntries([{
            qty: 1,
            selected: false,
            serial_no: item.has_serial_no ? "" : undefined,
            batch_no: item.has_batch_no ? "" : undefined,
          }]);
          if (shouldSaveToCart) {
            saveToCart([]);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch bundle data:", error);
      toast.error("Failed to fetch batch/serial data");
    } finally {
      setIsFetchingBundleData(false);
    }
  }, [item, warehouse, selectedCustomer, saveToCart]);

  useEffect(() => {
    if (hasSerialOrBatch && warehouse && autoFetchBatch && item.quantity > 0) {
      fetchBundleData(item.quantity, true);
    }
  }, [item.quantity, warehouse, autoFetchBatch, hasSerialOrBatch]);

  useEffect(() => {
    if (bundleEntries.length > 0 && !autoFetchBatch) {
      setModalEntries(bundleEntries);
    }
  }, [bundleEntries, autoFetchBatch]);

  const handleOpenModal = () => {
    if (hasSerialOrBatch) {
      setModalQty(item.quantity);
      if (!autoFetchBatch && item.quantity > 0) {
        fetchBundleData(item.quantity, false);
      } else if (autoFetchBatch && bundleEntries.length === 0 && item.quantity > 0) {
        fetchBundleData(item.quantity, true);
      }
      setShowBundleModal(true);
    }
  };

  const handleBundleSave = (entries: SerialBatchEntry[]) => {
    if (!Array.isArray(entries)) {
      toast.error("Invalid bundle entries");
      return;
    }
    
    saveToCart(entries);
    setShowBundleModal(false);
  };

  const handleModalQtyChange = async (newQty: number) => {
    setModalQty(newQty);
    if (autoFetchBatch && newQty > 0) {
      await fetchBundleData(newQty, true);
    }
  };

  const handleModalFetchData = async (qty: number) => {
    await fetchBundleData(qty, true);
  };

  const discountedPrice = (() => {
    let price = item.price;
    if (itemDiscount.discountPercentage > 0) price = price * (1 - itemDiscount.discountPercentage / 100);
    if (itemDiscount.discountAmount > 0) price = Math.max(0, price - itemDiscount.discountAmount);
    return Math.max(0, price);
  })();
  const originalTotal = item.price * item.quantity;
  const discountedTotal = discountedPrice * item.quantity;
  const amount = (itemDiscount.customRate || item.price) * item.quantity;

  const hasBundleEntries = bundleEntries.length > 0;

  return (
    <div className={isMobile ? "bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden" : ""}>
      <div className={`flex items-center ${isMobile ? "p-3" : "py-2"}`}>
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

            {hasSerialOrBatch && (
              <div className="mb-4">
                <button
                  onClick={handleOpenModal}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border ${
                    hasBundleEntries
                      ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                      : "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  } transition-colors ${isMobile ? "text-sm" : "text-sm"} font-medium`}
                >
                  <Package size={isMobile ? 16 : 14} />
                  {hasBundleEntries ? "Update Serial/Batch" : "Add Serial/Batch"}
                </button>
              </div>
            )}

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

          {hasBundleEntries && (
            <div className="mt-3 rounded-md border border-blue-200 dark:border-blue-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsBundleDetailsOpen(!isBundleDetailsOpen)}
                className="w-full flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              >
                <span className="text-xs text-blue-800 dark:text-blue-300 font-medium">
                  Bundle Details:
                </span>
                {isBundleDetailsOpen ? (
                  <ChevronUp size={14} className="text-blue-800 dark:text-blue-300" />
                ) : (
                  <ChevronDown size={14} className="text-blue-800 dark:text-blue-300" />
                )}
              </button>
              {isBundleDetailsOpen && (
                <div className="p-2 pt-0 bg-blue-50 dark:bg-blue-900/20 space-y-1">
                  {bundleEntries.map((entry, idx) => (
                    <div key={idx} className="text-xs text-blue-700 dark:text-blue-400">
                      {entry.serial_no && <span>Serial: {entry.serial_no} </span>}
                      {entry.batch_no && <span>Batch: {entry.batch_no} </span>}
                      {entry.qty && <span>Qty: {entry.qty}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <SerialBatchBundleModal
        isOpen={showBundleModal}
        onClose={() => setShowBundleModal(false)}
        onSave={handleBundleSave}
        item={{
          id: item.id,
          item_code: item.item_code,
          name: item.name,
          has_serial_no: item.has_serial_no,
          has_batch_no: item.has_batch_no,
        }}
        warehouse={warehouse}
        qty={modalQty}
        onQtyChange={handleModalQtyChange}
        availableBatches={availableBatches}
        availableSerials={availableSerials}
        entries={modalEntries}
        onEntriesChange={setModalEntries}
        isLoading={isFetchingBundleData}
        onFetchData={handleModalFetchData}
        autoFetchBatch={autoFetchBatch}
      />
    </div>
  );
};