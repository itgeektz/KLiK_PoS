import { useEffect } from "react";
import { useCartStore } from "../stores/cartStore";
import { poleDisplayService } from "../services/poleDisplayService";

export function usePoleDisplay() {
  const cartItems = useCartStore((state) => state.cartItems);

  useEffect(() => {
    void poleDisplayService.tryReconnect();
  }, []);

    const cartSignature = cartItems
    .map((item) => [
      item.item_code || item.id,
      item.name,
      item.quantity,
      item.price,
    ].join(":"))
    .join("|");

  useEffect(() => {
    if (!poleDisplayService.isEnabled()) return;

    const timer = window.setTimeout(() => {
      if (cartItems.length === 0) {
        void poleDisplayService.showIdle();
        return;
      }

      const latestItem = cartItems[0];
      if (!latestItem) return;

      const total = cartItems.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
        0
      );

      poleDisplayService.showCart(
        latestItem.name || latestItem.item_code || latestItem.id,
        Number(latestItem.quantity || 0),
        Number(latestItem.price || 0),
        total,
      );
    }, 80);

    return () => window.clearTimeout(timer);
  }, [cartSignature]);
}