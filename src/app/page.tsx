'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // تم جلب هذا الاستيراد الضروري
import { useUserProfile } from '@/hooks/use-user-profile';
import { Ship } from 'lucide-react';

function LoadingScreen() {
    return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 text-center bg-background">
            <Ship className="h-16 w-16 animate-pulse text-primary" />
            <h1 className="text-xl font-bold text-muted-foreground">جاري تحديد وجهتك ...</h1>
            <p className="text-sm text-muted-foreground">يقوم النظام بالتحقق من صلاحيات حسابك.</p>
        </div>
    );
}

export default function SmartRedirectPage() {
    const router = useRouter();
    const { user, profile, isLoading } = useUserProfile();

    useEffect(() => {
        // 1. بروتوكول الصبر: انتظر انتهاء التحميل تماماً
        if (isLoading) return;

        // 2. بروتوكول الأمن: لا مستخدم = طرد للدخول
        if (!user) {
            router.replace('/login');
            return;
        }

        // 3. بروتوكول التوجيه الذكي (The Brain):
        // المالك والمدير -> القلعة
        if (profile?.role === 'admin' || profile?.role === 'owner') {
            router.replace('/admin'); 
        } 
        // الناقل -> غرفة العمليات
        else if (profile?.role === 'carrier') {
            router.replace('/carrier');
        } 
        // المسافر -> سجل الرحلات
        else {
            router.replace('/history'); 
        }
    }, [user, profile, isLoading, router]);

    // عرض شاشة الانتظار دائماً لمنع الوميض
    return <LoadingScreen />;
}
