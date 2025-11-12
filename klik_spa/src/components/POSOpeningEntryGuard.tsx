import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePOSOpeningStatus } from '../hooks/usePOSOpeningEntry';
import POSOpeningModal from './PosOpeningEntryDialog';
import erpnextAPI from '../services/erpnext-api';
import { useI18n } from '../hooks/useI18n';

interface CurrentUser {
  name?: string;
  email?: string;
  full_name: string;
  role: string;
  user_image?: string;
}

interface POSOpeningEntryGuardProps {
  children: React.ReactNode;

  excludePaths?: string[];
}

/**
 * Guard component that ensures a POS opening entry exists before allowing access to protected pages.
 * Shows the opening entry modal when no entry is found and blocks access to page content.
 */
export default function POSOpeningEntryGuard({
  children,
  excludePaths = ['/settings', '/login']
}: POSOpeningEntryGuardProps) {
  const { isRTL } = useI18n();
  const location = useLocation();
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check POS opening status
  const {
    hasOpenEntry,
    isLoading: statusLoading,
    error: statusError,
    refetch
  } = usePOSOpeningStatus();

  // Check if current path should be excluded
  const shouldExclude = () => {
    const currentPath = location.pathname;
    return excludePaths.some(path => currentPath.includes(path));
  };

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setUserLoading(true);
        setUserError(null);

        erpnextAPI.initializeSession();

        const userProfile = await erpnextAPI.getCurrentUserProfile();

        if (userProfile) {
          setCurrentUser({
            name: userProfile.name,
            email: userProfile.email || userProfile.name,
            full_name: userProfile.full_name || userProfile.first_name + ' ' + (userProfile.last_name || ''),
            role: userProfile.role_profile_name || 'User',
            user_image: userProfile.user_image
          });
        } else {
          // Fallback to basic user info
          const basicUser = await erpnextAPI.getCurrentUser();
          if (basicUser) {
            setCurrentUser({
              name: basicUser as string,
              email: basicUser as string,
              full_name: basicUser as string,
              role: 'User'
            });
          } else {
            setUserError('No user session found');
          }
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
        setUserError((error as Error).message || 'Failed to fetch user');
      } finally {
        setUserLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  // Refetch opening entry status when route changes
  // This ensures we check for opening entry on every navigation
  useEffect(() => {
    if (shouldExclude()) {
      return;
    }

    // Reset initialization to show loading state while refetching
    setIsInitialized(false);
    refetch();
  }, [location.pathname, refetch]);

  // This helps detect if opening entry was closed from ERPNext while user was away
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const currentPath = location.pathname;
        const isExcluded = excludePaths.some(path => currentPath.includes(path));
        if (!isExcluded) {
          refetch();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch, location.pathname, excludePaths]);

  // Re-check when route changes or opening entry status changes
  useEffect(() => {
    // Skip check if path is excluded
    if (shouldExclude()) {
      setIsInitialized(true);
      setShowOpeningModal(false);
      return;
    }

    // Wait for both status and user to be loaded
    if (statusLoading || userLoading) {
      return;
    }

    if (userError) {
      setIsInitialized(true);
      setShowOpeningModal(false);
      return;
    }

    // Check opening entry status
    if (!statusLoading && !statusError) {
      if (hasOpenEntry === true) {
        // Opening entry exists, allow access
        setShowOpeningModal(false);
        setIsInitialized(true);
      } else {
        setShowOpeningModal(true);
        setIsInitialized(true);
      }
    } else if (statusError) {
      setShowOpeningModal(true);
      setIsInitialized(true); // Set initialized so we can show the modal
    }
  }, [hasOpenEntry, statusLoading, statusError, userLoading, userError, location.pathname]);

  // Handle successful opening entry creation
  const handleOpeningSuccess = () => {
    setShowOpeningModal(false);
    setIsInitialized(true);
    setTimeout(() => {
      refetch();
    }, 500);
  };

  const handleOpeningClose = () => {

  };

  // If path is excluded, render children directly
  if (shouldExclude()) {
    return <>{children}</>;
  }

  // Show loading screen while checking status
  if (statusLoading || userLoading || !isInitialized) {
    return (
      <div className={`min-h-screen bg-gray-50 ${isRTL ? "rtl" : "ltr"} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-beveren-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Initializing POS</h2>
          <p className="text-gray-600">Checking your POS session status...</p>
        </div>
      </div>
    );
  }

  // If no opening entry (false or null), show modal and block access to children
  if (hasOpenEntry !== true) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center pointer-events-none opacity-50">
          {children}
        </div>

        {/* Show opening entry modal */}
        <POSOpeningModal
          isOpen={showOpeningModal}
          onClose={handleOpeningClose}
          onSuccess={handleOpeningSuccess}
          currentUser={currentUser?.name || 'Unknown User'}
        />
      </>
    );
  }

  return <>{children}</>;
}
