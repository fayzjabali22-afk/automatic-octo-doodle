'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from './use-user-profile';

export function useAdmin() {
  const { profile, isLoading, user } = useUserProfile();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDecisionMade, setIsDecisionMade] = useState(false);

  useEffect(() => {
    // If the main loading process (auth & profile) is finished...
    if (!isLoading) {
      // and if there's no user at all, redirect to login.
      if (!user) {
        router.replace('/admin/login');
        setIsDecisionMade(true);
        return;
      }
      
      // Check for authorization.
      const authorized = profile?.role === 'admin' || profile?.role === 'owner';
      
      if (authorized) {
        // If authorized, confirm admin status.
        setIsAdmin(true);
      } else {
        // If not authorized, redirect them away to the main dashboard.
        router.replace('/dashboard');
      }
      setIsDecisionMade(true);
    }
    // This effect depends on the final loading state and the resulting profile/user data.
  }, [profile, isLoading, user, router]);

  // isLoading is true if the initial data is still loading OR if a final decision (redirect or grant access) hasn't been made.
  // This prevents the protected layout from rendering prematurely.
  return { 
    isLoading: isLoading || !isDecisionMade, 
    isAdmin 
  };
}
