import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, GiftCoupon } from '../../types'
import type { Customer } from '../types/customer'
import { toast } from 'react-toastify'
import { clearDraftInvoiceCache } from '../utils/draftInvoiceCache'
import { updateItemPricesForCustomer, getItemPriceForCustomer, applyPricingRulesToCart } from '../services/dynamicPricing'

interface CartState {
  cartItems: CartItem[]
  appliedCoupons: GiftCoupon[]
  selectedCustomer: Customer | null

  // Actions
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

        // Check if item has available quantity
        if (item.available !== undefined && item.available <= 0) {
          toast.error(`${item.name} is out of stock`);
          return;
        }

        if (existingItem) {
          // Check if adding one more would exceed available stock
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
          // New item - fetch correct price if customer is selected
          let finalPrice = item.price;

          if (state.selectedCustomer) {
            try {
              // Pass the item's UOM to ensure we get the price for the correct UOM
              const priceInfo = await getItemPriceForCustomer(item.id, state.selectedCustomer.id, item.uom);
              if (priceInfo.success) {
                finalPrice = priceInfo.price;
              }
            } catch (error) {
              console.error('❌ Error fetching price for customer:', error);
              // Continue with original price if API fails
            }
          }

          const newCartItems = [...state.cartItems, { ...item, price: finalPrice, quantity: 1 }];

          set((state) => ({
            cartItems: newCartItems
          }));

          // Apply pricing rules after adding item
          const stateAfterAdd = get();
          if (stateAfterAdd.cartItems.length > 0) {
            await stateAfterAdd.applyPricingRules();
          }
        }
      },

      addToCartWithQuantity: async (item, quantity) => {
        const state = get();
        const existingItem = state.cartItems.find((cartItem) => cartItem.id === item.id);

        // Check if item has available quantity
        if (item.available !== undefined && item.available < quantity) {
          toast.error(`Only ${item.available} ${item.uom || 'units'} of ${item.name} available`);
          return;
        }

        if (existingItem) {
          // Check if adding the quantity would exceed available stock
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
          // New item - fetch correct price if customer is selected
          let finalPrice = item.price;

          if (state.selectedCustomer) {
            try {
              // Pass the item's UOM to ensure we get the price for the correct UOM
              const priceInfo = await getItemPriceForCustomer(item.id, state.selectedCustomer.id, item.uom);
              if (priceInfo.success) {
                finalPrice = priceInfo.price;
              }
            } catch (error) {
              console.error('❌ Error fetching price for customer:', error);
              // Continue with original price if API fails
            }
          }

          const newCartItems = [...state.cartItems, { ...item, price: finalPrice, quantity }];

          set((state) => ({
            cartItems: newCartItems
          }));

          // Apply pricing rules after adding item
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
          // Apply pricing rules after removing item (quantities changed)
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

        // Apply pricing rules after quantity change (pricing rules can be quantity-based)
        const stateAfterUpdate = get();
        if (stateAfterUpdate.cartItems.length > 0) {
          await stateAfterUpdate.applyPricingRules();
        }
      },

      updateUOM: async (id, uom, price) => {
        console.log(`🏪 Cart Store: Updating UOM for item ${id} to ${uom} with price ${price}`);
        set((state) => {
          const updatedItems = state.cartItems.map((item) => {
            if (item.id === id) {
              console.log(`🏪 Cart Store: Item ${id} updated:`, {
                before: { uom: item.uom, price: item.price },
                after: { uom, price }
              });
              return { ...item, uom, price };
            }
            return item;
          });
          console.log(`🏪 Cart Store: All items after update:`, updatedItems);
          return { cartItems: updatedItems };
        });

        // Apply pricing rules after UOM change (pricing rules can be UOM-specific)
        const stateAfterUpdate = get();
        if (stateAfterUpdate.cartItems.length > 0) {
          await stateAfterUpdate.applyPricingRules();
        }
      },

      removeItem: (id) => set((state) => ({
        cartItems: state.cartItems.filter((item) => item.id !== id)
      })),

      clearCart: () => {
        // Clear draft invoice cache when clearing cart
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

        // Apply pricing rules when customer changes (pricing rules can be customer-specific)
        const state = get();
        if (state.cartItems.length > 0) {
          await state.updatePricesForCustomer(customer?.id);
        }
      },

      updatePricesForCustomer: async (customerId) => {
        const state = get();
        if (state.cartItems.length === 0) return;

        try {
          // First get base prices for items
          const priceUpdates = await updateItemPricesForCustomer(state.cartItems, customerId);

          // Update cart items with new base prices
          let updatedItems = state.cartItems.map(item => {
            const priceUpdate = priceUpdates[item.id];
            if (priceUpdate && priceUpdate.success) {
              return { ...item, price: priceUpdate.price };
            }
            return item;
          });

          // Then apply pricing rules to get discounted prices
          const itemsWithPricingRules = await applyPricingRulesToCart(updatedItems, customerId);

          // Update cart with pricing rule results
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
          console.error('❌ Error updating prices for customer:', error);
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
          console.error('❌ Error applying pricing rules:', error);
        }
      }
    }),
    {
      name: 'beveren-cart-storage'
    }
  )
)
