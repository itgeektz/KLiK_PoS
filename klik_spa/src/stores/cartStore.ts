import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, GiftCoupon } from '../../types'
import type { Customer } from '../types/customer'
import { toast } from 'react-toastify'
import { clearDraftInvoiceCache } from '../utils/draftInvoiceCache'
import { updateItemPricesForCustomer, getItemPriceForCustomer, applyPricingRulesToCart } from '../services/dynamicPricing'

interface SerialBatchEntry {
  serial_no?: string;
  batch_no?: string;
  qty?: number;
}

interface CartState {
  cartItems: CartItem[]
  appliedCoupons: GiftCoupon[]
  selectedCustomer: Customer | null

  addToCart: (item: Omit<CartItem, 'quantity'>) => Promise<void>
  addToCartWithQuantity: (item: Omit<CartItem, 'quantity'>, quantity: number) => Promise<void>
  updateQuantity: (id: string, quantity: number) => Promise<void>
  updateUOM: (id: string, uom: string, price: number) => Promise<void>
  removeItem: (id: string) => void
  clearCart: () => void
  applyCoupon: (coupon: GiftCoupon) => void
  removeCoupon: (couponCode: string) => void
  setSelectedCustomer: (customer: Customer | null) => Promise<void>
  updatePricesForCustomer: (customerId?: string) => Promise<void>
  applyPricingRules: () => Promise<void>
  updateItemBundleEntries: (id: string, entries: SerialBatchEntry[]) => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cartItems: [],
      appliedCoupons: [],
      selectedCustomer: null,

      addToCart: async (item) => {
        const state = get();
        const existingItem = state.cartItems.find((cartItem) => cartItem.id === item.id);

        if (item.available !== undefined && item.available <= 0) {
          toast.error(`${item.name} is out of stock`);
          return;
        }

        if (existingItem) {
          if (item.available !== undefined && existingItem.quantity >= item.available) {
            toast.error(`Only ${item.available} ${item.uom || 'units'} of ${item.name} available`);
            return;
          }

          set((state) => ({
            cartItems: state.cartItems.map((cartItem) =>
              cartItem.id === item.id
                ? { ...cartItem, quantity: cartItem.quantity + 1 }
                : cartItem
            )
          }));
        } else {
          let finalPrice = item.price;

          if (state.selectedCustomer) {
            try {
              const priceInfo = await getItemPriceForCustomer(item.id, state.selectedCustomer.id, item.uom);
              if (priceInfo.success) {
                finalPrice = priceInfo.price;
              }
            } catch (error) {
              console.error('Error fetching price for customer:', error);
            }
          }

          const newCartItems = [...state.cartItems, { 
            ...item, 
            price: finalPrice, 
            quantity: 1,
            bundle_entries: []
          }];

          set((state) => ({
            cartItems: newCartItems
          }));

          const stateAfterAdd = get();
          if (stateAfterAdd.cartItems.length > 0) {
            await stateAfterAdd.applyPricingRules();
          }
        }
      },

      addToCartWithQuantity: async (item, quantity) => {
        const state = get();
        const existingItem = state.cartItems.find((cartItem) => cartItem.id === item.id);

        if (item.available !== undefined && item.available < quantity) {
          toast.error(`Only ${item.available} ${item.uom || 'units'} of ${item.name} available`);
          return;
        }

        if (existingItem) {
          if (item.available !== undefined && (existingItem.quantity + quantity) > item.available) {
            toast.error(`Only ${item.available} ${item.uom || 'units'} of ${item.name} available`);
            return;
          }

          set((state) => ({
            cartItems: state.cartItems.map((cartItem) =>
              cartItem.id === item.id
                ? { ...cartItem, quantity: cartItem.quantity + quantity }
                : cartItem
            )
          }));
        } else {
          let finalPrice = item.price;

          if (state.selectedCustomer) {
            try {
              const priceInfo = await getItemPriceForCustomer(item.id, state.selectedCustomer.id, item.uom);
              if (priceInfo.success) {
                finalPrice = priceInfo.price;
              }
            } catch (error) {
              console.error('Error fetching price for customer:', error);
            }
          }

          const newCartItems = [...state.cartItems, { 
            ...item, 
            price: finalPrice, 
            quantity,
            bundle_entries: []
          }];

          set((state) => ({
            cartItems: newCartItems
          }));

          const stateAfterAdd = get();
          if (stateAfterAdd.cartItems.length > 0) {
            await stateAfterAdd.applyPricingRules();
          }
        }
      },

      updateQuantity: async (id, quantity) => {
        const state = get();
        if (quantity <= 0) {
          set({
            cartItems: state.cartItems.filter((item) => item.id !== id)
          });
          const stateAfterUpdate = get();
          if (stateAfterUpdate.cartItems.length > 0) {
            await stateAfterUpdate.applyPricingRules();
          }
          return;
        }

        const item = state.cartItems.find((cartItem) => cartItem.id === id);
        if (item && item.available !== undefined && quantity > item.available) {
          toast.error(`Only ${item.available} ${item.uom || 'units'} of ${item.name} available`);
          return;
        }

        set({
          cartItems: state.cartItems.map((item) =>
            item.id === id ? { ...item, quantity } : item
          )
        });

        const stateAfterUpdate = get();
        if (stateAfterUpdate.cartItems.length > 0) {
          await stateAfterUpdate.applyPricingRules();
        }
      },

      updateUOM: async (id, uom, price) => {
        set((state) => ({
          cartItems: state.cartItems.map((item) => {
            if (item.id === id) {
              return { ...item, uom, price };
            }
            return item;
          })
        }));

        const stateAfterUpdate = get();
        if (stateAfterUpdate.cartItems.length > 0) {
          await stateAfterUpdate.applyPricingRules();
        }
      },

      removeItem: (id) => set((state) => ({
        cartItems: state.cartItems.filter((item) => item.id !== id)
      })),

      clearCart: () => {
        clearDraftInvoiceCache();
        set(() => ({
          cartItems: [],
          appliedCoupons: [],
          selectedCustomer: null
        }));
      },

      applyCoupon: (coupon) => set((state) => {
        if (!state.appliedCoupons.some((c) => c.code === coupon.code)) {
          return {
            appliedCoupons: [...state.appliedCoupons, coupon]
          }
        }
        return state
      }),

      removeCoupon: (couponCode) => set((state) => ({
        appliedCoupons: state.appliedCoupons.filter((coupon) => coupon.code !== couponCode)
      })),

      setSelectedCustomer: async (customer) => {
        set(() => ({
          selectedCustomer: customer
        }));

        const state = get();
        if (state.cartItems.length > 0) {
          await state.updatePricesForCustomer(customer?.id);
        }
      },

      updatePricesForCustomer: async (customerId) => {
        const state = get();
        if (state.cartItems.length === 0) return;

        try {
          const priceUpdates = await updateItemPricesForCustomer(state.cartItems, customerId);

          let updatedItems = state.cartItems.map(item => {
            const priceUpdate = priceUpdates[item.id];
            if (priceUpdate && priceUpdate.success && priceUpdate.price > 0) {
              const currentPrice = item.price || 0;
              const newPrice = priceUpdate.price;

              if (item.uom && currentPrice > 0) {
                if (newPrice < currentPrice * 0.5 && currentPrice > 10) {
                  return item;
                }
              }

              return { ...item, price: newPrice };
            }
            return item;
          });

          const itemsWithPricingRules = await applyPricingRulesToCart(updatedItems, customerId);

          set((state) => ({
            cartItems: state.cartItems.map(item => {
              const pricingRuleItem = itemsWithPricingRules.find(prItem => prItem.id === item.id);
              if (pricingRuleItem) {
                return {
                  ...item,
                  price: pricingRuleItem.price,
                  original_price: pricingRuleItem.original_price || item.price,
                  discount_percentage: pricingRuleItem.discount_percentage,
                  discount_amount: pricingRuleItem.discount_amount,
                  pricing_rules: pricingRuleItem.pricing_rules,
                  has_pricing_rule: pricingRuleItem.has_pricing_rule,
                };
              }
              return item;
            })
          }));

        } catch (error) {
          console.error('Error updating prices for customer:', error);
          toast.error('Failed to update prices for customer');
        }
      },

      applyPricingRules: async () => {
        const state = get();
        if (state.cartItems.length === 0) return;

        try {
          const customerId = state.selectedCustomer?.id;
          const itemsWithPricingRules = await applyPricingRulesToCart(state.cartItems, customerId);

          set((state) => ({
            cartItems: state.cartItems.map(item => {
              const pricingRuleItem = itemsWithPricingRules.find(prItem => prItem.id === item.id);
              if (pricingRuleItem) {
                const currentPrice = item.price || 0;
                const newPrice = pricingRuleItem.price || 0;

                if (!pricingRuleItem.has_pricing_rule && item.uom && currentPrice > 0 && newPrice > 0) {
                  if (newPrice < currentPrice * 0.5 && currentPrice > 10) {
                    return {
                      ...item,
                      price: currentPrice,
                      original_price: pricingRuleItem.original_price || currentPrice,
                      discount_percentage: pricingRuleItem.discount_percentage,
                      discount_amount: pricingRuleItem.discount_amount,
                      pricing_rules: pricingRuleItem.pricing_rules,
                      has_pricing_rule: pricingRuleItem.has_pricing_rule,
                    };
                  }
                }

                return {
                  ...item,
                  price: newPrice,
                  original_price: pricingRuleItem.original_price || item.price,
                  discount_percentage: pricingRuleItem.discount_percentage,
                  discount_amount: pricingRuleItem.discount_amount,
                  pricing_rules: pricingRuleItem.pricing_rules,
                  has_pricing_rule: pricingRuleItem.has_pricing_rule,
                };
              }
              return item;
            })
          }));
        } catch (error) {
          console.error('Error applying pricing rules:', error);
        }
      },

      updateItemBundleEntries: (id: string, entries: SerialBatchEntry[]) => {
        set((state) => ({
          cartItems: state.cartItems.map((item) =>
            item.id === id
              ? { ...item, bundle_entries: entries }
              : item
          )
        }));
      },
    }),
    {
      name: 'beveren-cart-storage'
    }
  )
)