'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/data';

/**
 * Hook to get the full user profile data from Firestore.
 * It combines the auth user from `useUser` with their corresponding
 * document in the 'users' collection.
 *
 * @returns An object containing the user's profile data and loading state.
 */
export function useUserProfile() {
  const { user, isUserLoading: isAuthLoading, userError } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);

  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useDoc<UserProfile>(userProfileRef);

  const isLoading = isAuthLoading || isProfileLoading;

  return {
    user,
    profile,
    isLoading,
    error: userError || profileError,
  };
}
