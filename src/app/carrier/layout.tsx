'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { AppLayout } from '@/components/app-layout';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert } from 'lucide-react';

export default function CarrierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      // If user is not logged in at all, redirect to login
      router.replace('/login');
    } else if (!isProfileLoading && userProfile && userProfile.role !== 'carrier') {
      // If user is logged in but is not a carrier, redirect to traveler dashboard
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, userProfile, isProfileLoading, router]);

  // Loading state
  if (isUserLoading || isProfileLoading) {
    return (
      <AppLayout>
        <div className="flex h-[calc(100vh-200px)] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
             <Skeleton className="h-12 w-12 rounded-full" />
             <div className="space-y-2">
               <Skeleton className="h-4 w-[250px]" />
               <Skeleton className="h-4 w-[200px]" />
             </div>
             <p className="font-bold text-lg mt-4">جاري التحقق من صلاحيات الناقل...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // If user is not a carrier (but logic is still running), show access denied
  if (!userProfile || userProfile.role !== 'carrier') {
    return (
       <AppLayout>
        <div className="flex h-[calc(100vh-200px)] items-center justify-center text-center p-8">
            <div className="flex flex-col items-center gap-4">
                <ShieldAlert className="h-16 w-16 text-destructive" />
                <h1 className="text-2xl font-bold text-destructive">الوصول مرفوض</h1>
                <p className="text-muted-foreground max-w-md">
                    ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة. يتم توجيهك الآن إلى لوحة التحكم الرئيسية.
                </p>
            </div>
        </div>
      </AppLayout>
    )
  }

  // Render children if user is a carrier
  return (
    <AppLayout>
      <div className="border-4 border-dashed border-primary/30 m-4 rounded-lg bg-card/30">
        {children}
      </div>
    </AppLayout>
  );
}
