'use client';

import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, Ship } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';


function LoadingSpinner() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Ship className="h-16 w-16 animate-pulse text-primary" />
                <p className="font-bold text-lg text-muted-foreground">جاري التحقق من صلاحيات الناقل...</p>
            </div>
        </div>
    );
}

export default function CarrierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, isLoading } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || profile?.role !== 'carrier')) {
        // Instead of a hard redirect, this logic will now be handled by the rendered output.
        // We can keep a client-side redirect as a fallback if needed, but let's rely on conditional rendering first.
        // To prevent flashes of content, we still might want to redirect, but let's try a softer approach.
        // For now, let's remove the aggressive redirect.
    }
  }, [isLoading, user, profile, router]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // If the user is not a carrier, show an access denied message.
  // This is more stable than a `redirect()` call inside a 'use client' component's render body.
  if (!user || profile?.role !== 'carrier') {
    // We'll show a message and then redirect after a short delay, which is a smoother user experience.
    useEffect(() => {
      const timer = setTimeout(() => {
        router.replace('/dashboard');
      }, 2000); // 2-second delay before redirecting
      return () => clearTimeout(timer);
    }, [router]);
    
    return (
       <AppLayout>
        <div className="flex h-[calc(100vh-200px)] items-center justify-center text-center p-8">
            <div className="flex flex-col items-center gap-4">
                <ShieldAlert className="h-16 w-16 text-destructive" />
                <h1 className="text-2xl font-bold text-destructive">الوصول مرفوض</h1>
                <p className="text-muted-foreground max-w-md">
                    هذه المنطقة مخصصة للناقلين فقط. يتم الآن إعادة توجيهك...
                </p>
            </div>
        </div>
      </AppLayout>
    );
  }

  // If user is a carrier, render the carrier-specific layout
  return (
    <AppLayout>
      <div className="grid h-full grid-cols-1 md:grid-cols-[240px_1fr]">
        {/* Placeholder for Carrier Sidebar */}
        <aside className="hidden md:block h-full bg-secondary/50 border-e p-4">
           <h2 className="font-bold text-lg">قائمة الناقل</h2>
           {/* Sidebar links will go here */}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
             <div className="border-4 border-dashed border-primary/20 m-4 rounded-lg bg-card/50 p-4 min-h-[200px]">
                {children}
            </div>
        </main>
      </div>
    </AppLayout>
  );
}
