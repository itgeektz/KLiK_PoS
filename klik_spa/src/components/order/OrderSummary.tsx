"use client";

import { useState, useEffect, useCallback } from "react";
import { useCartStore } from "../../stores/cartStore";
import { useCustomers } from "../../hooks/useCustomers";
import { usePOSDetails } from "../../hooks/usePOSProfile";
import { useCustomerStatistics } from "../../hooks/useCustomerStatistics";
import { useCustomerPermission } from "../../hooks/useCustomerPermission";
import { useProducts } from "../../hooks/useProducts";
import { toast } from "react-toastify";
import { extractErrorFromException } from "../../utils/errorExtraction";
import { getBatches } from "../../utils/batch";
import { getSerials } from "../../utils/serial";
import countryList from "react-select-country-list";
import { parsePhoneNumber } from "react-phone-number-input";
import type { CartItem, GiftCoupon } from "../../../types";
import type { Customer } from "../../types/customer";
import PaymentDialog from "../PaymentDialog";
import AddCustomerModal from "../AddCustomerModal";
import {
  createDraftSalesInvoice,
  validateCheckoutInvoice,
} from "../../services/salesInvoice";
import { CustomerSearchSection } from "./CustomerSearchSection";
import { CartItemRow } from "./CartItemRow";
import { OrderSummaryFooter } from "./OrderSummaryFooter";

interface OrderSummaryProps {
  cartItems: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem?: (id: string) => void;
  onClearCart?: () => void;
  onDuplicateItem?: (item: CartItem) => void;
  appliedCoupons: GiftCoupon[];
  onApplyCoupon: (coupon: GiftCoupon) => void;
  onRemoveCoupon: (couponCode: string) => void;
  isMobile?: boolean;
}

export default function OrderSummary({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onDuplicateItem,
  appliedCoupons,
  onRemoveCoupon,
  isMobile = false,
}: OrderSummaryProps) {
  const {
    selectedCustomer,
    setSelectedCustomer,
    updateUOM,
    updatePricesForCustomer,
  } = useCartStore();

  const [userRemovedDefaultCustomer, setUserRemovedDefaultCustomer] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [isValidatingCheckout, setIsValidatingCheckout] = useState(false);
  const [prefilledCustomerName, setPrefilledCustomerName] = useState("");
  const [prefilledData, setPrefilledData] = useState<{
    name?: string;
    email?: string;
    phone?: string;
  }>({});
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const { customers, isLoading, refetch: refetchCustomers } = useCustomers(customerSearchQuery);
  const { posDetails, loading: _posLoading } = usePOSDetails();
  const { checkCustomerPermission } = useCustomerPermission();
  const { statistics: customerStats } = useCustomerStatistics(selectedCustomer?.id || null);
  const { refreshStockOnly, updateBatchQuantitiesForItems } = useProducts();

  const [itemDiscounts, setItemDiscounts] = useState<Record<string, any>>(() => {
    const saved: Record<string, any> = {};
    cartItems.forEach(item => {
      if (item.serial_batch_bundle || item.bundle_entries) {
        saved[item.id] = {
          discountPercentage: 0,
          discountAmount: 0,
          serial_batch_bundle: item.serial_batch_bundle,
          bundle_entries: item.bundle_entries,
        };
      }
    });
    return saved;
  });
  const [itemBatches, setItemBatches] = useState<Record<string, any[]>>({});
  const [itemSerials, setItemSerials] = useState<Record<string, string[]>>({});

  const currency_symbol = posDetails?.currency_symbol;
  const autoFetchBatch = posDetails?.custom_autofetch_batchserial_ === 1;

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isInitialLoad && selectedCustomer && cartItems.length > 0) {
      updatePricesForCustomer(selectedCustomer.id);
    }
  }, [selectedCustomer?.id, cartItems.length, isInitialLoad, updatePricesForCustomer]);

  useEffect(() => {
    const fetchData = async () => {
      const newBatches = { ...itemBatches };
      const newSerials = { ...itemSerials };
      for (const item of cartItems) {
        const key = item.item_code || item.id;
        if (key && key !== "undefined") {
          if (!newBatches[key]) {
            const batches = await getBatches(item.id);
            if (Array.isArray(batches)) newBatches[key] = batches;
          }
          if (!newSerials[key]) {
            const serials = await getSerials(key);
            if (Array.isArray(serials)) newSerials[key] = serials;
          }
        }
      }
      setItemBatches(newBatches);
      setItemSerials(newSerials);
    };
    if (cartItems.length) fetchData();
  }, [cartItems]);

  const getDiscountedPrice = (item: CartItem) => {
    const discount = itemDiscounts[item.id] || { discountPercentage: 0, discountAmount: 0 };
    const customRate = discount.customRate;
    if (customRate !== undefined && customRate !== null) {
      return Math.max(0, customRate);
    }
    let price = item.price;
    if (discount.discountPercentage > 0) price = price * (1 - discount.discountPercentage / 100);
    if (discount.discountAmount > 0) price = Math.max(0, price - discount.discountAmount);
    return Math.max(0, price);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + getDiscountedPrice(item) * item.quantity, 0);
  const totalItemDiscount = cartItems.reduce((sum, item) => {
    const original = item.price * item.quantity;
    const discounted = getDiscountedPrice(item) * item.quantity;
    return sum + (original - discounted);
  }, 0);
  const couponDiscount = appliedCoupons.reduce((sum, c) => sum + c.value, 0);
  const total = Math.max(0, subtotal - couponDiscount);

  const handleUOMChange = useCallback((itemId: string, uom: string, price: number) => {
    updateUOM(itemId, uom, price);
  }, [updateUOM]);

  const updateItemDiscount = (itemId: string, field: string, value: number | string) => {
    setItemDiscounts(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || { discountPercentage: 0, discountAmount: 0 }), [field]: value }
    }));
  };

  const handleCustomRateChange = (item: CartItem, newRate?: number) => {
    setItemDiscounts(prev => ({
      ...prev,
      [item.id]: {
        ...(prev[item.id] || {}),
        customRate: newRate,
        discountPercentage: 0,
        discountAmount: 0,
      }
    }));
  };

  const handleBundleUpdate = (itemId: string, bundleId: string, entries: any[]) => {
    updateItemDiscount(itemId, "serial_batch_bundle", bundleId);
    updateItemDiscount(itemId, "bundle_entries", JSON.stringify(entries));
  };

  const filteredCustomers =
    customerSearchQuery.trim() === ""
      ? customers
      : customers.filter(
          (customer) =>
            customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
            customer.email.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
            customer.phone.includes(customerSearchQuery) ||
            customer.tags.some((tag) => tag.toLowerCase().includes(customerSearchQuery.toLowerCase()))
        );

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchQuery(customer.name);
    setShowCustomerDropdown(false);
    setUserRemovedDefaultCustomer(false);
  };

  const handleCustomerSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === "Enter" &&
      customerSearchQuery.trim() !== "" &&
      posDetails &&
      posDetails?.can_create_and_edit_customers === 1
    ) {
      if (filteredCustomers.length === 0) {
        const trimmedValue = customerSearchQuery.trim();
        let prefilledData = {};

        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
          prefilledData = { email: trimmedValue };
        } else if (
          /^[\d\s+()-]+$/.test(trimmedValue) &&
          trimmedValue.replace(/[\s+()-]/g, "").length >= 7
        ) {
          const companyCountryCode = (
            countryList().getData() as { value: string; label: string }[]
          ).find((c) => c.label === (posDetails?.company?.country || ""))?.value || "";

          let formattedPhone = trimmedValue;
          try {
            const parsed = parsePhoneNumber(trimmedValue, companyCountryCode as any);
            if (parsed) {
              formattedPhone = parsed.format("E.164");
            }
          } catch {
          }
          prefilledData = { phone: formattedPhone };
        } else {
          prefilledData = { name: trimmedValue };
        }

        setPrefilledData(prefilledData);
        setPrefilledCustomerName(trimmedValue);
        setShowAddCustomerModal(true);
        setShowCustomerDropdown(false);
      } else if (filteredCustomers.length === 1 && !userRemovedDefaultCustomer && filteredCustomers[0]) {
        handleCustomerSelect(filteredCustomers[0]);
      }
    }
  };

  const validateCustomer = () => {
    if (!selectedCustomer) {
      toast.error("Kindly choose customer");
      return false;
    }
    return true;
  };

  const handleCheckoutClick = async () => {
    if (!validateCustomer() || isValidatingCheckout) return;
    setIsValidatingCheckout(true);
    try {
      const payload = {
        customer: { id: selectedCustomer?.id },
        items: cartItems.map(item => ({
          id: item.item_code || item.id,
          quantity: item.quantity,
          price: getDiscountedPrice(item),
          uom: item.uom || "Nos",
          serial_batch_bundle: item.bundle_entries,
        })),
        itemDiscounts,
        businessType: posDetails?.business_type,
      };
      await validateCheckoutInvoice(payload);
      setShowPaymentDialog(true);
    } catch (error) {
      toast.error(extractErrorFromException(error, "Checkout validation failed"));
    } finally {
      setIsValidatingCheckout(false);
    }
  };

  const handleClearCart = () => {
    if (cartItems.length === 0) return;
    onClearCart?.();
    cartItems.forEach(item => onRemoveItem?.(item.id));
    appliedCoupons.forEach(coupon => onRemoveCoupon(coupon.code));
    setItemDiscounts({});
    setSelectedCustomer(null);
    setCustomerSearchQuery("");
  };

  const handleHoldOrder = async (orderData: any) => {
    if (!selectedCustomer) {
      toast.error("Kindly select a customer");
      return;
    }
    try {
      const result = await createDraftSalesInvoice(orderData);
      if (result?.success) {
        handleClearCart();
        toast.success("Draft invoice created and order held successfully!");
      }
    } catch (error) {
      toast.error(extractErrorFromException(error, "Failed to create draft invoice"));
    }
  };

  const handleCompletePayment = async (paymentData: any) => {
    console.log("OrderSummary: Payment completed, invoice created", paymentData);
  };

  const handleClosePaymentDialog = async (paymentCompleted?: boolean) => {
    setShowPaymentDialog(false);
    if (paymentCompleted) handleClearCart();

    try {
      const success = await refreshStockOnly();
      if (!success) console.log("OrderSummary: No stock updates needed");
      const cartItemCodes = cartItems.map((item) => item.item_code || item.id);
      if (cartItemCodes.length > 0) {
        await updateBatchQuantitiesForItems(cartItemCodes);
      }
    } catch (error: any) {
      console.error("OrderSummary: Failed to refresh stock:", error);
      toast.error(`Failed to update stock: ${error.message || "Unknown error"}`);
    }
  };

  const handleSaveCustomer = async (newCustomer: Partial<Customer> & { customer_name?: string }) => {
    if (newCustomer && newCustomer.customer_name) {
      try {
        const response = await fetch(
          `/api/method/klik_pos.api.customer.get_customer_info?customer_name=${encodeURIComponent(newCustomer.customer_name)}`
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const resData = await response.json();
        if (resData.message) {
          const erpCustomer = resData.message;
          const customerToSelect: Customer = {
            id: erpCustomer.name,
            name: erpCustomer.customer_name || erpCustomer.name,
            customer_name: erpCustomer.customer_name || erpCustomer.name,
            email: erpCustomer.email_id || "",
            phone: erpCustomer.mobile_no || "",
            type: erpCustomer.customer_type === "Company" ? "company" : "individual",
            address: {
              street: "",
              city: "",
              state: "",
              zipCode: "",
              country: erpCustomer.address_data?.country || posDetails?.company?.country || "",
            },
            loyaltyPoints: erpCustomer.custom_loyalty_points || 0,
            totalSpent: erpCustomer.custom_total_spent || 0,
            totalOrders: erpCustomer.custom_total_orders || 0,
            preferredPaymentMethod: "Cash",
            tags: erpCustomer.custom_tags?.split(",").filter(Boolean) || [],
            status: erpCustomer.custom_status || "active",
            is_walkin: erpCustomer.is_walkin,
            taxId: erpCustomer.tax_id || "",
            createdAt: erpCustomer.creation || new Date().toISOString(),
          };
          setSelectedCustomer(customerToSelect);
          setCustomerSearchQuery("");
          refetchCustomers?.();
        }
      } catch (error) {
        console.error("Error fetching customer details:", error);
        const customerToSelect: Customer = {
          id: newCustomer.customer_name || "",
          name: newCustomer.customer_name || "",
          email: "",
          phone: "",
          type: "individual",
          address: { street: "", city: "", state: "", zipCode: "", country: posDetails?.company?.country || "" },
          loyaltyPoints: 0,
          totalSpent: 0,
          totalOrders: 0,
          preferredPaymentMethod: "Cash",
          tags: [],
          status: "active",
          is_walkin: 0,
          createdAt: new Date().toISOString(),
        };
        setSelectedCustomer(customerToSelect);
        setCustomerSearchQuery("");
      }
    }
    setShowAddCustomerModal(false);
    setPrefilledCustomerName("");
    setPrefilledData({});
  };

  useEffect(() => {
    if (customers.length === 1 && !selectedCustomer && !isLoading) {
      const singleCustomer = customers[0];
      if (singleCustomer) {
        setSelectedCustomer(singleCustomer);
        setCustomerSearchQuery(singleCustomer.name);
      }
      setShowCustomerDropdown(false);
    }
  }, [customers, selectedCustomer, isLoading]);

  useEffect(() => {
    if (posDetails?.default_customer && !selectedCustomer && !_posLoading && !userRemovedDefaultCustomer) {
      const defaultCustomer = posDetails.default_customer as any;
      checkCustomerPermission(defaultCustomer.id).then((result) => {
        if (result.success && result.has_permission) {
          const transformedCustomer: Customer = {
            id: defaultCustomer.id,
            name: defaultCustomer.name,
            email: defaultCustomer.email || "",
            phone: defaultCustomer.phone || "",
            type: (defaultCustomer.customer_type === "Company" ? "company" : "individual") as "individual" | "company",
            address: { street: "", city: "", state: "", zipCode: "", country: posDetails.company?.country || "" },
            loyaltyPoints: 0,
            totalSpent: 0,
            totalOrders: 0,
            preferredPaymentMethod: "Cash" as const,
            notes: "",
            tags: [],
            status: "active",
            createdAt: new Date().toISOString(),
            defaultCurrency: defaultCustomer.default_currency || undefined,
          };
          setSelectedCustomer(transformedCustomer);
          setCustomerSearchQuery(transformedCustomer.name);
          setShowCustomerDropdown(false);
        }
      });
    }
  }, [posDetails, selectedCustomer, _posLoading, userRemovedDefaultCustomer, checkCustomerPermission]);

  useEffect(() => {
    const handleBatchUpdate = (event: CustomEvent) => {
      const { updatedItems } = event.detail;
      setItemBatches((prevBatches) => {
        const newBatches = { ...prevBatches };
        updatedItems.forEach(({ itemCode, batches }: { itemCode: string; batches: any[] }) => {
          if (itemCode && itemCode !== "undefined") {
            newBatches[itemCode] = batches;
          }
        });
        return newBatches;
      });
    };

    window.addEventListener("batchQuantitiesUpdated", handleBatchUpdate as EventListener);
    return () => {
      window.removeEventListener("batchQuantitiesUpdated", handleBatchUpdate as EventListener);
    };
  }, []);

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) newExpanded.delete(itemId);
    else newExpanded.add(itemId);
    setExpandedItems(newExpanded);
  };

  return (
    <div
      className={`${
        isMobile ? "h-full flex flex-col" : "h-full flex flex-col"
      } bg-white dark:bg-gray-800 ${
        !isMobile ? "border-l" : ""
      } border-gray-200 dark:border-gray-700`}
    >
      <div className={!isMobile ? "px-6 py-4 border-b border-gray-100 dark:border-gray-700" : ""}>
        <CustomerSearchSection
          customerSearchQuery={customerSearchQuery}
          setCustomerSearchQuery={setCustomerSearchQuery}
          showCustomerDropdown={showCustomerDropdown}
          setShowCustomerDropdown={setShowCustomerDropdown}
          filteredCustomers={filteredCustomers}
          selectedCustomer={selectedCustomer}
          onCustomerSelect={handleCustomerSelect}
          onRemoveCustomer={() => {
            setSelectedCustomer(null);
            setCustomerSearchQuery("");
            setUserRemovedDefaultCustomer(true);
          }}
          onAddCustomer={() => setShowAddCustomerModal(true)}
          canCreateCustomer={posDetails?.can_create_and_edit_customers === 1}
          isMobile={isMobile}
          onKeyDown={handleCustomerSearchKeyDown}
        />
      </div>

      <div
        className={`${
          isMobile
            ? "flex-1 overflow-y-auto custom-scrollbar p-4"
            : "flex-1 overflow-y-auto p-6 cart-scroll"
        }`}
      >
        <div className="space-y-4">
          {cartItems.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🛒</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Your cart is empty
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Add some items to get started!
              </p>
            </div>
          ) : (
            cartItems.map((item) => {
              const itemDiscount = itemDiscounts[item.id] || {
                discountPercentage: 0,
                discountAmount: 0,
                batchNumber: "",
                serialNumber: "",
                availableQuantity: 150,
              };

              return (
                <CartItemRow
                  key={item.id}
                  item={item}
                  isExpanded={expandedItems.has(item.id)}
                  onToggleExpand={() => toggleItemExpansion(item.id)}
                  itemDiscount={itemDiscount}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemoveItem={onRemoveItem}
                  onUOMChange={handleUOMChange}
                  onDiscountChange={updateItemDiscount}
                  onCustomRateChange={handleCustomRateChange}
                  onDuplicateItem={onDuplicateItem || (() => {})}
                  onBundleUpdate={handleBundleUpdate}
                  selectedCustomer={selectedCustomer}
                  posDetails={posDetails}
                  itemBatches={itemBatches[item.item_code || item.id] || []}
                  itemSerials={itemSerials[item.item_code || item.id] || []}
                  currency_symbol={currency_symbol}
                  isMobile={isMobile}
                  autoFetchBatch={autoFetchBatch}
                />
              );
            })
          )}
        </div>
      </div>

      {cartItems.length > 0 && (
        <OrderSummaryFooter
          subtotal={subtotal}
          total={total}
          totalItemDiscount={totalItemDiscount}
          couponDiscount={couponDiscount}
          onCheckout={handleCheckoutClick}
          onClearCart={handleClearCart}
          onHoldOrder={() => {
            if (!validateCustomer()) return;
            const sc = selectedCustomer;
            if (!sc) return;
            handleHoldOrder({
              items: cartItems.map((item) => ({
                ...item,
                price: getDiscountedPrice(item),
              })),
              customer: { id: sc.id },
              subtotal,
              total,
              appliedCoupons,
              itemDiscounts,
              totalItemDiscount,
              totalSavings: totalItemDiscount + couponDiscount,
              status: "held",
            });
          }}
          isValidating={isValidatingCheckout}
          isMobile={isMobile}
          currency_symbol={currency_symbol}
        />
      )}

      {showAddCustomerModal && (
        <AddCustomerModal
          customer={null}
          onClose={() => {
            setShowAddCustomerModal(false);
            setPrefilledCustomerName("");
            setPrefilledData({});
          }}
          onSave={handleSaveCustomer}
          prefilledName={prefilledCustomerName}
          prefilledData={prefilledData}
        />
      )}

      {showPaymentDialog && (
        <PaymentDialog
          isOpen={showPaymentDialog}
          onClose={handleClosePaymentDialog}
          cartItems={cartItems.map((item) => ({
            ...item,
            discountedPrice: getDiscountedPrice(item),
            itemDiscount: itemDiscounts[item.id] || {},
            originalPrice: item.price,
            finalAmount: getDiscountedPrice(item) * item.quantity,
          }))}
          appliedCoupons={appliedCoupons}
          selectedCustomer={selectedCustomer}
          onCompletePayment={handleCompletePayment}
          onHoldOrder={handleHoldOrder}
          isMobile={isMobile}
          itemDiscounts={itemDiscounts}
          totalItemDiscount={totalItemDiscount}
        />
      )}
    </div>
  );
}