'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Settings, Menu, Bell, Trash2, ShieldAlert } from 'lucide-react';
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
import { doc, collection, query, where } from 'firebase/firestore';
import type { Notification } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { signOut, deleteUser } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const menuItems = [
  {
    href: '/dashboard',
    label: 'لوحة التحكم',
  },
  {
    href: '/history',
    label: 'حجوزاتي',
  },
];

const mobileMenuItems = [
  ...menuItems,
  {
    href: '/profile',
    label: 'ملفي الشخصي',
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

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/notifications`), where("isRead", "==", false));
  }, [firestore, user]);

  const { data: notifications } = useCollection<Notification>(notificationsQuery);
  const unreadCount = notifications?.length || 0;
  
  const handleNotificationClick = (notification: Notification) => {
    if (firestore && user && !notification.isRead) {
        const notifRef = doc(firestore, `users/${user.uid}/notifications`, notification.id);
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


  const UserMenuContent = () => (
    <>
      <DropdownMenuLabel>
        {userProfile?.firstName
        ? `مرحباً، ${userProfile.firstName}`
        : 'حسابي'}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
       <DropdownMenuItem asChild>
          <Link href="/profile" className='justify-end'>
            <Settings className="ml-2 h-4 w-4" />
            <span>ملفي الشخصي</span>
          </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleSignOut} className="text-yellow-500 focus:text-yellow-600 justify-end">
        <LogOut className="ml-2 h-4 w-4" />
        <span>تسجيل الخروج</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setIsDeleteConfirmOpen(true)} className="text-red-500 focus:text-red-600 justify-end">
        <Trash2 className="ml-2 h-4 w-4" />
        <span>حذف الحساب</span>
      </DropdownMenuItem>
    </>
  );

  return (
    <>
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-[#EDC17C] px-4 text-black md:px-6">
        {/* Mobile: Left side (Menu) */}
        <div className="flex items-center md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
                <Menu className="h-4 w-4 text-green-400" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              style={{
                backgroundColor: '#EDC17C',
                borderRight: '2px solid #8B0000',
              }}
              className="w-full max-w-xs"
            >
              <SheetTitle className="sr-only">القائمة الرئيسية</SheetTitle>
              <nav className="grid gap-6 text-lg font-medium">
                <Link
                  href="/dashboard"
                  className="-ml-4 mb-4 flex items-center gap-2 text-lg font-semibold"
                >
                  <img
                    src="https://i.postimg.cc/zvbhTsXV/Iwjw-sfryat.png"
                    alt="Safar Carrier Logo"
                    style={{ height: '110px', width: '145px' }}
                  />
                  <span className="sr-only">Safar Carrier</span>
                </Link>
                {mobileMenuItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`font-bold text-black hover:text-gray-700 ${
                      pathname === item.href ? 'underline' : ''
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
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
            <img
              src="https://i.postimg.cc/zvbhTsXV/Iwjw-sfryat.png"
              alt="Safar Carrier Logo"
              style={{ height: '110px', width: '145px' }}
            />
            <span className="sr-only">Safar Carrier</span>
          </Link>
        </div>

        {/* Desktop: Right Side Elements & Mobile: Far left user menu */}
        <div className="flex items-center gap-4">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && <Badge className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 text-xs">{unreadCount}</Badge>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications && notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <DropdownMenuItem key={notif.id} onClick={() => handleNotificationClick(notif)} className={`flex flex-col items-start gap-1 ${!notif.isRead ? 'font-bold' : ''}`}>
                        <p>{notif.title}</p>
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
                <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-10 w-10 border-2 border-[#8B0000]">
                    {user?.photoURL && (
                        <AvatarImage
                        src={user.photoURL}
                        alt={userProfile?.firstName || ''}
                        />
                    )}
                    <AvatarFallback className="bg-primary/20 text-primary">
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
                <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-10 w-10 border-2 border-[#8B0000]">
                    {user?.photoURL && (
                        <AvatarImage
                        src={user.photoURL}
                        alt={userProfile?.firstName || ''}
                        />
                    )}
                    <AvatarFallback className="bg-primary/20 text-primary">
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
      <nav className="sticky top-16 z-40 hidden h-12 items-center justify-center gap-8 border-b border-b-white bg-[#EDC17C] px-6 md:flex">
        {menuItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`text-sm font-medium text-black transition-colors hover:text-gray-700 ${
              pathname === item.href ? 'underline' : ''
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {children}
      </main>
    </div>
    
    <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-6 w-6 text-red-500" />
                    هل أنت متأكد من حذف حسابك؟
                </AlertDialogTitle>
                <AlertDialogDescription>
                    هذا الإجراء سيقوم بحذف حسابك بشكل نهائي. لا يمكن التراجع عن هذا الإجراء. سيتم حذف جميع بياناتك الشخصية وحجوزاتك وسجل رحلاتك.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    نعم، قم بحذف حسابي
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
