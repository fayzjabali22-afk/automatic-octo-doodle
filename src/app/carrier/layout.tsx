'use client';

import { useUserProfile } from '@/hooks/use-user-profile';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Ship, LayoutDashboard, Search, PlusCircle, Archive, Menu, Route, User, ArrowRightLeft, Loader2, ListChecks } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AddTripDialog } from '@/app/carrier/add-trip-dialog';
import { CarrierBottomNav } from '@/components/carrier/carrier-bottom-nav';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CarrierMobileMenu } from '@/components/carrier/carrier-mobile-menu';
import { Logo } from '@/components/logo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { updateDoc } from 'firebase/firestore';
import { errorEmitter, FirestorePermissionError } from '@/firebase';


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
    { href: '/carrier/conditions', label: 'الشروط الدائمة', icon: ListChecks, exact: false },
];


export default function CarrierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAddTripDialogOpen, setIsAddTripDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const { toast } = useToast();
  const { user, profile, isLoading, userProfileRef } = useUserProfile();

  const isDevUser = user?.email === 'dev@safar.com';

  const handleSwitchRole = async () => {
    if (!userProfileRef || !profile) return;
    setIsSwitchingRole(true);
    const newRole = profile.role === 'carrier' ? 'traveler' : 'carrier';
    const payload = { role: newRole };

    // Use updateDoc with explicit error handling to generate contextual errors
    updateDoc(userProfileRef, payload)
        .then(() => {
            // Optimistic UI update on success
            toast({
                title: `جاري التبديل إلى واجهة ${newRole === 'carrier' ? 'الناقل' : 'المسافر'}...`,
                description: "سيتم إعادة تحميل الصفحة.",
            });
            setTimeout(() => {
                window.location.href = newRole === 'carrier' ? '/carrier' : '/dashboard';
            }, 1500);
        })
        .catch(serverError => {
            // Create and emit the contextual error
            const permissionError = new FirestorePermissionError({
                path: userProfileRef.path,
                operation: 'update',
                requestResourceData: payload,
            });
            errorEmitter.emit('permission-error', permissionError);
            setIsSwitchingRole(false); // Re-enable the button on error
        });
  }


  return (
    <TooltipProvider>
      <div className="flex min-h-screen w-full flex-col bg-background" dir="rtl">
        <header
          className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b bg-card px-4 text-card-foreground shadow-lg md:px-6"
        >
            <div className="flex items-center gap-2">
                 <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden">
                            <Menu className="h-6 w-6" />
                            <span className="sr-only">فتح القائمة</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full max-w-xs p-0 bg-card text-card-foreground">
                       <SheetTitle className="sr-only">Carrier Navigation Menu</SheetTitle>
                       <CarrierMobileMenu onLinkClick={() => setIsMobileMenuOpen(false)} />
                    </SheetContent>
                </Sheet>
                 {isDevUser && (
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="rounded-full relative"
                                onClick={handleSwitchRole}
                                disabled={isSwitchingRole || isLoading}
                            >
                                {isSwitchingRole ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRightLeft className="h-5 w-5" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>تبديل سريع بين واجهة المسافر والناقل</p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
            
             <div className="absolute left-1/2 -translate-x-1/2">
               <Logo />
            </div>

            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="icon">
                  <Link href="/carrier/profile">
                    <User className="h-6 w-6" />
                    <span className="sr-only">الملف الشخصي</span>
                  </Link>
                </Button>
            </div>
        </header>
        
        <div className="grid h-full flex-1 grid-cols-1 md:grid-cols-[240px_1fr]">
            <aside className="hidden h-full border-l bg-card p-4 overflow-y-auto md:block">
                <Button className="mb-4 w-full" onClick={() => setIsAddTripDialogOpen(true)}>
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

            <main className="flex-1 overflow-y-auto bg-muted/20 pb-24 md:pb-0">
                {children}
            </main>
        </div>
        
        <CarrierBottomNav onAddTripClick={() => setIsAddTripDialogOpen(true)} />
      </div>
      
      <AddTripDialog 
        isOpen={isAddTripDialogOpen}
        onOpenChange={setIsAddTripDialogOpen}
      />
    </TooltipProvider>
  );
}
