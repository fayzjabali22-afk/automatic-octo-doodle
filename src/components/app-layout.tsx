'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Settings, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  useUser,
  useDoc,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import { doc } from 'firebase/firestore';

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
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc(userProfileRef);

  return (
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
          <div className="hidden md:flex">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar>
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
                <DropdownMenuLabel>
                    {userProfile?.firstName
                    ? `مرحباً، ${userProfile.firstName}`
                    : 'حسابي'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                 <DropdownMenuItem asChild>
                    <Link href="/profile">
                    <Settings className="ml-2 h-4 w-4" />
                    <span>ملفي الشخصي</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/profile">
                    <Settings className="ml-2 h-4 w-4" />
                    <span>الإعدادات</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/login">
                    <LogOut className="ml-2 h-4 w-4" />
                    <span>تسجيل الخروج</span>
                    </Link>
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {/* Mobile User Menu (now on the far left) */}
          <div className="flex items-center md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar>
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
                <DropdownMenuLabel>
                    {userProfile?.firstName
                    ? `مرحباً، ${userProfile.firstName}`
                    : 'حسابي'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                 <DropdownMenuItem asChild>
                    <Link href="/profile">
                    <Settings className="ml-2 h-4 w-4" />
                    <span>ملفي الشخصي</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/profile">
                    <Settings className="ml-2 h-4 w-4" />
                    <span>الإعدادات</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/login">
                    <LogOut className="ml-2 h-4 w-4" />
                    <span>تسجيل الخروج</span>
                    </Link>
                </DropdownMenuItem>
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
  );
}
