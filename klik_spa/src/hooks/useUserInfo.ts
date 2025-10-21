import { useEffect, useState } from "react";

interface UserInfo {
  user: string;
  full_name: string;
  email: string;
  roles: string[];
  is_admin_user: boolean;
  admin_roles: string[];
  pos_profile: string | null;
  pos_profile_name: string | null;
}

interface UseUserInfoReturn {
  userInfo: UserInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useUserInfo(): UseUserInfoReturn {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserInfo = async () => {
    setIsLoading(true);
    const frontendStartTime = performance.now();
    console.log(`🚀 Frontend: Fetching user info`);

    try {
      const networkStartTime = performance.now();
      const response = await fetch("/api/method/klik_pos.api.user.get_current_user_info", {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
        credentials: "include",
      });
      const networkTime = performance.now();
      console.log(`📊 Frontend: User info network request completed in ${(networkTime - networkStartTime).toFixed(2)}ms`);

      const parseStartTime = performance.now();
      const data = await response.json();
      const parseTime = performance.now();
      console.log(`📊 Frontend: User info JSON parsing completed in ${(parseTime - parseStartTime).toFixed(2)}ms`);

      if (response.ok && data.message?.success) {
        setUserInfo(data.message.data);
        setError(null);
      } else {
        throw new Error(data.message?.error || "Failed to fetch user info");
      }

      const totalFrontendTime = performance.now() - frontendStartTime;
      console.log(`📊 Frontend: TOTAL USER INFO TIME: ${totalFrontendTime.toFixed(2)}ms`);

    } catch (err: any) {
      console.error("Error loading user info:", err);
      setError(err.message || "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  return {
    userInfo,
    isLoading,
    error,
    refetch: fetchUserInfo,
  };
}
