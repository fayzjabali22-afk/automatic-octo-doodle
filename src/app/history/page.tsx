
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
import { collection, query, where, Query, or } from 'firebase/firestore';
import { useEffect, useState }from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trip, Notification } from '@/lib/data';
import { Bell, FileText, CheckCircle, PackageOpen } from 'lucide-react';

const statusMap: Record<string, string> = {
    'Awaiting-Offers': 'بانتظار العروض',
    'Planned': 'مؤكدة',
    'In-Transit': 'قيد التنفيذ',
    'Completed': 'مكتملة',
    'Cancelled': 'ملغاة',
}

const statusVariantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    'Awaiting-Offers': 'outline',
    'Planned': 'secondary',
    'In-Transit': 'default',
    'Completed': 'default',
    'Cancelled': 'destructive',
}


export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // --- Queries for the two main states ---
  const awaitingOffersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'trips'), 
      where('userId', '==', user.uid),
      where('status', '==', 'Awaiting-Offers')
    );
  }, [firestore, user]);

  const confirmedTripsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'trips'), 
      where('userId', '==', user.uid),
      where('status', 'in', ['Planned', 'In-Transit', 'Completed', 'Cancelled'])
    );
  }, [firestore, user]);

  const { data: awaitingTrips, isLoading: isLoadingAwaiting } = useCollection<Trip>(awaitingOffersQuery as Query<Trip> | null);
  const { data: confirmedTrips, isLoading: isLoadingConfirmed } = useCollection<Trip>(confirmedTripsQuery as Query<Trip> | null);
  
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
      {[...Array(2)].map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );

  const TripList = ({ trips, isLoading }: { trips: Trip[] | null, isLoading: boolean }) => {
    if (isLoading) return renderSkeleton();
    if (!trips || trips.length === 0) {
      return <p className="text-center text-muted-foreground py-4">لا توجد رحلات لعرضها في هذا القسم.</p>;
    }
    
    // Mobile View: Cards
    return (
        <div className="md:hidden space-y-4">
            {trips.map((trip) => (
                <Card key={trip.id} className="w-full">
                    <CardContent className="p-4 grid gap-3">
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-lg">{trip.id.substring(0,7).toUpperCase()}</span>
                            <Badge variant={statusVariantMap[trip.status] || 'outline'}>
                                {statusMap[trip.status] || trip.status}
                            </Badge>
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
    );
  };

  const TripTable = ({ trips, isLoading }: { trips: Trip[] | null, isLoading: boolean }) => {
      if (isLoading) return renderSkeleton();
      if (!trips || trips.length === 0) {
        return <p className="text-center text-muted-foreground py-4">لا توجد رحلات لعرضها في هذا القسم.</p>;
      }
      return (
        <div className="hidden md:block border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>معرّف الطلب</TableHead>
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
                                <Badge variant={statusVariantMap[trip.status] || 'outline'}>
                                    {statusMap[trip.status] || trip.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Button variant="outline" size="sm">عرض التفاصيل</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
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
      <div className="bg-[#130609] p-4 md:p-8 rounded-lg space-y-8">
        
        {/* Header with Notifications */}
        <Card>
           <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>لوحة تحكم المسافر</CardTitle>
                    <CardDescription>تابع طلباتك ورحلاتك المؤكدة من هنا.</CardDescription>
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
        </Card>

        {/* Section 1: Awaiting Offers */}
        <Card>
            <CardHeader>
                <div className='flex items-center gap-2'>
                    <PackageOpen className="h-6 w-6 text-primary" />
                    <CardTitle>طلباتي المعلقة</CardTitle>
                </div>
                <CardDescription>هنا تظهر طلباتك التي قمت بنشرها وتنتظر عروضاً من الناقلين.</CardDescription>
            </CardHeader>
            <CardContent>
                <TripList trips={awaitingTrips} isLoading={isLoadingAwaiting} />
                <TripTable trips={awaitingTrips} isLoading={isLoadingAwaiting} />
            </CardContent>
        </Card>

        {/* Section 2: Confirmed Trips */}
        <Card>
            <CardHeader>
                <div className='flex items-center gap-2'>
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <CardTitle>رحلاتي المؤكدة</CardTitle>
                </div>
                <CardDescription>تابع رحلاتك التي قمت بحجزها بالفعل وأي تحديثات عليها.</CardDescription>
            </CardHeader>
            <CardContent>
                <TripList trips={confirmedTrips} isLoading={isLoadingConfirmed} />
                <TripTable trips={confirmedTrips} isLoading={isLoadingConfirmed} />
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
