'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Settings, Menu, Bell, Trash2, ShieldAlert, Lock, AlertTriangle, Check } from 'lucide-react';
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
  useDoc,
  useFirestore,
  useMemoFirebase,
  useCollection,
  setDocumentNonBlocking,
  useAuth,
} from '@/firebase';
import { doc, collection, query, where, limit } from 'firebase/firestore';
import type { Notification } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { signOut, deleteUser, sendEmailVerification } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const menuItems = [
  {
    href: '/dashboard',
    label: 'لوحة التحكم',
    auth: false,
  },
  {
    href: '/history',
    label: 'إدارة الحجز',
    auth: true,
  },
];

const mobileMenuItems = [
  ...menuItems,
  {
    href: '/profile',
    label: 'ملفي الشخصي',
    auth: true,
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

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc(userProfileRef);

  // Notifications Logic
  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'notifications'),
      where("userId", "==", user.uid),
      limit(20) // Added limit for safety
    );
  }, [firestore, user]);

  const { data: allNotifications } = useCollection<Notification>(notificationsQuery);

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
      const notifRef = doc(firestore, 'notifications', notification.id);
      setDocumentNonBlocking(notifRef, { isRead: true }, { merge: true });
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({
        title: 'تم تسجيل الخروج بنجاح',
      });
      router.push('/login');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطأ في تسجيل الخروج',
        description: 'حدث خطأ ما، يرجى المحاولة مرة أخرى.',
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !auth) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على المستخدم.' });
      return;
    }
    try {
      await deleteUser(user);
      toast({ title: 'تم حذف الحساب بنجاح', description: 'نأمل أن نراك مرة أخرى قريبًا.' });
      router.push('/signup');
    } catch (error: any) {
      console.error("Delete account error:", error);
      toast({
        variant: 'destructive',
        title: 'فشل حذف الحساب',
        description: 'هذه العملية تتطلب إعادة تسجيل دخول حديثة. الرجاء تسجيل الخروج ثم الدخول مرة أخرى والمحاولة مجددًا.',
      });
    } finally {
      setIsDeleteConfirmOpen(false);
    }
  };

  const handleResendVerification = async () => {
    if (user) {
      try {
        await sendEmailVerification(user);
        toast({
          title: 'تم إرسال رسالة التفعيل',
          description: 'الرجاء التحقق من بريدك الإلكتروني.',
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'حدث خطأ',
          description: 'لم نتمكن من إرسال رسالة التفعيل. يرجى المحاولة مرة أخرى.',
        });
      }
    }
  };

  const UserMenuContent = () => (
    <>
      <DropdownMenuLabel className="text-end">
        {userProfile?.firstName
          ? `مرحباً، ${userProfile.firstName}`
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
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-sidebar-primary px-4 text-sidebar-primary-foreground md:px-6 shadow-md">

          {/* Right side: Mobile Menu Trigger (RTL: This comes first naturally) */}
          <div className="flex items-center md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-white/20">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">القائمة الرئيسية</span>
                </Button>
              </SheetTrigger>
              {/* Change: side="right" for Arabic */}
              <SheetContent
                side="right"
                className="w-full max-w-xs p-0 bg-secondary text-secondary-foreground"
              >
                <SheetTitle className="sr-only">القائمة الرئيسية</SheetTitle>
                <nav className="grid gap-6 text-lg font-medium p-6">
                  <div className="mb-4 flex items-center justify-center">
                    <span className="text-xl font-bold">Safar Carrier</span>
                  </div>
                  {mobileMenuItems.map((item) => {
                    const isDisabled = item.auth && !user;
                    if (isDisabled) {
                      return (
                        <span key={item.label} className="flex items-center justify-start font-bold text-white/50 cursor-not-allowed gap-2">
                           <Lock className="h-4 w-4" />
                           {item.label}
                        </span>
                      )
                    }
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        className={cn("font-bold text-white hover:text-white/80", pathname === item.href && "underline")}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          {/* Center Section: Logo */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Link href="/">
                <Image
                src="https://i.postimg.cc/rzXN6mS5/lwjw-sfryat.png"
                alt="Safar Carrier Logo"
                width={120}
                height={90}
                priority
                className="object-contain"
                />
            </Link>
          </div>

          {/* Left side: User Menu & Notifications */}
          <div className="flex items-center gap-2 ms-auto">
            
            {/* Notifications - Added Logic here */}
            {user && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/20 relative">
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
                                            {new Date(notification.createdAt).toLocaleDateString('ar-SA')}
                                        </span>
                                    </DropdownMenuItem>
                                ))
                            )}
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {/* Desktop User Menu */}
            <div className="hidden md:flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/20">
                    <Avatar className="h-9 w-9 border-2 border-accent">
                      {user?.photoURL && (
                        <AvatarImage
                          src={user.photoURL}
                          alt={userProfile?.firstName || ''}
                        />
                      )}
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {userProfile?.firstName
                          ? userProfile.firstName.charAt(0)
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
          </div>
        </header>

        {/* Secondary Navigation Header (Desktop Only) */}
        <nav className="sticky top-16 z-40 hidden h-12 items-center justify-center gap-8 border-b border-b-border/10 bg-secondary px-6 text-secondary-foreground shadow-sm md:flex">
          {menuItems.map((item) => {
            const isDisabled = item.auth && !user;
            const linkClass = cn(
              "text-sm font-bold transition-colors hover:text-white/80 flex items-center gap-2",
              pathname === item.href && !isDisabled && "text-white underline decoration-2 underline-offset-4",
              isDisabled && "cursor-not-allowed text-white/50"
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
                {item.label}
              </Link>
            )
          })}
        </nav>

        {user && !user.emailVerified && (
          <div className="sticky top-16 md:top-28 z-40 bg-yellow-600 text-white text-sm text-center p-2 flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
            <AlertTriangle className="h-4 w-4" />
            <span>حسابك غير مفعل. الرجاء التحقق من بريدك الإلكتروني.</span>
            <Button variant="link" className="p-0 h-auto text-white underline font-bold" onClick={handleResendVerification}>
              إعادة إرسال
            </Button>
          </div>
        )}

        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
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

    