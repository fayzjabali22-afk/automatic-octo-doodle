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

    // 3. After loading, if there IS a user, we must check their profile authorization.
    // If the profile exists, check the role.
    if (profile) {
        const isAuthorized = profile.role === 'admin' || profile.role === 'owner';
        if (!isAuthorized) {
            // This user is logged in but is not an admin, redirect them away.
            router.replace('/dashboard');
        }
        // If they are authorized, do nothing and let them see the admin page.
    } else {
        // This case means loading is finished, a user is logged in, but there is NO
        // profile document in Firestore. This is an invalid state for an admin.
        // Redirect them to a safe place.
        router.replace('/dashboard');
    }
    
  }, [user, profile, isLoading, router]);

  // The consuming layout should show a loading screen as long as this is true.
  // This ensures we don't render the admin layout for a non-admin user even for a flash.
  return { 
    isLoading: isLoading, 
    isAdmin: !!(profile && (profile.role === 'admin' || profile.role === 'owner'))
  };
}
