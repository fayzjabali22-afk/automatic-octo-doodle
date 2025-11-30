
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
import { collection, query, where, Query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trip, Notification } from '@/lib/data';
import { Bell, CheckCircle, PackageOpen, X, Ship } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const statusMap: Record<string, string> = {
    'Awaiting-Offers': 'بانتظار العروض',
    'Planned': 'مؤكدة',
    'In-Transit': 'مؤكدة', // For passenger, this is just a confirmed trip
    'Completed': 'مكتملة',
    'Cancelled': 'ملغاة',
}

const statusVariantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    'Awaiting-Offers': 'outline',
    'Planned': 'secondary',
    'In-Transit': 'secondary', // Same as Planned
    'Completed': 'default',
    'Cancelled': 'destructive',
}

// --- START: DUMMY DATA FOR TESTING ---
const dummyAwaitingTrips: Trip[] = [
    { id: 'DUMMY01', userId: 'test-user', origin: 'الرياض', destination: 'عمّان', departureDate: new Date().toISOString(), status: 'Awaiting-Offers', carrierName: '', carrierPhoneNumber: '', cargoDetails: '', vehicleType: '', vehicleCategory: 'small', vehicleModelYear: 2022, availableSeats: 0, passengers: 2 },
];
const dummyConfirmedTrips: Trip[] = [
    { id: 'DUMMY02', userId: 'test-user', origin: 'جدة', destination: 'القاهرة', departureDate: '2024-08-10T20:00:00Z', status: 'Planned', carrierName: 'سفريات الأمان', carrierPhoneNumber: '+966555555555', cargoDetails: 'أمتعة شخصية', vehicleType: 'GMC Yukon', vehicleCategory: 'small', vehicleModelYear: 2023, availableSeats: 0, passengers: 1 },
    { id: 'DUMMY03', userId: 'test-user', origin: 'الدمام', destination: 'دبي', departureDate: '2024-07-25T09:15:00Z', status: 'In-Transit', carrierName: 'الناقل الدولي', carrierPhoneNumber: '+966588884444', cargoDetails: 'مواد بناء', vehicleType: 'Ford Transit', vehicleCategory: 'bus', vehicleModelYear: 2021, availableSeats: 0, passengers: 4 },
    { id: 'DUMMY04', userId: 'test-user', origin: 'عمان', destination: 'الرياض', departureDate: '2024-07-15T12:00:00Z', status: 'Completed', carrierName: 'شركة النقل السريع', carrierPhoneNumber: '+966501234567', cargoDetails: 'أغراض شخصية', vehicleType: 'Hyundai Staria', vehicleCategory: 'small', vehicleModelYear: 2024, availableSeats: 0, passengers: 3 },
];

const dummyOffers = [
    { id: 'OFFER01', carrierName: 'شركة النقل السريع', price: 150, rating: 4.8, vehicle: 'GMC Yukon 2023' },
    { id: 'OFFER02', carrierName: 'سفريات الأمان', price: 140, rating: 4.5, vehicle: 'Mercedes Sprinter 2022' },
];
// --- END: DUMMY DATA FOR TESTING ---


export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [openAccordion, setOpenAccordion] = useState<string | undefined>();

  // State for Dialogs
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isOffersDialogOpen, setIsOffersDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);

  // Use dummy data for now
  // const awaitingTrips: Trip[] | null = dummyAwaitingTrips;
  const awaitingTrips: Trip[] | null = [];
  const isLoadingAwaiting = false;
  const confirmedTrips: Trip[] | null = dummyConfirmedTrips;
  const isLoadingConfirmed = false;
  
  const notifications: Notification[] = []; // Dummy notifications
  const notificationCount = notifications?.length || 0;

  const hasAwaitingTrips = !isLoadingAwaiting && awaitingTrips && awaitingTrips.length > 0;

  useEffect(() => {
    if (!isUserLoading && !user) router.push('/login');
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (isLoadingAwaiting || isLoadingConfirmed) return;
    
    if (hasAwaitingTrips) {
        setOpenAccordion('awaiting');
    } else if (confirmedTrips && confirmedTrips.length > 0) {
        setOpenAccordion('confirmed');
    } else {
        setOpenAccordion(undefined);
    }
  }, [hasAwaitingTrips, confirmedTrips, isLoadingAwaiting, isLoadingConfirmed]);


  const handleOpenOffers = (trip: Trip) => {
    setSelectedTrip(trip);
    setIsOffersDialogOpen(true);
  };

  const handleOpenTicket = (trip: Trip) => {
    setSelectedTrip(trip);
    setIsTicketDialogOpen(true);
  };

  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
    </div>
  );

  const TripList = ({ trips, onActionClick, noDataMessage, getActionLabel }: { trips: Trip[] | null, onActionClick: (trip: Trip) => void, noDataMessage: string, getActionLabel: (trip: Trip) => string }) => {
    if (isLoadingAwaiting || isLoadingConfirmed) return renderSkeleton();
    if (!trips || trips.length === 0) return <p className="text-center text-muted-foreground py-4">{noDataMessage}</p>;
    
    return (
        <div className="md:hidden space-y-4">
          {trips.map((trip) => (
            <Card key={trip.id} className="w-full">
              <CardContent className="p-4 grid gap-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-lg">{trip.id.substring(0, 7).toUpperCase()}</span>
                  <Badge variant={statusVariantMap[trip.status] || 'outline'}>{statusMap[trip.status] || trip.status}</Badge>
                </div>
                <div className="text-muted-foreground text-sm">
                  <p>من: {trip.origin}</p>
                  <p>إلى: {trip.destination}</p>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <p className="text-sm">المغادرة: {new Date(trip.departureDate).toLocaleDateString()}</p>
                  <Button variant="outline" size="sm" onClick={() => onActionClick(trip)}>
                    {getActionLabel(trip)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
    );
  };

  const TripTable = ({ trips, onActionClick, noDataMessage, getActionLabel }: { trips: Trip[] | null, onActionClick: (trip: Trip) => void, noDataMessage: string, getActionLabel: (trip: Trip) => string }) => {
    if (isLoadingAwaiting || isLoadingConfirmed) {
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
                        {[...Array(2)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-8 w-28" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
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
                {!trips || trips.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                           {noDataMessage}
                        </TableCell>
                    </TableRow>
                ) : (
                trips.map((trip) => (
                    <TableRow key={trip.id}>
                    <TableCell className="font-medium">{trip.id.substring(0, 7).toUpperCase()}</TableCell>
                    <TableCell>{trip.origin}</TableCell>
                    <TableCell>{trip.destination}</TableCell>
                    <TableCell>{new Date(trip.departureDate).toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant={statusVariantMap[trip.status] || 'outline'}>{statusMap[trip.status] || trip.status}</Badge></TableCell>
                    <TableCell>
                        <Button variant="outline" size="sm" onClick={() => onActionClick(trip)}>
                            {getActionLabel(trip)}
                        </Button>
                    </TableCell>
                    </TableRow>
                ))
                )}
            </TableBody>
            </Table>
        </div>
    );
  };
  
    const getConfirmedTripActionLabel = (trip: Trip): string => {
        if (trip.status === 'Completed') {
            return 'إغلاق الرحلة';
        }
        // For passenger, 'Planned' and 'In-Transit' both mean "Follow-up"
        return 'متابعة الرحلة';
    };
    
    const getAwaitingTripActionLabel = (): string => {
        return "استعراض العروض";
    };


  if (isUserLoading) return <AppLayout>{renderSkeleton()}</AppLayout>;


  return (
    <AppLayout>
      <div className="bg-[#130609] p-4 md:p-8 rounded-lg space-y-8">
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
          <AccordionItem value="awaiting" className="border-none">
            <Card>
              <AccordionTrigger className="p-6 text-lg hover:no-underline data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed" disabled={!hasAwaitingTrips}>
                <div className='flex items-center gap-2'><PackageOpen className="h-6 w-6 text-primary" /><CardTitle>طلباتي المعلقة</CardTitle></div>
              </AccordionTrigger>
              <AccordionContent>
                <CardContent>
                  <CardDescription className="mb-4">هنا تظهر طلباتك التي قمت بنشرها وتنتظر عروضاً من الناقلين.</CardDescription>
                  <TripList trips={awaitingTrips} onActionClick={handleOpenOffers} getActionLabel={() => getAwaitingTripActionLabel()} noDataMessage="ليس لديك طلبات تبحث عن ناقل." />
                  <TripTable trips={awaitingTrips} onActionClick={handleOpenOffers} getActionLabel={() => getAwaitingTripActionLabel()} noDataMessage="ليس لديك طلبات تبحث عن ناقل." />
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>
          
          <AccordionItem value="confirmed" className="border-none">
            <Card>
              <AccordionTrigger className="p-6 text-lg hover:no-underline">
                <div className='flex items-center gap-2'><CheckCircle className="h-6 w-6 text-green-500" /><CardTitle>رحلاتي المؤكدة</CardTitle></div>
              </AccordionTrigger>
              <AccordionContent>
                <CardContent>
                  <CardDescription className="mb-4">تابع رحلاتك التي قمت بحجزها بالفعل وأي تحديثات عليها.</CardDescription>
                  <TripList trips={confirmedTrips} onActionClick={handleOpenTicket} getActionLabel={getConfirmedTripActionLabel} noDataMessage="ليس لديك حجوزات مؤكدة حاليًا." />
                  <TripTable trips={confirmedTrips} onActionClick={handleOpenTicket} getActionLabel={getConfirmedTripActionLabel} noDataMessage="ليس لديك حجوزات مؤكدة حاليًا." />
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Offers Dialog */}
      <Dialog open={isOffersDialogOpen} onOpenChange={setIsOffersDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>عروض الناقلين لرحلة {selectedTrip?.id.substring(0, 7).toUpperCase()}</DialogTitle>
            <DialogDescription>من {selectedTrip?.origin} إلى {selectedTrip?.destination}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             {dummyOffers.map(offer => (
                <Card key={offer.id} className="flex items-center justify-between p-4">
                    <div>
                        <p className="font-bold">{offer.carrierName}</p>
                        <p className="text-sm text-muted-foreground">{offer.vehicle}</p>
                        <p className="text-sm">التقييم: {offer.rating} نجوم</p>
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-lg text-primary">{offer.price} ريال</p>
                        <Button size="sm" onClick={() => setIsOffersDialogOpen(false)}>قبول الحجز</Button>
                    </div>
                </Card>
             ))}
             {dummyOffers.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                    <Ship className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-lg">لم تصل أي عروض بعد</p>
                    <p className="text-sm mt-2">سيتم إشعارك فور وصول أول عرض.</p>
                </div>
             )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* E-Ticket Dialog */}
      <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>تذكرة إلكترونية - {selectedTrip?.id.substring(0, 7).toUpperCase()}</DialogTitle>
            <DialogDescription>تفاصيل رحلتك المؤكدة.</DialogDescription>
          </DialogHeader>
          {selectedTrip && (
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <p><strong>الحالة:</strong> <Badge variant={statusVariantMap[selectedTrip.status] || 'outline'}>{statusMap[selectedTrip.status] || selectedTrip.status}</Badge></p>
                    <p><strong>الناقل:</strong> {selectedTrip.carrierName}</p>
                    <p><strong>رقم التواصل:</strong> {selectedTrip.carrierPhoneNumber}</p>
                    <p><strong>المركبة:</strong> {selectedTrip.vehicleType} - موديل {selectedTrip.vehicleModelYear}</p>
                </div>
                {selectedTrip.status === 'Completed' && (
                    <div className="border-t pt-4 mt-2">
                         <Label htmlFor="rating-notes">تقييم الرحلة</Label>
                         <Textarea id="rating-notes" placeholder="أخبرنا عن تجربتك مع الناقل..." className="mt-2" />
                         <Button className="mt-2 w-full">إرسال التقييم</Button>
                    </div>
                )}
                 {(selectedTrip.status === 'Planned' || selectedTrip.status === 'In-Transit') && (
                    <Button variant="destructive" className="w-full mt-4">إلغاء الحجز</Button>
                )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTicketDialogOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

    