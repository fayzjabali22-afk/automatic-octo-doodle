'use client';

import { useUserProfile } from '@/hooks/use-user-profile';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Ship } from 'lucide-react';

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
  
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user || profile?.role !== 'carrier') {
      redirect('/dashboard');
      return null;
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
