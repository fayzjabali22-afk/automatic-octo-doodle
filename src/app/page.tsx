'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
        if (isLoading) {
            return;
        }

        // 2. بروتوكول الأمن: لا مستخدم = طرد إلى بوابة الدخول
        if (!user) {
            router.replace('/login');
            return;
        }
        
        // 3. بروتوكول التوجيه الطبقي (النسخة النهائية والحاسمة)
        // الأولوية القصوى: المالك والمدير يذهبون إلى القلعة أولاً.
        if (profile?.role === 'admin' || profile?.role === 'owner') {
            router.replace('/admin');
        } 
        // إذا لم يكن مديراً، تحقق مما إذا كان ناقلاً.
        else if (profile?.role === 'carrier') {
            router.replace('/carrier');
        } 
        // إذا لم يكن أي مما سبق، فهو مسافر.
        else {
            router.replace('/history');
        }
        
    }, [user, profile, isLoading, router]);

    // عرض شاشة الانتظار دائماً لمنع الوميض وضمان اتخاذ قرار توجيه واحد وصحيح.
    return <LoadingScreen />;
}
