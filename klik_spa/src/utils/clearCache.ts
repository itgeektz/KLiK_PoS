import { useCartStore } from '../stores/cartStore';
import { clearDraftInvoiceCache } from './draftInvoiceCache';
import { clearPerformanceCache } from '../services/cacheService';

// Cache keys used throughout the application
const CACHE_KEYS = {
  PRODUCTS: 'klik_pos_products_cache',
  PRODUCTS_EXPIRY: 'klik_pos_products_cache_expiry',
  DRAFT_INVOICE: 'draft-invoice-cache',
  CART: 'beveren-cart-storage',
  // Add other cache keys as needed
};

/**
 * Clears all application cache including:
 * - Product cache
 * - Cart cache
 * - Draft invoice cache
 * - Backend performance cache
 * - Any other localStorage items related to the app
 */
export async function clearAllCache(): Promise<void> {
  try {
    console.log('🧹 Clearing all application cache...');

    // Clear backend performance cache first
    try {
      await clearPerformanceCache();
      console.log('✅ Backend performance cache cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear backend cache:', error);
      // Continue with frontend cache clearing even if backend fails
    }

    // Clear product cache
    localStorage.removeItem(CACHE_KEYS.PRODUCTS);
    localStorage.removeItem(CACHE_KEYS.PRODUCTS_EXPIRY);
    console.log('✅ Product cache cleared');

    // Clear draft invoice cache
    clearDraftInvoiceCache();
    console.log('✅ Draft invoice cache cleared');

    // Clear cart cache
    localStorage.removeItem(CACHE_KEYS.CART);
    console.log('✅ Cart cache cleared');

    // Clear cart state in memory
    const { clearCart } = useCartStore.getState();
    clearCart();
    console.log('✅ Cart state cleared');

    // Clear any other app-related localStorage items
    // (excluding theme, language, and other user preferences)
    const keysToKeep = [
      'theme',
      'language',
      'i18n',
      'auth-token',
      'user-session',
      // Add other keys to preserve
    ];

    const allKeys = Object.keys(localStorage);
    const appKeys = allKeys.filter(key =>
      key.startsWith('klik_pos_') ||
      key.startsWith('beveren-') ||
      key.startsWith('draft-') ||
      (key.includes('cache') && !keysToKeep.includes(key))
    );

    appKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`✅ Cleared cache key: ${key}`);
    });

    console.log('🎉 All cache cleared successfully!');

  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    throw error;
  }
}

/**
 * Clears cache and reloads the page to ensure fresh data
 */
export function clearCacheAndReload(): void {
  try {
    clearAllCache();

    // Show a brief message before reload
    console.log('🔄 Reloading page with fresh data...');

    // Reload the page after a short delay to ensure cache is cleared
    setTimeout(() => {
      window.location.reload();
    }, 100);

  } catch (error) {
    console.error('❌ Error during cache clear and reload:', error);
    // Still reload even if there was an error
    window.location.reload();
  }
}
