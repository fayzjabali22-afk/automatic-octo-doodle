
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trip, Notification } from '@/lib/data';
import { collection, query, where } from 'firebase/firestore';
import { Bell, CheckCircle, PackageOpen, X, Ship, Star, MessageSquare, AlertCircle, Phone, Pencil, SendHorizonal, Paperclip } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const statusMap: Record<string, string> = {
    'Awaiting-Offers': 'بانتظار العروض',
    'Planned': 'مؤكدة',
    'Completed': 'مكتملة',
    'Cancelled': 'ملغاة',
}

const statusVariantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    'Awaiting-Offers': 'outline',
    'Planned': 'secondary',
    'Completed': 'default',
    'Cancelled': 'destructive',
}

export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);
  
  const awaitingTripsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'trips'), where('userId', '==', user.uid), where('status', '==', 'Awaiting-Offers'));
  }, [firestore, user]);

  const confirmedTripsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'trips'), where('userId', '==', user.uid), where('status', 'in', ['Planned', 'Completed', 'Cancelled']));
  }, [firestore, user]);

  const { data: awaitingTrips, isLoading: isLoadingAwaiting } = useCollection<Trip>(awaitingTripsQuery);
  const { data: confirmedTrips, isLoading: isLoadingConfirmed } = useCollection<Trip>(confirmedTripsQuery);

  const hasAwaitingOffers = !isLoadingAwaiting && awaitingTrips && awaitingTrips.length > 0;
  const hasConfirmedTrips = !isLoadingConfirmed && confirmedTrips && confirmedTrips.length > 0;
  
  const notifications: Notification[] = []; // This will be connected to Firestore later
  const notificationCount = notifications?.length || 0;

  useEffect(() => {
    if (!isUserLoading && !user) {
        router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (isLoadingAwaiting || isLoadingConfirmed) return;
    
    if (hasAwaitingOffers) {
        setOpenAccordion('awaiting');
    } else if (hasConfirmedTrips) {
        setOpenAccordion('confirmed');
    } else {
        setOpenAccordion(undefined);
    }
  }, [hasAwaitingOffers, hasConfirmedTrips, isLoadingAwaiting, isLoadingConfirmed]);


  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
    </div>
  );

  if (isUserLoading) return <AppLayout>{renderSkeleton()}</AppLayout>;


  return (
    <AppLayout>
      <div className="bg-[#130609] p-2 md:p-8 rounded-lg space-y-8">
        <Card style={{ backgroundColor: '#EDC17C' }}>
          <CardHeader className="p-4">
            <div className="flex justify-between items-start">
              <div className="text-black">
                <CardTitle>إدارة الحجز</CardTitle>
                <CardDescription className="text-black/80">تابع العروض والحجوزات من هنا</CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative text-black hover:bg-black/10">
                    <Bell className="h-5 w-5" />
                    {notificationCount > 0 && <Badge className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 text-xs">{notificationCount}</Badge>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications?.length > 0 ? (
                    notifications.map((notif) => (
                      <DropdownMenuItem key={notif.id} className="flex flex-col items-start gap-1">
                        <p className="font-bold">{notif.title}</p>
                        <p className="text-xs text-muted-foreground">{notif.message}</p>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">لا توجد إشعارات جديدة.</div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
        </Card>

        <Accordion type="single" collapsible className="w-full space-y-6" value={openAccordion} onValueChange={setOpenAccordion}>
          
          {isLoadingAwaiting && renderSkeleton()}
          {!isLoadingAwaiting && awaitingTrips && awaitingTrips.length > 0 && (
            <AccordionItem value="awaiting" className="border-none">
              <Card>
                <AccordionTrigger className="p-6 text-lg hover:no-underline">
                  <div className='flex items-center gap-2'><PackageOpen className="h-6 w-6 text-primary" /><CardTitle>طلبات بانتظار العروض</CardTitle></div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent>
                    <CardDescription className="mb-4">
                      هنا تظهر طلباتك التي أرسلتها. قريباً ستتمكن من رؤية العروض من الناقلين هنا.
                    </CardDescription>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>من</TableHead>
                          <TableHead>إلى</TableHead>
                          <TableHead>تاريخ الطلب</TableHead>
                          <TableHead>الحالة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {awaitingTrips.map(trip => (
                          <TableRow key={trip.id}>
                            <TableCell>{trip.origin}</TableCell>
                            <TableCell>{trip.destination}</TableCell>
                            <TableCell>{new Date(trip.departureDate).toLocaleDateString('ar-SA')}</TableCell>
                            <TableCell><Badge variant={statusVariantMap[trip.status]}>{statusMap[trip.status]}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          )}
          
          {isLoadingConfirmed && renderSkeleton()}
          {!isLoadingConfirmed && confirmedTrips && confirmedTrips.length > 0 && (
              <AccordionItem value="confirmed" className="border-none">
                <Card>
                  <AccordionTrigger className="p-6 text-lg hover:no-underline">
                    <div className='flex items-center gap-2'><CheckCircle className="h-6 w-6 text-green-500" /><CardTitle>رحلاتي السابقة والمؤكدة</CardTitle></div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="space-y-6">
                      <CardDescription className="mb-4">سجل رحلاتك التي قمت بحجزها بالفعل.</CardDescription>
                      <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>الناقل</TableHead>
                                <TableHead>من</TableHead>
                                <TableHead>إلى</TableHead>
                                <TableHead>تاريخ الرحلة</TableHead>
                                <TableHead>الحالة</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {confirmedTrips.map(trip => (
                               <TableRow key={trip.id}>
                                  <TableCell>{trip.carrierName || 'غير محدد'}</TableCell>
                                  <TableCell>{trip.origin}</TableCell>
                                  <TableCell>{trip.destination}</TableCell>
                                  <TableCell>{new Date(trip.departureDate).toLocaleDateString('ar-SA')}</TableCell>
                                  <TableCell><Badge variant={statusVariantMap[trip.status]}>{statusMap[trip.status]}</Badge></TableCell>
                               </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            )
          }
        </Accordion>
        
        {!isLoadingAwaiting && !isLoadingConfirmed && !hasAwaitingOffers && !hasConfirmedTrips && (
            <div className="text-center text-muted-foreground py-12">
                <Ship className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg">لا يوجد لديك أي حجوزات أو طلبات حالياً.</p>
                <p className="text-sm mt-2">يمكنك البحث عن رحلة أو طلب حجز جديد من لوحة التحكم.</p>
                <Button onClick={() => router.push('/dashboard')} className="mt-4">الذهاب إلى لوحة التحكم</Button>
            </div>
        )}

      </div>
    </AppLayout>
  );
}
