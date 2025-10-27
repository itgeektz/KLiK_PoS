import { useEffect, useState } from "react";

interface PaymentMode {
  mode_of_payment: string;
  default: number;
  amount?: number;
  type?: string;
  account?: string;
  custom_currency?: string;
}

export function usePaymentModes(posProfile: string) {
  const [modes, setModes] = useState<PaymentMode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!posProfile) {
      console.log('[usePaymentModes] No profile provided, skipping fetch');
      return;
    }

    const fetchPaymentModes = async () => {
      console.log('[usePaymentModes] Fetching payment modes for profile:', posProfile);
      setIsLoading(true);
      try {
        const res = await fetch(`/api/method/klik_pos.api.payment.get_payment_modes?pos_profile=${encodeURIComponent(posProfile)}`);
        const data = await res.json();
        console.log('[usePaymentModes] API Response:', data);

        if (!data.message.success) {
          throw new Error(data.message.error || "Failed to fetch payment modes");
        }

        const modesData = data.message.data || [];
        console.log('[usePaymentModes] Setting modes:', modesData);
        setModes(modesData);
        setError(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error('[usePaymentModes] Error:', err);
        setError(err.message);
        setModes([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentModes();
  }, [posProfile]);

  return { modes, isLoading, error };
}

export function useAllPaymentModes() {
  const [modes, setModes] = useState<PaymentMode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {

    const fetchPaymentModes = async () => {
      setIsLoading(true);
      const frontendStartTime = performance.now();
      console.log(`🚀 Frontend: Fetching payment modes summary`);

      try {
        const networkStartTime = performance.now();
        const res = await fetch(`/api/method/klik_pos.api.payment.get_opening_entry_payment_summary`);
        const networkTime = performance.now();

        const parseStartTime = performance.now();
        const data = await res.json();
        const parseTime = performance.now();

        if (!data.message.data) {
          throw new Error(data.message.error || "Failed to fetch payment modes");
        }

        setModes(data.message.data || []);
        setError(null);

        const totalFrontendTime = performance.now() - frontendStartTime;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setError(err.message);
        setModes([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentModes();
  }, []);

  return { modes, isLoading, error };
}
