'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Route, Search, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export function QuickActions() {
  return (
    <div>
        <div className="grid gap-4 md:grid-cols-1">
            <Card className="flex flex-col justify-between hover:bg-card/80 transition-colors w-full">
                <CardHeader>
                    <CardTitle>سوق الطلبات المتاحة</CardTitle>
                    <CardDescription>
                        استعرض الطلبات المتاحة في السوق وقدم أفضل عروضك.
                    </CardDescription>
                </CardHeader>
                <div className="p-4 pt-0">
                    <Button asChild className="w-full">
                        <Link href="/carrier/requests">
                            <Search className="ml-2 h-4 w-4" />
                            الذهاب إلى السوق
                        </Link>
                    </Button>
                </div>
            </Card>
            <Card className="flex flex-col justify-between hover:bg-card/80 transition-colors w-full">
                <CardHeader>
                    <CardTitle>إدارة رحلاتي المجدولة</CardTitle>
                    <CardDescription>
                        أضف رحلات جديدة بمسار وأسعار محددة، وتابع رحلاتك الحالية.
                    </CardDescription>
                </CardHeader>
                 <div className="p-4 pt-0">
                    <Button asChild className="w-full">
                        <Link href="/carrier/trips">
                            <Route className="ml-2 h-4 w-4" />
                            إدارة الرحلات
                        </Link>
                    </Button>
                </div>
            </Card>
             <Card className="flex flex-col justify-between hover:bg-card/80 transition-colors w-full">
                <CardHeader>
                    <CardTitle>النظرة السريعة</CardTitle>
                    <CardDescription>
                       عرض ملخص إحصائيات الأداء والأرباح.
                    </CardDescription>
                </CardHeader>
                 <div className="p-4 pt-0">
                    <Button asChild className="w-full">
                        <Link href="/carrier/overview">
                            <BarChart3 className="ml-2 h-4 w-4" />
                            عرض الإحصائيات
                        </Link>
                    </Button>
                </div>
            </Card>
        </div>
    </div>
  );
}
