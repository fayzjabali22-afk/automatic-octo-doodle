
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trip, Notification, Offer, Booking } from '@/lib/data';
import { collection, query, where, doc, writeBatch, getDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { Bell, CheckCircle, PackageOpen, Ship, Hourglass, XCircle, Info, Loader2, CreditCard } from 'lucide-react';
import { OfferCard } from '@/components/offer-card';
import { useToast } from '@/hooks/use-toast';
import { mockOffers } from '@/lib/data';
import { TripReportCard } from '@/components/trip-report-card';


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

const cities: { [key: string]: string } = {
    damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص',
    amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
    riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام',
    cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة',
    dubai: 'دبي', kuwait: 'الكويت'
};

const TripOfferManager = ({ trip }: { trip: Trip; }) => {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();

    const offersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, `trips/${trip.id}/offers`), where("status", "==", "Pending"));
    }, [firestore, trip.id]);

    const { data: offers, isLoading: isLoadingOffers } = useCollection<Offer>(offersQuery);

    const acceptedOfferRef = useMemoFirebase(() => {
        if (!firestore || !trip.acceptedOfferId) return null;
        return doc(firestore, `trips/${trip.id}/offers`, trip.acceptedOfferId);
    }, [firestore, trip.id, trip.acceptedOfferId]);

    const { data: acceptedOffer, isLoading: isLoadingOffer } = useDoc<Offer>(acceptedOfferRef);

    const bookingRef = useMemoFirebase(() => {
        if (!firestore || !trip.currentBookingId) return null;
        return doc(firestore, 'bookings', trip.currentBookingId);
    }, [firestore, trip.currentBookingId]);

    const { data: booking, isLoading: isLoadingBooking } = useDoc<Booking>(bookingRef);

    const handleAcceptOffer = async (selectedOffer: Offer) => {
        if (!firestore || !user) return;
        
        toast({ title: "جاري تأكيد الحجز...", description: "يرجى الانتظار."});

        const batch = writeBatch(firestore);
        const newBookingRef = doc(collection(firestore, 'bookings'));

        try {
            // Simplified Flow: Immediately set to Pending-Payment
            const newBooking: Omit<Booking, 'id'> = {
                tripId: trip.id,
                userId: user.uid,
                carrierId: selectedOffer.carrierId,
                seats: trip.passengers || 1,
                status: 'Pending-Payment', // Directly set to Pending-Payment
                totalPrice: selectedOffer.price,
            };
            batch.set(newBookingRef, newBooking);
            
            const tripRef = doc(firestore, 'trips', trip.id);
            batch.update(tripRef, {
                acceptedOfferId: selectedOffer.id,
                currentBookingId: newBookingRef.id,
                status: 'Planned'
            });
            
            const offerRef = doc(firestore, `trips/${trip.id}/offers`, selectedOffer.id);
            batch.update(offerRef, { status: 'Accepted' });

            // Notification for the user about the confirmation
            const userNotifRef = doc(collection(firestore, `users/${user.uid}/notifications`));
            const userNotification: Partial<Notification> = {
                userId: user.uid,
                title: "تم تأكيد طلب الحجز!",
                message: "تم تأكيد حجزك من قبل الناقل. يمكنك الآن الدفع.",
                type: 'booking_confirmed',
                isRead: false,
                createdAt: serverTimestamp() as unknown as string,
                link: `/history`
            };
            batch.set(userNotifRef, userNotification);

            await batch.commit();

            toast({
                title: "تم تأكيد الحجز بنجاح",
                description: "يمكنك الآن المتابعة إلى الدفع.",
            });

        } catch (error) {
             const permissionError = new FirestorePermissionError({
                path: `batch write including bookings, trips, offers, and notifications`,
                operation: 'write',
                requestResourceData: { 
                    bookingStatus: 'Pending-Payment', 
                    tripId: trip.id,
                    offerId: selectedOffer.id,
                },
            });
            errorEmitter.emit('permission-error', permissionError);

            toast({
                title: "حدث خطأ",
                description: "لم نتمكن من تأكيد الحجز. يرجى المحاولة مرة أخرى.",
                variant: "destructive",
            });
        }
    };
    
    // If there's an active booking, show the trip report card
    if (trip.status === 'Planned' && booking && acceptedOffer) {
        return <TripReportCard trip={trip} booking={booking} offer={acceptedOffer} />;
    }
    
    // If we are loading booking information, show a loader
    if (isLoadingBooking || isLoadingOffer) {
        return (
            <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mr-4">جاري تحميل بيانات الحجز...</p>
            </div>
        )
    }


    const availableOffers = offers && offers.length > 0 ? offers : mockOffers.filter(o => o.tripId === trip.id);

    return (
        <>
            <div className="p-4 space-y-4">
                {isLoadingOffers ? (
                    <div className="flex justify-center items-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : availableOffers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {availableOffers.map(offer => (
                            <OfferCard key={offer.id} offer={offer} trip={trip} onAccept={() => handleAcceptOffer(offer)} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground p-8">لم تصلك أي عروض بعد لهذا الطلب. يمكنك الانتظار أو إلغاء الطلب.</p>
                )}
            </div>
        </>
    );
};


export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const [openAccordion, setOpenAccordion] = useState<string[]>([]);
  
  const userTripsQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return query(collection(firestore, 'trips'), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: allUserTrips, isLoading } = useCollection<Trip>(userTripsQuery);

  const awaitingTrips = allUserTrips?.filter(t => t.status === 'Awaiting-Offers') || [];
  const plannedTrips = allUserTrips?.filter(t => t.status === 'Planned') || [];
  const confirmedTrips: Trip[] = [];
  
  const hasAwaitingOffers = !isLoading && awaitingTrips.length > 0;
  const hasPlannedTrips = !isLoading && plannedTrips.length > 0;
  const hasConfirmedTrips = !isLoading && confirmedTrips.length > 0;
  
  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/notifications`));
  }, [firestore, user]);
  const { data: notifications } = useCollection<Notification>(notificationsQuery);
  const notificationCount = notifications?.filter(n => !n.isRead).length || 0;


  useEffect(() => {
    if (isLoading) return;
    
    const openItems: string[] = [];
    if (hasAwaitingOffers) openItems.push('awaiting');
    if (hasPlannedTrips) openItems.push('planned');
    if (hasConfirmedTrips) openItems.push('confirmed');
    setOpenAccordion(openItems);

  }, [hasAwaitingOffers, hasPlannedTrips, hasConfirmedTrips, isLoading]);


  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
    </div>
  );

  if (isUserLoading && !user) return <AppLayout>{renderSkeleton()}</AppLayout>;


  return (
    <AppLayout>
      <div className="bg-[#130609] p-0 md:p-0 rounded-lg space-y-8">
        <Card style={{ backgroundColor: '#EDC17C' }} className="rounded-none md:rounded-lg">
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

        <Accordion type="multiple" className="w-full space-y-6 px-0 md:px-0" value={openAccordion} onValueChange={setOpenAccordion}>
          
          {(isLoading && !allUserTrips) && renderSkeleton()}
          
          {hasAwaitingOffers && (
            <AccordionItem value="awaiting" className="border-none">
              <Card className="rounded-none md:rounded-lg">
                <AccordionTrigger className="p-6 text-lg hover:no-underline">
                  <div className='flex items-center gap-2'><PackageOpen className="h-6 w-6 text-primary" /><CardTitle>طلبات بانتظار العروض</CardTitle></div>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  <CardDescription className="mb-4 px-6">
                    هنا تظهر طلباتك التي أرسلتها. يمكنك استعراض العروض المقدمة من الناقلين لكل طلب.
                  </CardDescription>
                  <Accordion type="single" collapsible className="w-full">
                       {awaitingTrips.map(trip => {
                            return (
                                <AccordionItem value={trip.id} key={trip.id} className="border-none">
                                    <Card className="overflow-hidden rounded-none">
                                        <AccordionTrigger className="p-4 bg-card/80 hover:no-underline data-[state=closed]:rounded-b-none">
                                            <div className="flex justify-between items-center w-full">
                                                <div className="text-right">
                                                    <div className="flex items-center gap-3">
                                                        <p className="font-bold text-base">{cities[trip.origin as keyof typeof cities] || trip.origin} إلى {cities[trip.destination as keyof typeof cities] || trip.destination}</p>
                                                        <p className="text-sm text-muted-foreground">({new Date(trip.departureDate).toLocaleDateString('ar-SA')})</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-0">
                                            <TripOfferManager trip={trip} />
                                        </AccordionContent>
                                    </Card>
                                </AccordionItem>
                            )
                       })}
                  </Accordion>
                </AccordionContent>
                </Card>
            </AccordionItem>
          )}

          {hasPlannedTrips && (
             <AccordionItem value="planned" className="border-none">
              <Card className="rounded-none md:rounded-lg">
                <AccordionTrigger className="p-6 text-lg hover:no-underline">
                  <div className='flex items-center gap-2'><Hourglass className="h-6 w-6 text-yellow-500" /><CardTitle>حجوزات بانتظار الدفع</CardTitle></div>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                    <Accordion type="single" collapsible className="w-full">
                        {plannedTrips.map(trip => (
                            <AccordionItem value={trip.id} key={trip.id} className="border-none">
                                 <Card className="overflow-hidden rounded-none">
                                    <AccordionTrigger className="p-4 bg-card/80 hover:no-underline data-[state=closed]:rounded-b-none">
                                        <div className="flex justify-between items-center w-full">
                                            <div className="text-right">
                                                <div className="flex items-center gap-3">
                                                    <p className="font-bold text-base">{cities[trip.origin as keyof typeof cities] || trip.origin} إلى {cities[trip.destination as keyof typeof cities] || trip.destination}</p>
                                                    <p className="text-sm text-muted-foreground">({new Date(trip.departureDate).toLocaleDateString('ar-SA')})</p>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-0">
                                        <TripOfferManager trip={trip} />
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </AccordionContent>
              </Card>
            </AccordionItem>
          )}
          
          
          {hasConfirmedTrips && (
              <AccordionItem value="confirmed" className="border-none">
                <Card className="rounded-none md:rounded-lg">
                  <AccordionTrigger className="p-6 text-lg hover:no-underline">
                    <div className='flex items-center gap-2'><CheckCircle className="h-6 w-6 text-green-500" /><CardTitle>رحلاتي السابقة والمؤكدة</CardTitle></div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="space-y-6 p-4 md:p-6">
                      <CardDescription className="mb-4">سجل رحلاتك التي قمت بحجزها بالفعل.</CardDescription>
                      <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-right">الناقل</TableHead>
                                <TableHead className="text-right">من</TableHead>
                                <TableHead className="text-right">إلى</TableHead>
                                <TableHead className="text-right">تاريخ الرحلة</TableHead>
                                <TableHead className="text-right">الحالة</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {confirmedTrips.map(trip => (
                               <TableRow key={trip.id}>
                                  <TableCell>{trip.carrierName || 'غير محدد'}</TableCell>
                                  <TableCell>{cities[trip.origin as keyof typeof cities] || trip.origin}</TableCell>
                                  <TableCell>{cities[trip.destination as keyof typeof cities] || trip.destination}</TableCell>
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
        
        {!isLoading && !allUserTrips?.length && (
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
