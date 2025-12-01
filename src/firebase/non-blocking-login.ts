
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
import { Firestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/data';
import { actionCodeSettings } from './config';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance).catch((error) => {
    toast({
        variant: "destructive",
        title: "خطأ في المصادقة",
        description: "لم نتمكن من تسجيل دخولك كمستخدم مجهول.",
    });
  });
}

type UserProfileCreation = Omit<UserProfile, 'id'>;

/** Initiate email/password sign-up and create user profile document. Returns boolean for success. */
export async function initiateEmailSignUp(
    authInstance: Auth, 
    firestore: Firestore,
    email: string, 
    password: string,
    profileData: UserProfileCreation
): Promise<boolean> {
  try {
    const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
    const user = userCredential.user;

    // After user is created in Auth, create their profile document in Firestore
    const userRef = doc(firestore, 'users', user.uid);
    await setDoc(userRef, profileData, { merge: true });
    
    // Send verification email with action code settings
    await sendEmailVerification(user, actionCodeSettings);

    // IMPORTANT: We sign the user out to force them to verify their email
    await authInstance.signOut();

    return true;
  } catch (error: any) {
    let description = "حدث خطأ غير متوقع أثناء إنشاء الحساب.";
    if (error.code === 'auth/email-already-in-use') {
        description = "هذا البريد الإلكتروني مسجل بالفعل.";
    }
    toast({
        variant: "destructive",
        title: "فشل إنشاء الحساب",
        description: description,
    });
    return false;
  }
}


/** Initiate email/password sign-in (non-blocking). Returns a boolean indicating success. */
export async function initiateEmailSignIn(authInstance: Auth, email: string, password: string): Promise<boolean> {
  try {
    await signInWithEmailAndPassword(authInstance, email, password);
    return true;
  } catch (error: any) {
    toast({
        variant: "destructive",
        title: "فشل تسجيل الدخول",
        description: "يرجى التحقق من بريدك الإلكتروني وكلمة المرور.",
    });
    return false;
  }
}

/** Initiate Google Sign-In flow. Returns a boolean indicating success. */
export async function initiateGoogleSignIn(auth: Auth, firestore: Firestore): Promise<boolean> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if a user profile already exists.
    const userRef = doc(firestore, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // This is a new user, create a profile for them.
      const [firstName, ...lastNameParts] = (user.displayName || '').split(' ');
      const newUserProfile: UserProfileCreation = {
        firstName: firstName || '',
        lastName: lastNameParts.join(' '),
        email: user.email!,
        phoneNumber: user.phoneNumber || '',
      };
      await setDoc(userRef, newUserProfile);
    }
    
    // After sign-in (and profile creation if needed), user is redirected by the auth state listener.
    return true;
  } catch (error: any) {
    toast({
      variant: 'destructive',
      title: 'فشل تسجيل الدخول عبر جوجل',
      description: error.message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
    });
    return false;
  }
}
