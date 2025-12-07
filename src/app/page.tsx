'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Ship } from 'lucide-react';

function LoadingScreen() {
    return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 text-center bg-background">
            <Ship className="h-16 w-16 animate-pulse text-primary" />
            <h1 className="text-xl font-bold text-muted-foreground">جاري التحقق من الهوية السيادية...</h1>
            <p className="text-sm text-muted-foreground">الرجاء الانتظار.</p>
        </div>
    );
}

export default function SmartRedirectPage() {
    const router = useRouter();
    const { user, profile, isLoading } = useUserProfile();

    useEffect(() => {
        // بروتوكول الصبر: لا تتخذ أي قرار حتى انتهاء التحميل بشكل كامل.
        if (isLoading) {
            return;
        }

        // بروتوكول الأمن: إذا لم يكن هناك مستخدم مسجل، يتم توجيهه إلى بوابة الدخول.
        if (!user) {
            router.replace('/login');
            return;
        }
        
        // بروتوكول التوجيه الطبقي الصارم (النسخة النهائية)
        // الأولوية القصوى للمالك والمدير. هذا الشرط يُحسم أولاً.
        if (profile?.role === 'admin' || profile?.role === 'owner') {
            router.replace('/admin');
        } 
        // إذا لم يكن مديراً، تحقق من دوره كناقل.
        else if (profile?.role === 'carrier') {
            router.replace('/carrier');
        } 
        // إذا لم يكن أي مما سبق، فهو مسافر.
        else {
            router.replace('/history');
        }
        
    }, [user, profile, isLoading, router]);

    // عرض شاشة التحميل بشكل دائم حتى يتم اتخاذ قرار التوجيه الصحيح والوحيد.
    return <LoadingScreen />;
}
