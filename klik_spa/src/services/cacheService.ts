/**
 * Cache management service for clearing backend performance caches
 */

export async function clearPerformanceCache(): Promise<{ success: boolean; message: string }> {
  const csrfToken = window.csrf_token;

  try {
    const response = await fetch('/api/method/klik_pos.api.sales_invoice.clear_performance_cache', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Frappe-CSRF-Token': csrfToken
      },
      credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok || !result.message || result.message.success === false) {
      throw new Error(result.message?.message || 'Failed to clear performance cache');
    }

    return result.message;
  } catch (error) {
    console.error('Error clearing performance cache:', error);
    throw error;
  }
}

export async function clearAllCaches(): Promise<void> {
  try {
    // Clear backend performance cache
    await clearPerformanceCache();
    
    // Clear browser cache (if needed)
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }
    
    console.log('All caches cleared successfully');
  } catch (error) {
    console.error('Error clearing caches:', error);
    throw error;
  }
}
