'use client';

import { useAdmin } from '@/hooks/use-admin';
import Link from 'next/link';
import {
  Bell,
  Home,
  Users,
  Ship,
  Package,
  LineChart,
  Settings,
  CircleUser,
  Menu,
  ShieldCheck,
  ArrowRightLeft,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
// --- بداية التصحيح ---
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
// --- نهاية التصحيح ---
import { Logo } from '@/components/logo';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';
import { GuideTrigger } from '@/components/ai/guide-trigger';

export default function AdminLayout({ children }: { children: ReactNode }) {
  // The useAdmin hook is now deactivated and will not trigger loading or redirects.
  const { isLoading: isAdminLoading } = useAdmin();
  const { profile, user } = useUserProfile();
  const router = useRouter();

  const isDevUser = user?.email === 'dev@safar.com';

  // The loading screen is no longer needed as useAdmin is bypassed.
  // if (isAdminLoading) {
  //   return <AdminLoadingScreen />;
  // }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]" dir="rtl">
      <aside className="hidden border-l bg-card md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/admin" className="flex items-center gap-2 font-semibold">
              <Logo />
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <Home className="h-4 w-4" />
                لوحة التحكم
              </Link>
              <Link
                href="/admin/trips"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <Ship className="h-4 w-4" />
                إدارة الرحلات
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-primary transition-all hover:text-primary"
              >
                <Users className="h-4 w-4" />
                إدارة المستخدمين
                <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                  6
                </Badge>
              </Link>
              <Link
                href="#"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <LineChart className="h-4 w-4" />
                الإحصائيات
              </Link>
            </nav>
          </div>
          <div className="mt-auto p-4">
            <Card>
              <CardHeader className="p-2 pt-0 md:p-4">
                <CardTitle>تحتاج مساعدة؟</CardTitle>
                <CardDescription>
                  تواصل مع الدعم الفني لأي استفسار.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
                <Button size="sm" className="w-full">
                  تواصل مع الدعم
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </aside>
      <div className="flex flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <div className='flex items-center gap-4'>
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 md:hidden"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex flex-col">
                <nav className="grid gap-2 text-lg font-medium">
                  <Link
                    href="#"
                    className="flex items-center gap-2 text-lg font-semibold"
                  >
                    <Logo />
                  </Link>
                  <Link
                    href="/admin"
                    className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                  >
                    <Home className="h-5 w-5" />
                    لوحة التحكم
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
            <div className="w-full flex-1 md:hidden">
              <Link href="/admin">
                <Logo />
              </Link>
            </div>
          </div>
          
          <div className='flex items-center gap-4'>
            {isDevUser && (
                <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}>
                    <ArrowRightLeft className="h-4 w-4"/>
                </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <CircleUser className="h-5 w-5" />
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>مرحباً، {profile?.firstName || 'أيها المدير'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>الإعدادات</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>تسجيل الخروج</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
      <GuideTrigger />
    </div>
  );
}
