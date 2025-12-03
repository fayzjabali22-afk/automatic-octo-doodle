
'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { Firestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/data';
import { actionCodeSettings } from './config';

/** Initiate anonymous sign-in (non-blocking). */
export async function initiateAnonymousSignIn(authInstance: Auth): Promise<boolean> {
  try {
    await signInAnonymously(authInstance);
    return true;
  } catch (error) {
    toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "Could not sign you in as a guest.",
    });
    return false;
  }
}

type UserProfileCreation = Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>;


/** Initiate email/password sign-up and create user profile document. Returns boolean for success. */
export async function initiateEmailSignUp(
    auth: Auth, 
    firestore: Firestore,
    email: string, 
    password: string,
    profileData: UserProfileCreation,
    signOutAfter: boolean = true
): Promise<boolean> {
    let user;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;

        if (!user) {
             toast({
                variant: "destructive",
                title: "Account Creation Failed",
                description: "No user data returned after creation.",
            });
            return false;
        }
    } catch (authError: any) {
        let description = "An unexpected error occurred during account creation.";
        if (authError.code === 'auth/email-already-in-use') {
            description = "This email is already registered. Please log in instead.";
        } else if (authError.code === 'auth/weak-password') {
            description = "The password is too weak. It must be at least 6 characters long."
        }
        toast({
            variant: "destructive",
            title: "Account Creation Failed",
            description: description,
        });
        return false;
    }

    try {
        const userRef = doc(firestore, 'users', user.uid);
        await setDoc(userRef, { ...profileData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } catch (firestoreError: any) {
        toast({
            variant: "destructive",
            title: "Profile Save Failed",
            description: firestoreError.message || "Could not save your profile data.",
        });
        // Note: The user account was created, but profile failed. 
        // Depending on requirements, you might want to delete the user here.
        // For now, we'll let it be.
        return false;
    }

    try {
        await sendEmailVerification(user, actionCodeSettings);
        if (signOutAfter) {
            toast({
                title: 'Final Step!',
                description: 'A verification email has been sent to activate your account.',
                duration: 8000,
            });
        }
    } catch (emailError: any) {
         toast({
            variant: "destructive",
            title: "Failed to Send Verification Email",
            description: "Your account was created, but sending the verification email failed. You can log in and request it again from your profile page.",
            duration: 10000
        });
    }

    if (signOutAfter) {
        await auth.signOut();
    }
    
    return true;
}


/** Initiate email/password sign-in (non-blocking). Returns a boolean indicating success. */
export async function initiateEmailSignIn(authInstance: Auth, email: string, password: string): Promise<boolean> {
  try {
    await signInWithEmailAndPassword(authInstance, email, password);
    return true;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
         // This is a common case for the guest login flow, so we don't show a toast.
         // The calling function will handle the next step (e.g., creating the account).
    } else {
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: "An unexpected error occurred. Please try again.",
        });
    }
    return false;
  }
}

/** Initiate Google Sign-In flow. Returns a boolean indicating success. */
export async function initiateGoogleSignIn(auth: Auth, firestore: Firestore): Promise<boolean> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(firestore, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const [firstName, ...lastNameParts] = (user.displayName || '').split(' ');
      const newUserProfile: UserProfileCreation = {
        firstName: firstName || '',
        lastName: lastNameParts.join(' '),
        email: user.email!,
        phoneNumber: user.phoneNumber || '',
      };
      await setDoc(userRef, { ...newUserProfile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    
    return true;
  } catch (error: any) {
    if (error.code === 'auth/operation-not-allowed') {
        toast({
            variant: 'destructive',
            title: 'Configuration Error',
            description: 'Google Sign-In is not enabled. Please check Firebase settings.',
        });
    } else {
        toast({
          variant: 'destructive',
          title: 'Google Sign-In Failed',
          description: error.message || 'An unexpected error occurred. Please try again.',
        });
    }
    return false;
  }
}
