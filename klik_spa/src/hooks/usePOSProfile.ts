// hooks/usePOSProfiles.ts
import { useEffect } from 'react';
import { usePOSProfileStore, type POSDetails, type POSCompanyDetails } from '../stores/posProfileStore';

interface UsePOSProfilesReturn {
  posDetails: POSDetails | null;
  loading: boolean;
  error: string | null;
  useScannerOnly: boolean;
  hideUnavailableItems: boolean;
  scalePrefix: string;
  defaultView: 'grid' | 'list';
  currencySymbol: string;
  currency: string;
  businessType: string;
  isZatcaEnabled: boolean;
  refresh: () => Promise<void>;
  clearCache: () => void;
}

export function usePOSProfiles(): UsePOSProfilesReturn {
  const {
    posDetails,
    useScannerOnly,
    hideUnavailableItems,
    scalePrefix,
    defaultView,
    currencySymbol,
    currency,
    businessType,
    isZatcaEnabled,
    isLoading: loading,
    error,
    isInitialized,
    fetchPOSDetails,
    clearCache,
  } = usePOSProfileStore();

  useEffect(() => {
    if (!isInitialized && !posDetails) {
      fetchPOSDetails();
    }
  }, [isInitialized, posDetails, fetchPOSDetails]);

  return {
    posDetails,
    loading,
    error,
    useScannerOnly,
    hideUnavailableItems,
    scalePrefix,
    defaultView,
    currencySymbol,
    currency,
    businessType,
    isZatcaEnabled,
    refresh: () => fetchPOSDetails(true),
    clearCache,
  };
}

// Re-export types for backward compatibility
export type { POSDetails, POSCompanyDetails };