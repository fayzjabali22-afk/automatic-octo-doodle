'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LogOut,
  Settings,
  Menu,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
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
]

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
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-white px-4 text-gray-800 md:px-6 z-50">
        {/* Main Header Content */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <img 
            src="https://i.postimg.cc/zvbhTsXV/Iwjw-sfryat.png" 
            alt="Safar Carrier Logo" 
            style={{ height: '95px', width: '140px' }} 
          />
          <span className="sr-only">Safar Carrier</span>
        </Link>
        
        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden ml-auto h-8 w-8"
            >
              <Menu className="h-4 w-4 text-green-400" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" style={{ backgroundColor: '#EDC17C', border: '2px solid #8B0000' }}>
            <nav className="grid gap-6 text-lg font-medium">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-lg font-semibold mb-4"
              >
                <img 
                  src="https://i.postimg.cc/zvbhTsXV/Iwjw-sfryat.png" 
                  alt="Safar Carrier Logo" 
                  style={{ height: '95px', width: '140px' }} 
                />
                <span className="sr-only">Safar Carrier</span>
              </Link>
              {mobileMenuItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`font-bold text-black hover:text-gray-700 ${pathname === item.href ? 'underline' : ''}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        
        {/* Desktop User Menu */}
        <div className="hidden md:flex items-center gap-4 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar>
                    {user?.photoURL && <AvatarImage src={user.photoURL} alt={userProfile?.firstName || ''} />}
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {userProfile?.firstName ? userProfile.firstName.charAt(0) : user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{userProfile?.firstName ? `مرحباً، ${userProfile.firstName}`: 'حسابي'}</DropdownMenuLabel>
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
      </header>

      {/* Secondary Navigation Header */}
      <nav className="sticky top-16 hidden md:flex h-12 items-center justify-center gap-8 border-b bg-card/80 backdrop-blur-sm px-6 z-40">
        {menuItems.map((item) => (
            <Link
            key={item.label}
            href={item.href}
            className={`text-sm font-medium transition-colors hover:text-primary ${pathname === item.href ? 'text-primary' : 'text-muted-foreground'}`}
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
