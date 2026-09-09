import { useEffect } from "react";
import type { CartItem } from "../../types";
import { useCartStore } from "../stores/cartStore";
import { customerDisplayService } from "../services/customerDisplayService";
import { getEffectiveDisplayRate } from "../utils/cartPricing";
import { roundCurrency } from "../utils/currencyMath";

interface CustomerDisplayDiscount {
  discountPercentage?: number;
  discountAmount?: number;
  customRate?: number;
  customRateIncludesTax?: boolean;
}

interface UseCustomerDisplayOptions {
  itemDiscounts: Record<string, CustomerDisplayDiscount | undefined>;
  isTaxIncludedInBasicRate: boolean;
}

export function useCustomerDisplay({
  itemDiscounts,
  isTaxIncludedInBasicRate,
}: UseCustomerDisplayOptions) {
  const cartItems = useCartStore((state) => state.cartItems);
  const selectedCustomer = useCartStore((state) => state.selectedCustomer);

  useEffect(() => {
    const items = cartItems.map((item) => {
      const quantity = Number(item.quantity || 0);
      const originalItem: CartItem = {
        ...item,
        price: Number(item.original_price ?? item.price ?? 0),
      };
      const originalUnitPrice = getEffectiveDisplayRate(originalItem, {
        itemDiscounts: {},
        isTaxIncludedInBasicRate,
      });
      const unitPrice = getEffectiveDisplayRate(item, {
        itemDiscounts,
        isTaxIncludedInBasicRate,
      });
      const originalLineTotal = roundCurrency(originalUnitPrice * quantity);
      const lineTotal = roundCurrency(unitPrice * quantity);
      const itemDiscount = roundCurrency(Math.max(0, originalLineTotal - lineTotal));

      return {
        id: item.item_code || item.id,
        name: item.name,
        quantity,
        uom: item.uom,
        unitPrice,
        originalUnitPrice,
        lineTotal,
        originalLineTotal,
        itemDiscount,
      };
    });
    const subtotal = items.reduce(
      (sum, item) => roundCurrency(sum + item.originalLineTotal),
      0,
    );
    const itemDiscountTotal = items.reduce(
      (sum, item) => roundCurrency(sum + item.itemDiscount),
      0,
    );
    const discountedTotal = roundCurrency(Math.max(0, subtotal - itemDiscountTotal));

    customerDisplayService.publish({
      mode: items.length ? "cart" : "idle",
      items,
      customerName: selectedCustomer?.name,
      currency: "KES",
      subtotal,
      discount: itemDiscountTotal,
      itemDiscountTotal,
      billDiscount: 0,
      tax: 0,
      total: discountedTotal,
      payableTotal: discountedTotal,
      paid: 0,
      outstanding: discountedTotal,
      change: 0,
    });
  }, [cartItems, isTaxIncludedInBasicRate, itemDiscounts, selectedCustomer?.name]);
}