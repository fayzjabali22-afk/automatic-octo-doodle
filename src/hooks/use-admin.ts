'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from './use-user-profile';

export function useAdmin() {
  const { profile, isLoading: isProfileLoading, user, isUserLoading: isAuthLoading } = useUserProfile();
  const router = useRouter();

  // Combined loading state: true if either auth is loading, or if auth is done but profile is still loading.
  const isLoading = isAuthLoading || (user && isProfileLoading);

  useEffect(() => {
    // 1. Do not make any decisions until all loading is complete.
    // This is the most critical part of the fix.
    if (isLoading) {
      return;
    }

    // 2. After loading, if there's no user at all, they must log in to the admin portal.
    if (!user) {
      router.replace('/admin/login');
      return;
    }

    // 3. After loading, if there IS a user, we must also have their profile to check authorization.
    if (profile) {
      const isAuthorized = profile.role === 'admin' || profile.role === 'owner';
      if (!isAuthorized) {
        // This user is logged in but is NOT an admin. Redirect them away.
        router.replace('/dashboard');
      }
      // If they are authorized, do nothing. Let them view the admin page.
    } else {
      // This is the edge case where loading is finished, a user exists, but the
      // profile document is missing from Firestore. This is an invalid state for
      // any user, especially an admin. Redirecting is a safe fallback.
      router.replace('/dashboard');
    }
    
  }, [user, profile, isLoading, router]);

  return { 
    isLoading, 
    isAdmin: !!(profile && (profile.role === 'admin' || profile.role === 'owner'))
  };
}
