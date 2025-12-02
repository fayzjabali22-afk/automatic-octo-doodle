
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
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trip, Notification, Offer, Booking } from '@/lib/data';
import { collection, query, where, doc, writeBatch, getDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { Bell, CheckCircle, PackageOpen, Ship, Hourglass, XCircle, Info, Loader2, CreditCard } from 'lucide-react';
import { OfferCard } from '@/components/offer-card';
import { useToast } from '@/hooks/use-toast';
import { mockOffers, mockCarriers } from '@/lib/data';
import { TripReportCard } from '@/components/trip-report-card';
import { LegalDisclaimerDialog } from '@/components/legal-disclaimer-dialog';


const statusMap: Record<string, string> = {
    'Awaiting-Offers': 'بانتظار العروض',
    'Planned': 'بانتظار الدفع',
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
    const [isAccepting, setIsAccepting] = useState<string | null>(null);
    const [isLegalDisclaimerOpen, setIsLegalDisclaimerOpen] = useState(false);
    const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);


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

    const handleAcceptOfferClick = (offer: Offer) => {
        setSelectedOffer(offer);
        setIsLegalDisclaimerOpen(true);
    };


    const handleLegalConfirm = async () => {
        setIsLegalDisclaimerOpen(false);
        if (!firestore || !user || !selectedOffer || isAccepting) return;

        setIsAccepting(selectedOffer.id);
        toast({ title: "جاري إرسال طلب الحجز...", description: "سنقوم بمحاكاة موافقة الناقل." });

        const bookingDocRef = doc(collection(firestore, 'bookings'));
        const tripDocRef = doc(firestore, 'trips', trip.id);
        const offerDocRef = doc(firestore, `trips/${trip.id}/offers`, selectedOffer.id);

        const batch = writeBatch(firestore);
        
        const carrier = mockCarriers.find(c => c.id === selectedOffer.carrierId);
        
        // 1. Update the trip: Set status to 'Planned', link accepted offer, booking, and carrier info
        batch.update(tripDocRef, {
            status: 'Planned',
            acceptedOfferId: selectedOffer.id,
            currentBookingId: bookingDocRef.id,
            carrierId: selectedOffer.carrierId,
            carrierName: carrier?.name || 'اسم الناقل الوهمي',
        });
        
        // 2. Create the booking document with 'Pending-Payment' status directly
         batch.set(bookingDocRef, {
            tripId: trip.id,
            userId: user.uid,
            carrierId: selectedOffer.carrierId,
            seats: trip.passengers || 1,
            status: 'Pending-Payment', // Directly set to pending payment
            totalPrice: selectedOffer.price,
        });

        // 3. Update the accepted offer status
        batch.update(offerDocRef, { status: 'Accepted' });
        
        // 4. Create a user notification for the confirmed booking
        const userNotifRef = doc(collection(firestore, `users/${user.uid}/notifications`));
        const userNotification: Partial<Notification> = {
            userId: user.uid,
            title: "تم تأكيد الحجز!",
            message: `وافق الناقل على طلبك لرحلة ${cities[trip.origin]} إلى ${cities[trip.destination]}. الرجاء إتمام الدفع.`,
            type: 'booking_confirmed',
            isRead: false,
            createdAt: serverTimestamp() as any,
            link: `/history`
        };
        batch.set(userNotifRef, userNotification);


        try {
            await batch.commit();
            toast({ 
                title: "تم تأكيد الحجز بنجاح!", 
                description: "تم تحديث حالة حجزك وهو الآن بانتظار الدفع.",
                duration: 5000,
            });

        } catch (err) {
            console.error("Error accepting offer:", err);
            toast({ 
                variant: 'destructive', 
                title: 'خطأ', 
                description: 'لم نتمكن من قبول العرض وإنشاء الحجز.'
            })
        } finally {
            setIsAccepting(null);
        }
    };
    
    // This is the "Ready for Payment" or "Completed" or other final states
    if (trip.status === 'Planned' && booking && acceptedOffer) {
        return <TripReportCard trip={trip} booking={booking} offer={acceptedOffer} />;
    }
    
    // This is the "Waiting for Carrier" state - we are skipping this for now
    if (trip.status === 'Planned' && booking?.status === 'Pending-Carrier-Confirmation') {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-background rounded-b-lg">
                <Hourglass className="h-12 w-12 text-primary animate-bounce mb-4" />
                <h3 className="text-xl font-bold">بانتظار موافقة الناقل</h3>
                <p className="text-muted-foreground mt-2">
                    تم إرسال طلبك بنجاح. سنقوم بإعلامك فور موافقة الناقل على الحجز.
                    <br/>
                    يمكنك إغلاق هذه الشاشة، سيصلك إشعار بالنتيجة.
                </p>
            </div>
        )
    }

    // This is the "Awaiting Offers" state
    const availableOffers = offers && offers.length > 0 ? offers : trip.id === 'TRIP-AWAITING-001' ? mockOffers : [];

    return (
        <>
            <div className="p-4 space-y-4 bg-background/80 rounded-b-lg">
                {isLoadingOffers ? (
                    <div className="flex justify-center items-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : availableOffers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {availableOffers.map(offer => (
                            <OfferCard 
                                key={offer.id} 
                                offer={offer} 
                                trip={trip} 
                                onAccept={() => handleAcceptOfferClick(offer)} 
                                isAccepting={isAccepting === offer.id} 
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground p-8">لم تصلك أي عروض بعد لهذا الطلب. يمكنك الانتظار أو إلغاء الطلب.</p>
                )}
            </div>
            <LegalDisclaimerDialog isOpen={isLegalDisclaimerOpen} onOpenChange={setIsLegalDisclaimerOpen} onContinue={handleLegalConfirm} />
        </>
    );
};


export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const userTripsQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return query(collection(firestore, 'trips'), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: allUserTrips, isLoading } = useCollection<Trip>(userTripsQuery);

  const awaitingTrips = useMemo(() => allUserTrips?.filter(t => t.status === 'Awaiting-Offers') || [], [allUserTrips]);
  const plannedTrips = useMemo(() => allUserTrips?.filter(t => t.status === 'Planned') || [], [allUserTrips]);
  const pastTrips: Trip[] = useMemo(() => allUserTrips?.filter(t => t.status === 'Completed' || t.status === 'Cancelled') || [], [allUserTrips]);
  
  const defaultOpenAccordion = useMemo(() => {
      if(isLoading) return [];
      if(plannedTrips.length > 0) return ['planned'];
      if(awaitingTrips.length > 0) return ['awaiting'];
      if(pastTrips.length > 0) return ['past'];
      return [];
  }, [isLoading, awaitingTrips, plannedTrips, pastTrips]);

  
  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/notifications`));
  }, [firestore, user]);

  const { data: notifications } = useCollection<Notification>(notificationsQuery);
  const notificationCount = notifications?.filter(n => !n.isRead).length || 0;


  const renderSkeleton = () => (
    <div className="space-y-4 px-4 md:px-0">
      {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
    </div>
  );

  if (isUserLoading && !user) {
      return (
        <AppLayout>
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <h2 className="text-xl font-bold">جاري التحميل...</h2>
                <p className="text-muted-foreground">يتم الآن تحميل بيانات حسابك.</p>
            </div>
        </AppLayout>
      );
  }

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

        {(isLoading && !allUserTrips) && renderSkeleton()}

        {!isLoading && allUserTrips?.length === 0 && (
             <div className="text-center text-muted-foreground py-12">
                <Ship className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg">لا يوجد لديك أي حجوزات أو طلبات حالياً.</p>
                <p className="text-sm mt-2">يمكنك البحث عن رحلة أو طلب حجز جديد من لوحة التحكم.</p>
                <Button onClick={() => router.push('/dashboard')} className="mt-4">الذهاب إلى لوحة التحكم</Button>
            </div>
        )}

        <Accordion type="multiple" className="w-full space-y-6 px-0 md:px-0" defaultValue={defaultOpenAccordion}>
          
          {awaitingTrips.length > 0 && (
            <AccordionItem value="awaiting" className="border-none">
              <Card className="rounded-none md:rounded-lg overflow-hidden">
                <AccordionTrigger className="p-6 text-lg hover:no-underline bg-card">
                  <div className='flex items-center gap-2'><PackageOpen className="h-6 w-6 text-primary" /><CardTitle>طلبات بانتظار العروض</CardTitle></div>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  <CardDescription className="mb-4 px-6 pt-4 bg-card">
                    هنا تظهر طلباتك التي أرسلتها. يمكنك استعراض العروض المقدمة من الناقلين لكل طلب.
                  </CardDescription>
                  <Accordion type="single" collapsible className="w-full">
                       {awaitingTrips.map(trip => {
                            return (
                                <AccordionItem value={trip.id} key={trip.id} className="border-t border-border/50">
                                    <Card className="overflow-hidden rounded-none shadow-none border-none">
                                        <AccordionTrigger className="p-4 bg-card/80 hover:no-underline hover:bg-accent/10 data-[state=closed]:rounded-b-none">
                                            <div className="flex justify-between items-center w-full">
                                                <div className="text-right">
                                                    <div className="flex items-center gap-3">
                                                        <p className="font-bold text-base">{cities[trip.origin as keyof typeof cities] || trip.origin} إلى {cities[trip.destination as keyof typeof cities] || trip.destination}</p>
                                                        <p className="text-sm text-muted-foreground">({new Date(trip.departureDate).toLocaleDateString('ar-SA')})</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-0 border-t border-border/50">
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

          {plannedTrips.length > 0 && (
             <AccordionItem value="planned" className="border-none">
              <Card className="rounded-none md:rounded-lg overflow-hidden">
                <AccordionTrigger className="p-6 text-lg hover:no-underline bg-card">
                  <div className='flex items-center gap-2'><Hourglass className="h-6 w-6 text-yellow-500" /><CardTitle>حجوزات مؤكدة بانتظار الدفع</CardTitle></div>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                    <CardDescription className="mb-4 px-6 pt-4 bg-card">
                        هذه الحجوزات تم تأكيدها من قبل الناقل وهي بانتظار إتمام عملية الدفع من طرفك.
                    </CardDescription>
                    <Accordion type="single" collapsible className="w-full">
                        {plannedTrips.map(trip => (
                            <AccordionItem value={trip.id} key={trip.id} className="border-t border-border/50">
                                 <Card className="overflow-hidden rounded-none shadow-none border-none">
                                     <AccordionTrigger className="p-4 bg-card/80 hover:no-underline hover:bg-accent/10 data-[state=closed]:rounded-b-none">
                                        <div className="flex justify-between items-center w-full">
                                            <div className="text-right">
                                                <div className="flex items-center gap-3">
                                                    <p className="font-bold text-base">{cities[trip.origin as keyof typeof cities] || trip.origin} إلى {cities[trip.destination as keyof typeof cities] || trip.destination}</p>
                                                     <Badge variant="secondary">{trip.carrierName || "اسم الناقل"}</Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-0 border-t border-border/50">
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
          
          
          <AccordionItem value="past" className="border-none">
            <Card className="rounded-none md:rounded-lg">
              <AccordionTrigger className="p-6 text-lg hover:no-underline bg-card">
                <div className='flex items-center gap-2'><CheckCircle className="h-6 w-6 text-green-500" /><CardTitle>رحلاتي السابقة</CardTitle></div>
              </AccordionTrigger>
              <AccordionContent>
                <CardContent className="space-y-6 p-4 md:p-6">
                  <CardDescription className="mb-4">سجل رحلاتك المكتملة أو الملغاة.</CardDescription>
                   {pastTrips.length > 0 ? (
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
                            {pastTrips.map(trip => (
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
                    ) : (
                        <p className="text-center text-muted-foreground p-8">لا توجد رحلات سابقة.</p>
                    )}
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

        </Accordion>
        
      </div>
    </AppLayout>
  );
}
