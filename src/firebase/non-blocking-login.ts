'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { toast } from '@/hooks/use-toast';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance).catch((error) => {
    console.error("Anonymous sign-in error:", error);
    toast({
        variant: "destructive",
        title: "خطأ في المصادقة",
        description: "لم نتمكن من تسجيل دخولك كمستخدم مجهول.",
    });
  });
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  createUserWithEmailAndPassword(authInstance, email, password).catch((error) => {
    console.error("Sign-up error:", error);
    let description = "حدث خطأ غير متوقع أثناء إنشاء الحساب.";
    if (error.code === 'auth/email-already-in-use') {
        description = "هذا البريد الإلكتروني مسجل بالفعل.";
    }
    toast({
        variant: "destructive",
        title: "فشل إنشاء الحساب",
        description: description,
    });
  });
}

/** Initiate email/password sign-in (non-blocking). Returns a boolean indicating success. */
export async function initiateEmailSignIn(authInstance: Auth, email: string, password: string): Promise<boolean> {
  try {
    await signInWithEmailAndPassword(authInstance, email, password);
    return true;
  } catch (error: any) {
    console.error("Sign-in error:", error);
    toast({
        variant: "destructive",
        title: "فشل تسجيل الدخول",
        description: "يرجى التحقق من بريدك الإلكتروني وكلمة المرور.",
    });
    return false;
  }
}
