
'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  UserCredential,
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


/** Initiate email/password sign-up and create user profile document. Returns UserCredential on success. */
export async function initiateEmailSignUp(
    auth: Auth, 
    firestore: Firestore,
    email: string, 
    password: string,
    profileData: UserProfileCreation,
    signOutAfter: boolean = true // This parameter is no longer used but kept for compatibility
): Promise<UserCredential | null> {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (!user) {
             toast({
                variant: "destructive",
                title: "فشل إنشاء الحساب",
                description: "لم يتم إرجاع بيانات المستخدم بعد الإنشاء.",
            });
            return null;
        }
        
        const userRef = doc(firestore, 'users', user.uid);
        const finalProfileData = { 
            ...profileData, 
            role: profileData.role || 'traveler', 
            createdAt: serverTimestamp(), 
            updatedAt: serverTimestamp() 
        };
        await setDoc(userRef, finalProfileData);
        
        // The user is now signed in after creation.
        return userCredential;

    } catch (authError: any) {
        let description = "حدث خطأ غير متوقع أثناء إنشاء الحساب.";
        if (authError.code === 'auth/email-already-in-use') {
            description = "هذا البريد الإلكتروني مسجل بالفعل. الرجاء تسجيل الدخول بدلاً من ذلك.";
        } else if (authError.code === 'auth/weak-password') {
            description = "كلمة المرور ضعيفة جدًا. يجب أن تتكون من 6 أحرف على الأقل."
        }
        toast({
            variant: "destructive",
            title: "فشل إنشاء الحساب",
            description: description,
        });
        return null;
    }
}


/** Initiate email/password sign-in (non-blocking). Returns UserCredential on success, null on failure. */
export async function initiateEmailSignIn(authInstance: Auth, email: string, password: string): Promise<UserCredential | null> {
  try {
    const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
    return userCredential;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
         toast({
            variant: "destructive",
            title: "فشل تسجيل الدخول",
            description: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
        });
    } else {
        toast({
            variant: "destructive",
            title: "فشل تسجيل الدخول",
            description: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
        });
    }
    return null;
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
        role: 'traveler' // Default role for new Google sign-ups
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
