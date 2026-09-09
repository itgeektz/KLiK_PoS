import { useEffect } from "react";
import { useCartStore } from "../stores/cartStore";
import { customerDisplayService } from "../services/customerDisplayService";

export function useCustomerDisplay() {
  const cartItems = useCartStore((state) => state.cartItems);
  const selectedCustomer = useCartStore((state) => state.selectedCustomer);

  useEffect(() => {
    const items = cartItems.map((item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.price || 0);
      return {
        id: item.item_code || item.id,
        name: item.name,
        quantity,
        uom: item.uom,
        unitPrice,
        lineTotal: unitPrice * quantity,
      };
    });
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

    customerDisplayService.publish({
      mode: items.length ? "cart" : "idle",
      items,
      customerName: selectedCustomer?.name,
      currency: "KES",
      subtotal,
      discount: 0,
      tax: 0,
      total: subtotal,
      payableTotal: subtotal,
      paid: 0,
      outstanding: subtotal,
      change: 0,
    });
  }, [cartItems, selectedCustomer?.name]);
}