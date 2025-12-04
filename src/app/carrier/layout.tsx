'use client';

import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, Ship, LayoutDashboard, FilePlus, Route, Briefcase, Wallet, MessageSquare, BarChart3, PlusCircle, Archive } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AddTripDialog } from '@/components/carrier/add-trip-dialog';


function LoadingSpinner() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Ship className="h-16 w-16 animate-pulse text-primary" />
                <p className="font-bold text-lg text-muted-foreground">جاري تحميل واجهة الناقل...</p>
            </div>
        </div>
    );
}

const sidebarNavLinks = [
    { href: '/carrier', label: 'لوحة القيادة', icon: LayoutDashboard, exact: true },
    { href: '/carrier/overview', label: 'النظرة السريعة', icon: BarChart3, exact: false },
    { href: '/carrier/requests', label: 'سوق الطلبات', icon: FilePlus, exact: false },
    { href: '/carrier/trips', label: 'رحلاتي النشطة', icon: Route, exact: false },
    { href: '/carrier/archive', label: 'الأرشيف', icon: Archive, exact: false },
    { href: '/carrier/bookings', label: 'طلبات الموافقة', icon: Briefcase, exact: false },
    { href: '/carrier/chats', label: 'المحادثات', icon: MessageSquare, exact: false },
    { href: '/carrier/wallet', label: 'المحفظة المالية', icon: Wallet, exact: false }
];


export default function CarrierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, isLoading } = useUserProfile();
  const pathname = usePathname();
  const [isAddTripDialogOpen, setIsAddTripDialogOpen] = useState(false);
  
  // DEV MODE: Bypassing role check
  // if (isLoading) {
  //   return <LoadingSpinner />;
  // }

  // if (!user || profile?.role !== 'carrier') {
  //   return <AccessDenied />;
  // }

  return (
    <>
    <AppLayout>
      <div className="grid h-full grid-cols-1 md:grid-cols-[240px_1fr]">
        <aside className="hidden md:block h-full bg-card border-e p-4">
           <Button className="w-full mb-4" onClick={() => setIsAddTripDialogOpen(true)}>
             <PlusCircle className="ml-2 h-4 w-4" />
             تأسيس رحلة جديدة
           </Button>
           <nav className="flex flex-col gap-2">
            {sidebarNavLinks.map(link => {
                const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
                return (
                    <Link key={link.href} href={link.href}>
                        <div className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-accent-foreground hover:bg-accent",
                            isActive && "bg-accent text-accent-foreground font-bold"
                        )}>
                            <link.icon className="h-4 w-4" />
                            {link.label}
                        </div>
                    </Link>
                )
            })}
           </nav>
        </aside>

        <main className="flex-1 overflow-y-auto bg-muted/30">
             <div className="p-0 md:p-0 min-h-[calc(100vh-128px)]">
                {children}
            </div>
        </main>
      </div>
    </AppLayout>

    <AddTripDialog 
      isOpen={isAddTripDialogOpen}
      onOpenChange={setIsAddTripDialogOpen}
    />
    </>
  );
}

function AccessDenied() {
  const router = useRouter();
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/dashboard');
    }, 3000); // 3-second delay
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
