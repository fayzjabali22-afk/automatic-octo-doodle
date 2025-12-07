'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Settings, Menu, Bell, Trash2, ShieldAlert, Lock, AlertTriangle, MessageSquare, ArrowRightLeft, Loader2, User, Shield } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  useUser,
  useFirestore,
  useCollection,
  updateDocumentNonBlocking,
  useAuth,
  FirestorePermissionError,
  errorEmitter
} from '@/firebase';
import { doc, collection, query, where, limit, updateDoc } from 'firebase/firestore';
import type { Notification } from '@/lib/data';
import { signOut, sendEmailVerification } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Logo } from './logo';

const menuItems = [
  {
    href: '/dashboard',
    label: 'لوحة التحكم',
    auth: false,
    icon: null,
  },
  {
    href: '/history',
    label: 'إدارة الحجز',
    auth: false,
    icon: null,
  },
  {
    href: '/chats',
    label: 'الدردشات',
    auth: true,
    icon: MessageSquare,
  }
];

const mobileMenuItems = [
  ...menuItems,
  {
    href: '/profile',
    label: 'ملفي الشخصي',
    auth: true,
    icon: Settings
  },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { profile, isLoading: isProfileLoading, userProfileRef } = useUserProfile();
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isCarrierPath = pathname?.startsWith('/carrier');

  const notificationsQuery = useMemo(() => {
    if (!firestore || !user?.uid) return null;
    // FIX: Query the subcollection within the user's document
    return query(
      collection(firestore, 'users', user.uid, 'notifications'),
      limit(20)
    );
  }, [firestore, user]);


  const { data: allNotifications } = useCollection(notificationsQuery);

  const unreadNotifications = useMemo(() => {
    if (!allNotifications) return [];
    return allNotifications
      .filter(n => !n.isRead)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [allNotifications]);

  const unreadCount = unreadNotifications.length;

  const handleNotificationClick = (notification: Notification) => {
    if (firestore && user && !notification.isRead) {
      const notifRef = doc(firestore, 'users', user.uid, 'notifications', notification.id);
      updateDocumentNonBlocking(notifRef, { isRead: true });
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleSignOut = async () => {
    if (!auth) {
        toast({
            variant: "destructive",
            title: 'خطأ',
            description: 'خدمة المصادقة غير متاحة.',
        });
        return;
    }
    try {
      await signOut(auth);
      toast({
        title: 'تم تسجيل الخروج بنجاح',
      });
      router.push('/login');
    } catch (error) {
      toast({
        variant: "destructive",
        title: 'فشل تسجيل الخروج',
        description: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
      });
    }
  };
  
  const handleSwitchRole = async () => {
    if (!userProfileRef || !profile) return;
    setIsSwitchingRole(true);
    const newRole = profile.role === 'carrier' ? 'traveler' : 'carrier';
    const payload = { role: newRole };
    
    updateDoc(userProfileRef, payload)
        .then(() => {
            toast({
                title: `تم التبديل إلى واجهة ${newRole === 'carrier' ? 'الناقل' : 'المسافر'}`,
            });
            window.location.href = newRole === 'carrier' ? '/carrier' : '/dashboard';
        })
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: userProfileRef.path,
                operation: 'update',
                requestResourceData: payload,
            });
            errorEmitter.emit('permission-error', permissionError);
            setIsSwitchingRole(false);
        });
  }

  const handleDeleteAccount = async () => {
    toast({
        title: 'تم تعطيل المصادقة',
        description: 'تم تعطيل حذف الحساب في وضع التطوير.',
    });
    setIsDeleteConfirmOpen(false);
  };
  
  const isDevUser = user?.email === 'dev@safar.com';

  const UserMenuContent = () => (
    <>
      <DropdownMenuLabel className="text-end">
        {profile?.firstName
          ? `مرحباً، ${profile.firstName}`
          : 'حسابي'}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/profile" className='justify-end w-full cursor-pointer flex items-center'>
          <span>ملفي الشخصي</span>
          <Settings className="ms-2 h-4 w-4" />
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleSignOut} className="text-yellow-600 focus:text-yellow-700 justify-end cursor-pointer flex items-center">
        <span>تسجيل الخروج</span>
        <LogOut className="ms-2 h-4 w-4" />
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setIsDeleteConfirmOpen(true)} className="text-red-500 focus:text-red-600 justify-end cursor-pointer flex items-center">
        <span>حذف الحساب</span>
        <Trash2 className="ms-2 h-4 w-4" />
      </DropdownMenuItem>
    </>
  );

  return (
    <TooltipProvider>
      <div className="flex min-h-screen w-full flex-col bg-background" dir="rtl">
        <header 
          className={cn(
            "sticky top-0 z-50 flex h-16 items-center justify-between px-4 md:px-6",
            "bg-accent text-accent-foreground"
          )}
        >

          <div className="flex items-center gap-2 md:hidden">
            {isMounted && !isCarrierPath && user && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">القائمة الرئيسية</span>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-full max-w-xs p-0 bg-background text-foreground"
                >
                  <SheetTitle className="sr-only">القائمة الرئيسية</SheetTitle>
                  <nav className="grid gap-6 text-lg font-medium p-6">
                    <div className="mb-4 flex items-center justify-center">
                       <Logo/>
                    </div>
                    {mobileMenuItems.map((item) => {
                      const isLinkActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          className={cn("font-bold text-foreground hover:text-primary flex items-center gap-2", isLinkActive && "text-primary")}
                        >
                          {item.icon && <item.icon className="h-4 w-4" />}
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                </SheetContent>
              </Sheet>
            )}
             {isDevUser && user && (
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-full relative"
                            onClick={handleSwitchRole}
                            disabled={isSwitchingRole || isProfileLoading}
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
          
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Link href="/">
                <Logo />
            </Link>
          </div>

          <div className="flex items-center gap-2 ms-auto">
            {user ? (
                <>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full relative">
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                    {unreadCount}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                        <DropdownMenuLabel className="text-end">الإشعارات</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="max-h-[300px] overflow-y-auto">
                            {unreadNotifications.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    لا توجد إشعارات جديدة
                                </div>
                            ) : (
                                unreadNotifications.map((notification) => (
                                    <DropdownMenuItem 
                                        key={notification.id} 
                                        onClick={() => handleNotificationClick(notification)}
                                        className="flex flex-col items-start gap-1 p-3 cursor-pointer text-end"
                                    >
                                        <div className="flex w-full items-center justify-between">
                                            <span className="font-semibold text-sm">{notification.title}</span>
                                            {!notification.isRead && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>

                                        <span className="text-[10px] text-muted-foreground/70 w-full text-start">
                                            {isMounted ? new Date(notification.createdAt).toLocaleDateString('ar-SA') : ''}
                                        </span>
                                    </DropdownMenuItem>
                                ))
                            )}
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="hidden md:flex">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <Avatar className="h-9 w-9 border-2 border-border">
                        {user?.photoURL && (
                            <AvatarImage
                            src={user.photoURL}
                            alt={profile?.firstName || ''}
                            />
                        )}
                        <AvatarFallback className="bg-secondary text-secondary-foreground">
                            {profile?.firstName
                            ? profile.firstName.charAt(0)
                            : user?.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                        </Avatar>
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                    <UserMenuContent />
                    </DropdownMenuContent>
                </DropdownMenu>
                </div>
                </>
            ) : null }
          </div>
        </header>

        {isMounted && !isCarrierPath && <nav className="sticky top-16 z-40 hidden h-12 items-center justify-center gap-8 border-b bg-accent px-6 text-accent-foreground shadow-sm md:flex">
          {menuItems.map((item) => {
            const isDisabled = item.auth && !user;
            const linkClass = cn(
              "text-sm font-bold transition-colors hover:text-primary flex items-center gap-2",
              pathname.startsWith(item.href) && !isDisabled && "text-primary underline decoration-2 underline-offset-4",
              isDisabled && "cursor-not-allowed text-muted-foreground"
            );

            if (isDisabled) {
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <span className={linkClass}>
                      <Lock className="h-3 w-3" />
                      {item.label}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>الرجاء تسجيل الدخول للوصول لهذه الصفحة</p>
                  </TooltipContent>
                </Tooltip>
              )
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={linkClass}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.label}
              </Link>
            )
          })}
        </nav>}

        <main className="flex flex-1 flex-col">
          {children}
        </main>
      </div>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-start">
              <ShieldAlert className="h-6 w-6 text-red-500" />
              هل أنت متأكد من حذف حسابك؟
            </AlertDialogTitle>
            <AlertDialogDescription className="text-start">
              هذا الإجراء سيقوم بحذف حسابك بشكل نهائي. لا يمكن التراجع عن هذا الإجراء. سيتم حذف جميع بياناتك الشخصية وحجوزاتك وسجل رحلاتك.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 sm:justify-start">
             <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              نعم، قم بحذف حسابي
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
