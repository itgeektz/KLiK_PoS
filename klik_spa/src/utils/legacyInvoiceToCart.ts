// utils/legacyInvoiceToCart.ts
// Re-creates an old-system bill as a fresh POS cart, the same "resume into cart"
// idiom the app already uses for draft invoices (see draftInvoiceToCart.ts /
// draftInvoiceCache.ts). We deliberately reuse that cache + loadCachedItemsToCart
// mechanism rather than pushing straight into cartStore, so the existing
// "review before checkout" flow works unchanged for legacy bills too.

import { resolveLegacyInvoiceForCart } from "../services/legacyInvoice";
import { cacheDraftInvoiceItems, loadCachedItemsToCart } from "./draftInvoiceCache";
import { toast } from "react-toastify";
import { extractErrorFromException } from "./errorExtraction";
import type { CartItem as RootCartItem } from "../../types";
import type { Customer } from "../types/customer";
import type { CartItem } from "./draftInvoiceToCart";

export interface LegacyCartResult {
  success: boolean;
  matchedCount: number;
  totalCount: number;
  unmatchedNames: string[];
}

/**
 * Resolve `legacyInvoiceName` against the current Item catalog and load it into
 * the cart (replacing whatever is currently in it -- same behaviour as resuming
 * a draft invoice). `customer`, when known (the customer whose profile page this
 * was opened from), is pre-selected on the cart; pass null for a bill reached via
 * the unmatched-customer search screen and let the cashier pick one at checkout.
 */
export async function addLegacyInvoiceToCart(
  legacyInvoiceName: string,
  customer: Customer | null,
): Promise<LegacyCartResult> {
  try {
    const { data } = await resolveLegacyInvoiceForCart(legacyInvoiceName);

    if (!data.items.length) {
      toast.error("This old bill has no line items to add.");
      return { success: false, matchedCount: 0, totalCount: 0, unmatchedNames: [] };
    }

    const cartItems: CartItem[] = data.items.map((line, index) => ({
      // A legacy line without a catalog match still needs a stable-but-unique cart
      // row id; it has no real item_code so the cart treats it as a manual line.
      id: line.item_code ? `${line.item_code}-legacy-${index}` : `legacy-manual-${legacyInvoiceName}-${index}`,
      item_code: line.item_code || undefined,
      name: line.item_name,
      category: "General",
      price: Number(line.rate) || 0,
      original_price: Number(line.rate) || 0,
      image: line.image || "",
      quantity: Number(line.qty) || 1,
      uom: line.uom || "Nos",
    }));

    cacheDraftInvoiceItems(`LEGACY-${legacyInvoiceName}`, cartItems as RootCartItem[], customer);
    await loadCachedItemsToCart();

    const unmatchedNames = data.items.filter((l) => !l.matched).map((l) => l.legacy_item_name);

    if (unmatchedNames.length) {
      toast.warning(
        `Loaded ${data.matched_lines}/${data.total_lines} items from the old bill. ` +
        `${unmatchedNames.length} item(s) weren't found in your current catalog and were added as manual lines -- please check price/qty before checkout.`,
      );
    } else {
      toast.success(`Loaded all ${data.total_lines} items from the old bill into the cart.`);
    }

    return {
      success: true,
      matchedCount: data.matched_lines,
      totalCount: data.total_lines,
      unmatchedNames,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error loading legacy invoice into cart:", error);
    const message = extractErrorFromException(error, "Failed to load old bill into cart");
    toast.error(message);
    return { success: false, matchedCount: 0, totalCount: 0, unmatchedNames: [] };
  }
}
