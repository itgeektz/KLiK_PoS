import { useEffect } from "react";
import { useCartStore } from "../stores/cartStore";
import { usePOSProfileStore } from "../stores/posProfileStore";
import { poleDisplayService } from "../services/poleDisplayService";
import { getEffectiveDisplayRate } from "../utils/cartPricing";
import { roundCurrency } from "../utils/currencyMath";

export function usePoleDisplay() {
  const cartItems = useCartStore((state) => state.cartItems);

  const isTaxIncludedInBasicRate = usePOSProfileStore((state) => {
    const value = state.posDetails?.is_tax_included_in_basic_rate;
    return value === 1 || value === "1" || value === true;
  });

  const cartSignature = cartItems
    .map((item) =>
      [
        item.item_code || item.id,
        item.name,
        item.quantity,
        item.price,
        item.total_tax_rate,
        JSON.stringify(item.item_tax_rate || {}),
        JSON.stringify(item.tax_templates || []),
      ].join(":"),
    )
    .join("|");

  useEffect(() => {
    void poleDisplayService.tryReconnect();
  }, []);

  useEffect(() => {
    if (!poleDisplayService.isEnabled()) return;

    const timer = window.setTimeout(() => {
      if (cartItems.length === 0) {
        void poleDisplayService.showIdle();
        return;
      }

      const latestItem = cartItems[0];
      if (!latestItem) return;

      const latestUnitPrice = getEffectiveDisplayRate(latestItem, {
        isTaxIncludedInBasicRate,
      });

      const total = cartItems.reduce((sum, item) => {
        const unitPrice = getEffectiveDisplayRate(item, {
          isTaxIncludedInBasicRate,
        });

        return roundCurrency(
          sum + roundCurrency(unitPrice * Number(item.quantity || 0)),
        );
      }, 0);

      poleDisplayService.showCart(
        latestItem.name || latestItem.item_code || latestItem.id,
        Number(latestItem.quantity || 0),
        latestUnitPrice,
        total,
      );
    }, 80);

    return () => window.clearTimeout(timer);
  }, [cartSignature, isTaxIncludedInBasicRate]);
}