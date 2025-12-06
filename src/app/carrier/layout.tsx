
'use client';

import { useUserProfile } from '@/hooks/use-user-profile';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Ship, LayoutDashboard, Search, PlusCircle, Archive, Menu, Route, User } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AddTripDialog } from '@/app/carrier/add-trip-dialog';
import { CarrierBottomNav } from '@/components/carrier/carrier-bottom-nav';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { CarrierMobileMenu } from '@/components/carrier/carrier-mobile-menu';
import { Logo } from '@/components/logo';

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
    { href: '/carrier/opportunities', label: 'مركز الفرص', icon: Search, exact: false },
    { href: '/carrier/trips', label: 'رحلاتي وحجوزاتي', icon: Route, exact: false },
    { href: '/carrier/archive', label: 'الأرشيف', icon: Archive, exact: false },
    { href: '/profile', label: 'الملف الشخصي', icon: User, exact: true },
];


export default function CarrierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isAddTripDialogOpen, setIsAddTripDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // DEV MODE: Bypassing role check
  // const { user, profile, isLoading } = useUserProfile();
  // if (isLoading) {
  //   return <LoadingSpinner />;
  // }
  // if (!user || profile?.role !== 'carrier') {
  //   return <AccessDenied />;
  // }

  return (
    <>
      <div className="flex min-h-screen w-full flex-col bg-background" dir="rtl">
        <header 
          className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b bg-card px-4 md:px-6 shadow-sm">
            <div className="flex items-center gap-2">
                <div className="md:hidden">
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-6 w-6" />
                                <span className="sr-only">فتح القائمة</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-full max-w-xs p-0">
                           <SheetTitle className="sr-only">Carrier Navigation Menu</SheetTitle>
                           <CarrierMobileMenu onLinkClick={() => setIsMobileMenuOpen(false)} />
                        </SheetContent>
                    </Sheet>
                </div>
                 <div className="hidden md:block">
                    <Logo />
                </div>
            </div>
            
            <div className="md:hidden absolute left-1/2 -translate-x-1/2">
               <Logo />
            </div>

            <div className="flex items-center gap-2">
                <Button className="hidden sm:flex" size="sm" onClick={() => setIsAddTripDialogOpen(true)}>
                    <PlusCircle className="ml-2 h-4 w-4" />
                    تأسيس رحلة
                </Button>
            </div>
        </header>
        
        <div className="grid h-full flex-1 grid-cols-1 md:grid-cols-[240px_1fr]">
            {/* --- Sidebar for Desktop --- */}
            <aside className="hidden md:block h-full bg-card border-e p-4 overflow-y-auto">
                <Button className="w-full mb-4" onClick={() => setIsAddTripDialogOpen(true)}>
                    <PlusCircle className="ml-2 h-4 w-4" />
                    تأسيس رحلة جديدة
                </Button>
                <nav className="flex flex-col gap-1">
                    {sidebarNavLinks.map(link => {
                        const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
                        return (
                            <Link key={link.href} href={link.href}>
                                <div className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-card-foreground transition-all hover:bg-muted/50 hover:text-primary",
                                    isActive && "bg-primary/10 text-primary font-bold"
                                )}>
                                    <link.icon className="h-4 w-4" />
                                    {link.label}
                                </div>
                            </Link>
                        )
                    })}
                </nav>
            </aside>

            {/* --- Main Content Area --- */}
            <main className="flex-1 overflow-y-auto bg-muted/20 pb-24 md:pb-0">
                {children}
            </main>
        </div>
        
        {/* --- Bottom Nav for Mobile --- */}
        <CarrierBottomNav onAddTripClick={() => setIsAddTripDialogOpen(true)} />
      </div>
      
      {/* --- Global Dialog --- */}
      <AddTripDialog 
        isOpen={isAddTripDialogOpen}
        onOpenChange={setIsAddTripDialogOpen}
      />
    </>
  );
}
