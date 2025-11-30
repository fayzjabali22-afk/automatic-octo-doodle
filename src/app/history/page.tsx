'use client';
import { AppLayout } from '@/components/app-layout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, Query } from 'firebase/firestore';
import { useEffect, useState }from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trip, Notification } from '@/lib/data';
import { Bell } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type TripStatus = 'Awaiting-Offers' | 'Planned' | 'In-Transit' | 'Completed' | 'Cancelled';

const statusMap: Record<string, string> = {
    'all': 'الكل',
    'Awaiting-Offers': 'بانتظار العروض',
    'Planned': 'مؤكدة',
    'In-Transit': 'قيد التنفيذ',
    'Completed': 'مكتملة',
    'Cancelled': 'ملغاة',
}

export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const tripsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    
    const baseQuery = query(collection(firestore, 'trips'), where('userId', '==', user.uid));
    
    if (activeTab === 'all') {
        return baseQuery;
    }
    
    return query(baseQuery, where('status', '==', activeTab));

  }, [firestore, user, activeTab]);

  const { data: trips, isLoading } = useCollection<Trip>(tripsQuery as Query<Trip> | null);
  
  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'notifications'),
      where('isRead', '==', false)
    );
  }, [firestore, user]);

  const { data: notifications } = useCollection<Notification>(notificationsQuery);
  const notificationCount = notifications?.length || 0;


  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 grid gap-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
            </div>
             <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
        return renderSkeleton();
    }
    if (!trips || trips.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">لا توجد حجوزات تطابق هذا الفلتر.</p>
            </div>
        );
    }
    return (
        <>
        {/* For larger screens, use a table */}
        <div className="hidden md:block">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>معرّف الحجز</TableHead>
                <TableHead>الانطلاق</TableHead>
                <TableHead>الوجهة</TableHead>
                <TableHead>تاريخ المغادرة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراء</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {trips.map((trip) => (
                <TableRow key={trip.id}>
                <TableCell className="font-medium">{trip.id.substring(0,7).toUpperCase()}</TableCell>
                <TableCell>{trip.origin}</TableCell>
                <TableCell>{trip.destination}</TableCell>
                <TableCell>{new Date(trip.departureDate).toLocaleDateString()}</TableCell>
                <TableCell>
                    <Badge variant={
                    trip.status === 'Completed' ? 'default' :
                    trip.status === 'In-Transit' ? 'secondary' :
                    trip.status === 'Cancelled' ? 'destructive' :
                    'outline'
                    }>{statusMap[trip.status] || trip.status}</Badge>
                </TableCell>
                <TableCell>
                    <Button variant="outline" size="sm">عرض التفاصيل</Button>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
        </div>
        {/* For mobile screens, use a list of cards */}
        <div className="md:hidden space-y-4">
        {trips.map((trip) => (
            <Card key={trip.id} className="w-full">
            <CardContent className="p-4 grid gap-3">
                <div className="flex justify-between items-center">
                    <span className="font-medium text-lg">{trip.id.substring(0,7).toUpperCase()}</span>
                    <Badge variant={
                        trip.status === 'Completed' ? 'default' :
                        trip.status === 'In-Transit' ? 'secondary' :
                        trip.status === 'Cancelled' ? 'destructive' :
                        'outline'
                    }>{statusMap[trip.status] || trip.status}</Badge>
                </div>
                <div className="text-muted-foreground text-sm">
                    <p>من: {trip.origin}</p>
                    <p>إلى: {trip.destination}</p>
                </div>
                <div className="flex justify-between items-center pt-2">
                    <p className="text-sm">المغادرة: {new Date(trip.departureDate).toLocaleDateString()}</p>
                    <Button variant="outline" size="sm">عرض التفاصيل</Button>
                </div>
            </CardContent>
            </Card>
        ))}
        </div>
        </>
    );
  }

  if (isUserLoading) {
    return (
      <AppLayout>
        <div className="bg-[#130609] p-4 md:p-8 rounded-lg">
          <Card>
            <CardHeader>
              <CardTitle>حجوزاتي</CardTitle>
              <CardDescription>عرض وإدارة حجوزات رحلاتك الحالية والسابقة.</CardDescription>
            </CardHeader>
            <CardContent>
              {renderSkeleton()}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="bg-[#130609] p-4 md:p-8 rounded-lg">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>حجوزاتي</CardTitle>
                    <CardDescription>عرض وإدارة حجوزات رحلاتك الحالية والسابقة.</CardDescription>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="h-5 w-5" />
                        {notificationCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 text-xs">
                            {notificationCount}
                        </Badge>
                        )}
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {notifications && notifications.length > 0 ? (
                        notifications.map((notif) => (
                        <DropdownMenuItem
                            key={notif.id}
                            className="flex flex-col items-start gap-1"
                        >
                            <p className="font-bold">{notif.title}</p>
                            <p className="text-xs text-muted-foreground">
                            {notif.message}
                            </p>
                        </DropdownMenuItem>
                        ))
                    ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                        لا توجد إشعارات جديدة.
                        </div>
                    )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
             <Tabs dir="rtl" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 mb-4">
                    <TabsTrigger value="all">الكل</TabsTrigger>
                    <TabsTrigger value="Awaiting-Offers">بانتظار العروض</TabsTrigger>
                    <TabsTrigger value="Planned">مؤكدة</TabsTrigger>
                    <TabsTrigger value="Completed">مكتملة</TabsTrigger>
                    <TabsTrigger value="Cancelled">ملغاة</TabsTrigger>
                </TabsList>
                {Object.keys(statusMap).map(statusKey => (
                    <TabsContent key={statusKey} value={statusKey}>
                        {renderContent()}
                    </TabsContent>
                ))}
             </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

    