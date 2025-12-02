
'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Settings, Menu, Bell, Trash2, ShieldAlert, Lock, AlertTriangle } from 'lucide-react';
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
import { doc, collection, query, where, orderBy, limit } from 'firebase/firestore'; // Added limit
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

  // ✅ FIX: Simplified query to only filter by userId to comply with security rules.
  // Filtering and sorting is now done on the client-side.
  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
        collection(firestore, 'notifications'), 
        where("userId", "==", user.uid)
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
        // ✅ Path to the root notification document
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
      <DropdownMenuLabel className="justify-end text-right">
        {userProfile?.firstName
        ? `مرحباً، ${userProfile.firstName}`
        : 'حسابي'}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
       <DropdownMenuItem asChild>
          <Link href="/profile" className='justify-end w-full cursor-pointer'>
            <span>ملفي الشخصي</span>
            <Settings className="ml-2 h-4 w-4" />
          </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleSignOut} className="text-yellow-600 focus:text-yellow-700 justify-end cursor-pointer">
        <span>تسجيل الخروج</span>
        <LogOut className="ml-2 h-4 w-4" />
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setIsDeleteConfirmOpen(true)} className="text-red-500 focus:text-red-600 justify-end cursor-pointer">
        <span>حذف الحساب</span>
        <Trash2 className="ml-2 h-4 w-4" />
      </DropdownMenuItem>
    </>
  );

  return (
    <TooltipProvider>
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-white px-4 text-black md:px-6 shadow-sm">
        {/* Mobile: Left side (Menu) */}
        <div className="flex items-center md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 border-black/20 bg-transparent hover:bg-black/10">
                <Menu className="h-4 w-4 text-black" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              style={{
                backgroundColor: '#FFFFFF',
                borderRight: '2px solid #8B0000',
              }}
              className="w-full max-w-xs p-0 text-black"
            >
              <SheetTitle className="sr-only">القائمة الرئيسية</SheetTitle>
              <nav className="grid gap-6 text-lg font-medium p-6">
                <Link
                  href="/dashboard"
                  className="-ml-4 mb-4 flex items-center gap-2 text-lg font-semibold"
                >
                  <Image
                    src="/logo.png"
                    alt="Safar Carrier Logo"
                    width={145}
                    height={110}
                    className="object-contain"
                  />
                  <span className="sr-only">Safar Carrier</span>
                </Link>
                {mobileMenuItems.map((item) => {
                    const isDisabled = item.auth && !user;
                    if (isDisabled) {
                      return (
                          <span key={item.label} className="flex items-center font-bold text-black/50 cursor-not-allowed">
                            <Lock className="ml-2 h-4 w-4" />
                            {item.label}
                        </span>
                      )
                    }
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={cn("font-bold text-black hover:text-gray-700", pathname === item.href && "underline")}
                        >
                            {item.label}
                        </Link>
                    );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Center Section: Logo (visible on all screens) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <Image
              src="/logo.png"
              alt="Safar Carrier Logo"
              width={145}
              height={110}
              priority
            />
            <span className="sr-only">Safar Carrier</span>
          </Link>
        </div>

        {/* Desktop: Right Side Elements & Mobile: Far left user menu */}
        <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative hover:bg-black/10" aria-label="عرض الإشعارات">
                    <Bell className="h-5 w-5" aria-hidden="true" />
                    {unreadCount > 0 && <Badge className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 text-xs bg-red-600 hover:bg-red-700">{unreadCount}</Badge>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="text-right">الإشعارات</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {unreadNotifications && unreadNotifications.length > 0 ? (
                    unreadNotifications.map((notif) => (
                      <DropdownMenuItem key={notif.id} onClick={() => handleNotificationClick(notif)} className={`flex flex-col items-end gap-1 cursor-pointer text-right`}>
                        <p className={cn("text-sm", !notif.isRead ? 'font-bold' : '')}>{notif.title}</p>
                        <p className="text-xs text-muted-foreground">{notif.message}</p>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">لا توجد إشعارات جديدة.</div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
          
          {/* Desktop User Menu */}
          <div className="hidden md:flex">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/10">
                    <Avatar className="h-10 w-10 border-2 border-[#8B0000]">
                    {user?.photoURL && (
                        <AvatarImage
                        src={user.photoURL}
                        alt={userProfile?.firstName || ''}
                        />
                    )}
                    <AvatarFallback className="bg-[#8B0000] text-white">
                        {userProfile?.firstName
                        ? userProfile.firstName.charAt(0)
                        : user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                    </Avatar>
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <UserMenuContent />
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Mobile User Menu */}
          <div className="flex items-center md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/10">
                    <Avatar className="h-8 w-8 border-2 border-[#8B0000]">
                    {user?.photoURL && (
                        <AvatarImage
                        src={user.photoURL}
                        alt={userProfile?.firstName || ''}
                        />
                    )}
                    <AvatarFallback className="bg-[#8B0000] text-white text-xs">
                        {userProfile?.firstName
                        ? userProfile.firstName.charAt(0)
                        : user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                    </Avatar>
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <UserMenuContent />
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Secondary Navigation Header */}
      <nav className="sticky top-16 z-40 hidden h-12 items-center justify-center gap-8 border-b border-b-black/10 bg-white px-6 text-black md:flex shadow-sm">
        {menuItems.map((item) => {
            const isDisabled = item.auth && !user;
            const linkClass = cn(
              "text-sm font-bold text-black transition-colors hover:text-gray-700",
              pathname === item.href && !isDisabled && "underline decoration-2 underline-offset-4",
              isDisabled && "cursor-not-allowed text-black/50 flex items-center gap-1"
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
                <AlertDialogTitle className="flex items-center gap-2 text-right">
                    <ShieldAlert className="h-6 w-6 text-red-500" />
                    هل أنت متأكد من حذف حسابك؟
                </AlertDialogTitle>
                <AlertDialogDescription className="text-right">
                    هذا الإجراء سيقوم بحذف حسابك بشكل نهائي. لا يمكن التراجع عن هذا الإجراء. سيتم حذف جميع بياناتك الشخصية وحجوزاتك وسجل رحلاتك.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    نعم، قم بحذف حسابي
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </TooltipProvider>
  );
}
