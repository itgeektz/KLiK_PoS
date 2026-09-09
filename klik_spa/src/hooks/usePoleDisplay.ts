import { useEffect } from "react";
import { useCartStore } from "../stores/cartStore";
import { poleDisplayService } from "../services/poleDisplayService";

export function usePoleDisplay() {
  const cartItems = useCartStore((state) => state.cartItems);

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

      const lastItem = cartItems[cartItems.length - 1];
      if (!lastItem) return;
      const total = cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
      poleDisplayService.showCart(
        lastItem.name || lastItem.item_code || lastItem.id,
        Number(lastItem.quantity || 0),
        Number(lastItem.price || 0),
        total,
      );
    }, 80);

    return () => window.clearTimeout(timer);
  }, [cartItems]);
}