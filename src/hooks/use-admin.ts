'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from './use-user-profile';

export function useAdmin() {
  const { profile, isLoading: isProfileLoading, user, isUserLoading: isAuthLoading } = useUserProfile();
  const router = useRouter();

  const isLoading = isAuthLoading || (user && isProfileLoading);

  useEffect(() => {
    // 1. Do not make any decisions until all loading is complete.
    if (isLoading) {
      return;
    }

    // 2. After loading, if there's no user at all, they must log in.
    if (!user) {
      router.replace('/admin/login');
      return;
    }

    // 3. After loading, if there IS a user but the profile still hasn't loaded (or doesn't exist),
    // we can't determine the role, so we do nothing and wait. This case shouldn't happen
    // if `isLoading` is correctly calculated, but it's a safeguard.
    // The CRITICAL check is `if (profile)`, which happens next.
    if (!profile) {
      // This might happen for a split second. Waiting is key.
      // If the user exists but has no profile doc, they'll be stuck on loading,
      // which is a separate data integrity issue. For now, we just wait.
      return;
    }

    // 4. ONLY NOW, after loading is done and we have a profile, we check authorization.
    const isAuthorized = profile.role === 'admin' || profile.role === 'owner';
    if (!isAuthorized) {
      router.replace('/dashboard'); // Redirect unauthorized users away.
    }
    
  }, [user, profile, isLoading, router]);

  // The consuming layout should show a loading screen as long as this is true.
  // This ensures we don't render the admin layout for a non-admin user even for a flash.
  return { 
    isLoading: isLoading, 
    isAdmin: !!(profile && (profile.role === 'admin' || profile.role === 'owner'))
  };
}
