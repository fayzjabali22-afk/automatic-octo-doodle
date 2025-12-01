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
    auth: Auth, 
    firestore: Firestore,
    email: string, 
    password: string,
    profileData: UserProfileCreation
): Promise<boolean> {
    try {
        // Step 1: Create the user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (!user) {
             toast({
                variant: "destructive",
                title: "فشل إنشاء الحساب",
                description: "لم يتم إرجاع بيانات المستخدم بعد الإنشاء.",
            });
            return false;
        }

        // Step 2: Create the user's profile document in Firestore
        try {
            const userRef = doc(firestore, 'users', user.uid);
            await setDoc(userRef, profileData, { merge: true });
        } catch (firestoreError: any) {
            toast({
                variant: "destructive",
                title: "فشل حفظ الملف الشخصي",
                description: firestoreError.message || "لم نتمكن من حفظ بيانات ملفك الشخصي.",
            });
            // Optional: Consider deleting the auth user if profile creation fails
            // await user.delete();
            return false;
        }

        // Step 3: Send the verification email
        try {
            await sendEmailVerification(user, actionCodeSettings);
            toast({
                title: 'الخطوة الأخيرة!',
                description: 'تم إرسال رسالة تحقق إلى بريدك الإلكتروني لتفعيل حسابك.',
                duration: 8000,
            });
        } catch (emailError: any) {
             toast({
                variant: "destructive",
                title: "فشل إرسال بريد التحقق",
                description: emailError.message || "لم نتمكن من إرسال بريد التفعيل. حاول تسجيل الدخول لاحقاً لإعادة الإرسال.",
            });
            // We still return true because the account was created. The user can verify later.
        }

        // Step 4: Sign the user out to force them to verify their email
        await auth.signOut();
        
        return true;

    } catch (authError: any) {
        let description = "حدث خطأ غير متوقع أثناء إنشاء الحساب.";
        if (authError.code === 'auth/email-already-in-use') {
            description = "هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.";
        } else if (authError.code === 'auth/weak-password') {
            description = "كلمة المرور ضعيفة جدا. يجب أن تتكون من 6 أحرف على الأقل."
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
    if (error.code === 'auth/operation-not-allowed') {
        toast({
            variant: 'destructive',
            title: 'خطأ في الإعدادات',
            description: 'تسجيل الدخول عبر جوجل غير مفعل. يرجى مراجعة إعدادات Firebase.',
        });
    } else {
        toast({
          variant: 'destructive',
          title: 'فشل تسجيل الدخول عبر جوجل',
          description: error.message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
        });
    }
    return false;
  }
}
