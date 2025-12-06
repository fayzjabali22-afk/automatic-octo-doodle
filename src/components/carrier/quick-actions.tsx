'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Route, Search } from 'lucide-react';
import Link from 'next/link';

export function QuickActions() {
  return (
    <div>
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            <Card className="flex flex-col justify-between hover:bg-card/80 transition-colors w-full">
                <CardHeader>
                    <CardTitle>مركز الفرص</CardTitle>
                    <CardDescription>
                        استعرض كل الطلبات المتاحة (العامة والمباشرة) وقدم أفضل عروضك.
                    </CardDescription>
                </CardHeader>
                <div className="p-4 pt-0">
                    <Button asChild className="w-full">
                        <Link href="/carrier/opportunities">
                            <Search className="ml-2 h-4 w-4" />
                            الذهاب إلى مركز الفرص
                        </Link>
                    </Button>
                </div>
            </Card>
            <Card className="flex flex-col justify-between hover:bg-card/80 transition-colors w-full">
                <CardHeader>
                    <CardTitle>إدارة رحلاتي وحجوزاتي</CardTitle>
                    <CardDescription>
                       أدر رحلاتك النشطة، وقم بتأكيد أو رفض طلبات الحجز الجديدة في شاشة واحدة.
                    </CardDescription>
                </CardHeader>
                 <div className="p-4 pt-0">
                    <Button asChild className="w-full" variant="outline">
                        <Link href="/carrier/trips">
                            <Route className="ml-2 h-4 w-4" />
                            إدارة الرحلات والحجوزات
                        </Link>
                    </Button>
                </div>
            </Card>
        </div>
    </div>
  );
}
