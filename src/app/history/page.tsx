'use client';

import { AppLayout } from '@/components/app-layout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, writeBatch, arrayUnion, increment } from 'firebase/firestore'; 
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trip, Offer, Booking } from '@/lib/data';
import { CheckCircle, PackageOpen, AlertCircle, PlusCircle, CalendarX, Hourglass, Sparkles, Flag } from 'lucide-react';
import { TripOffers } from '@/components/trip-offers';
import { useToast } from '@/hooks/use-toast';
import { format, addHours, isFuture } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { BookingDialog, type PassengerDetails } from '@/components/booking/booking-dialog';
import { ScheduledTripCard } from '@/components/scheduled-trip-card';
import { TripClosureDialog } from '@/components/trip-closure/trip-closure-dialog';
import { RateTripDialog } from '@/components/trip-closure/rate-trip-dialog';
import { CancellationDialog } from '@/components/booking/cancellation-dialog';

// --- Helper Functions & Data ---
const cities: { [key: string]: string } = {
    damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص',
    amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
    riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام',
    cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة',
    dubai: 'دبي', kuwait: 'الكويت'
};

const statusMap: Record<string, string> = {
  'Awaiting-Offers': 'بانتظار العروض',
  'Pending-Carrier-Confirmation': 'بانتظار تأكيد الناقل',
  'Planned': 'مؤكدة',
  'Completed': 'مكتملة',
  'Cancelled': 'ملغاة',
};

const statusVariantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  'Awaiting-Offers': 'outline',
  'Pending-Carrier-Confirmation': 'secondary',
  'Planned': 'default',
  'Completed': 'default',
  'Cancelled': 'destructive',
};

const safeDateFormat = (dateInput: any, formatStr: string = 'PPP'): string => {
  if (!dateInput) return 'N/A';
  try {
    const dateObj = typeof dateInput.toDate === 'function' ? dateInput.toDate() : new Date(dateInput);
    return format(dateObj, formatStr, { locale: arSA });
  } catch {
    return 'تاريخ غير صالح';
  }
};

const isSameDay = (date1: string, date2: string) => {
    try {
        const d1 = new Date(date1).toDateString();
        const d2 = new Date(date2).toDateString();
        return d1 === d2;
    } catch {
        return false;
    }
}


export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [selectedOfferForBooking, setSelectedOfferForBooking] = useState<{ trip: Trip, offer: Offer } | null>(null);
  const [selectedScheduledTrip, setSelectedScheduledTrip] = useState<Trip | null>(null);
  const [isProcessingBooking, setIsProcessingBooking] = useState(false);

  // Closure and Rating Dialog State
  const [isClosureDialogOpen, setIsClosureDialogOpen] = useState(false);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [selectedTripForClosure, setSelectedTripForClosure] = useState<Trip | null>(null);

  // Cancellation Dialog State
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedBookingForCancellation, setSelectedBookingForCancellation] = useState<{trip: Trip, booking: Booking} | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  

  // --- Queries ---
  const userTripsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'trips'),
      where('userId', '==', user.uid)
    );
  }, [firestore, user]);

  const userBookingsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, 'bookings'),
        where('userId', '==', user.uid)
    )
  }, [firestore, user]);
  
  const { data: allUserTrips, isLoading: isLoadingTrips } = useCollection<Trip>(userTripsQuery);
  const { data: allUserBookings, isLoading: isLoadingBookings } = useCollection<Booking>(userBookingsQuery);

  const { awaitingTrips, pendingConfirmationTrips, confirmedTrips } = useMemo(() => {
    const tripMap = new Map(allUserTrips?.map(t => [t.id, t]));
    const bookings = allUserBookings || [];

    const awaiting: Trip[] = [];
    const pending: { trip: Trip, booking: Booking }[] = [];
    const confirmed: { trip: Trip, booking: Booking }[] = [];

    bookings.forEach(booking => {
        const trip = tripMap.get(booking.tripId);
        if (trip) {
            if (booking.status === 'Pending-Carrier-Confirmation') {
                pending.push({ trip, booking });
            } else if (['Confirmed', 'Completed', 'Cancelled'].includes(booking.status)) {
                confirmed.push({ trip, booking });
            }
        }
    });
    
    // Add trips that are still awaiting offers (no bookings yet)
    allUserTrips?.forEach(trip => {
      if(trip.status === 'Awaiting-Offers') {
        awaiting.push(trip);
      }
    })

    return { 
        awaitingTrips: awaiting.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), 
        pendingConfirmationTrips: pending.sort((a,b) => new Date(b.booking.createdAt).getTime() - new Date(a.booking.createdAt).getTime()), 
        confirmedTrips: confirmed.sort((a,b) => new Date(b.trip.departureDate).getTime() - new Date(a.trip.departureDate).getTime())
    };
  }, [allUserTrips, allUserBookings]);


  const hasAwaitingTrips = awaitingTrips && awaitingTrips.length > 0;
  const hasPendingConfirmationTrips = pendingConfirmationTrips && pendingConfirmationTrips.length > 0;
  const hasConfirmedTrips = confirmedTrips && confirmedTrips.length > 0;

  const totalLoading = isUserLoading || isLoadingTrips || isLoadingBookings;
  const noHistoryAtAll = !totalLoading && !hasAwaitingTrips && !hasPendingConfirmationTrips && !hasConfirmedTrips;

  useEffect(() => {
    if (!totalLoading) {
        if (hasAwaitingTrips) setOpenAccordion('awaiting');
        else if (hasPendingConfirmationTrips) setOpenAccordion('pending');
        else if (hasConfirmedTrips) setOpenAccordion('confirmed');
        else setOpenAccordion(undefined);
    }
  }, [totalLoading, hasAwaitingTrips, hasPendingConfirmationTrips, hasConfirmedTrips]);

  const handleAcceptOffer = (trip: Trip, offer: Offer) => {
      setSelectedOfferForBooking({ trip, offer });
      setIsBookingDialogOpen(true);
  };
  
  const handleOpenClosureDialog = (trip: Trip) => {
      setSelectedTripForClosure(trip);
      setIsClosureDialogOpen(true);
  }

  const handleOpenCancelDialog = (trip: Trip, booking: Booking) => {
      setSelectedBookingForCancellation({ trip, booking });
      setIsCancelDialogOpen(true);
  }

  const handleConfirmCancellation = async () => {
      if (!firestore || !user || !selectedBookingForCancellation) return;
      
      const { trip, booking } = selectedBookingForCancellation;
      setIsCancelling(true);

      try {
        const batch = writeBatch(firestore);
        
        // 1. Update booking status
        const bookingRef = doc(firestore, 'bookings', booking.id);
        batch.update(bookingRef, { status: 'Cancelled' });

        // 2. Restore seats to the trip
        const tripRef = doc(firestore, 'trips', trip.id);
        batch.update(tripRef, { availableSeats: increment(booking.seats) });
        
        await batch.commit();

        // 3. Send notification (non-blocking)
        addDocumentNonBlocking(collection(firestore, 'notifications'), {
            userId: trip.carrierId,
            title: 'إلغاء حجز',
            message: `قام المسافر ${user.displayName || 'أحد المسافرين'} بإلغاء حجزه في رحلة ${cities[trip.origin]} إلى ${cities[trip.destination]}.`,
            type: 'trip_update', // Re-using trip_update for simplicity
            isRead: false,
            createdAt: new Date().toISOString(),
            link: `/carrier/trips` 
        });

        toast({ title: 'تم إلغاء الحجز بنجاح', description: 'تم استرجاع المقاعد للناقل.' });
        setIsCancelDialogOpen(false);

      } catch (error) {
          console.error("Cancellation Error:", error);
          toast({ variant: 'destructive', title: 'فشل الإلغاء', description: 'حدث خطأ أثناء إلغاء الحجز.' });
      } finally {
          setIsCancelling(false);
      }
  };


  const handleConfirmBookingFromOffer = async (passengers: PassengerDetails[]) => {
      if (!firestore || !user || !selectedOfferForBooking) return;
      setIsProcessingBooking(true);
      const { trip, offer } = selectedOfferForBooking;
  
      try {
        const batch = writeBatch(firestore);
        
        const bookingRef = doc(collection(firestore, 'bookings'));
        
        const bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
            tripId: trip.id,
            userId: user.uid,
            carrierId: offer.carrierId,
            seats: passengers.length,
            passengersDetails: passengers,
            status: 'Pending-Carrier-Confirmation',
            totalPrice: offer.price,
        };
        batch.set(bookingRef, {
            ...bookingData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        batch.update(doc(firestore, 'trips', trip.id), { 
            status: 'Pending-Carrier-Confirmation',
            acceptedOfferId: offer.id,
            // We now create the booking first, so we use the booking ID
        });

        // Link booking to trip
        batch.update(doc(firestore, 'trips', trip.id), {
            bookingIds: arrayUnion(bookingRef.id),
        });
        
        addDocumentNonBlocking(collection(firestore, 'notifications'), {
            userId: offer.carrierId,
            title: 'طلب حجز جديد',
            message: `لديك طلب حجز جديد لرحلة ${cities[trip.origin]} - ${cities[trip.destination]}.`,
            type: 'new_booking_request',
            isRead: false,
            createdAt: new Date().toISOString(),
            link: `/carrier/bookings`
        });
  
        await batch.commit();
        
        toast({ title: 'تم إرسال طلب الحجز بنجاح!', description: 'بانتظار موافقة الناقل. تم نقل الطلب إلى قسم "بانتظار التأكيد".' });
        setIsBookingDialogOpen(false);
        setSelectedOfferForBooking(null);
      } catch (error) {
        console.error("Booking Error:", error);
        toast({ variant: 'destructive', title: 'فشلت العملية', description: 'حدث خطأ أثناء الحجز، حاول لاحقاً.' });
      } finally {
        setIsProcessingBooking(false);
      }
  };


  const renderSkeleton = () => (
    <div className="space-y-4" role="status" aria-label="جار التحميل">
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
    </div>
  );
  
  if (totalLoading) return <AppLayout>{renderSkeleton()}</AppLayout>;

  const bookingDialogData = selectedOfferForBooking;

  return (
    <AppLayout>
      <div className="bg-background/80 p-2 md:p-8 rounded-lg space-y-8">
        {/* Header */}
        <Card className="bg-card/90 border-border/50">
           <CardHeader className="p-4 md:p-6 flex flex-row justify-between items-center">
            <div>
              <CardTitle>إدارة الحجز والرحلات</CardTitle>
              <CardDescription>تابع طلباتك، عروضك، وحجوزاتك من هنا.</CardDescription>
            </div>
          </CardHeader>
        </Card>

        {/* Empty State */}
        {noHistoryAtAll && (
          <div className="text-center py-16 border-2 border-dashed rounded-lg bg-card/50">
            <CalendarX className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
            <h3 className="text-xl font-bold">لا يوجد سجل رحلات</h3>
            <p className="text-muted-foreground mt-2 mb-6">يبدو أنك لم تقم بإنشاء أي طلبات بعد.</p>
            <Button onClick={() => router.push('/dashboard')}>
              <PlusCircle className="ml-2 h-4 w-4" aria-hidden="true" />
              إنشاء طلب رحلة جديد
            </Button>
          </div>
        )}

        {/* Accordion Sections */}
        <Accordion type="single" collapsible className="space-y-6" value={openAccordion} onValueChange={setOpenAccordion}>
          {/* Awaiting Offers */}
          {hasAwaitingTrips && (
            <AccordionItem value="awaiting" className="border-none">
              <Card>
                <AccordionTrigger className="p-6 text-lg hover:no-underline">
                  <div className="flex items-center gap-2">
                    <PackageOpen className="h-6 w-6 text-primary" aria-hidden="true" />
                    <CardTitle>طلبات بانتظار العروض ({awaitingTrips.length})</CardTitle>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {awaitingTrips.map(trip => (
                    <CardContent key={trip.id} className="border-t pt-6 space-y-8">
                      <div>
                        <div className="mb-4">
                            <CardTitle className="text-md">طلب رحلة: {cities[trip.origin] || trip.origin} إلى {cities[trip.destination] || trip.destination}</CardTitle>
                            <CardDescription className="text-xs">
                            تاريخ الطلب: {safeDateFormat(trip.departureDate)} | عدد الركاب: {trip.passengers || 'غير محدد'}
                            </CardDescription>
                        </div>
                        <TripOffers trip={trip} onAcceptOffer={handleAcceptOffer} />
                      </div>
                    </CardContent>
                  ))}
                </AccordionContent>
              </Card>
            </AccordionItem>
          )}
          
          {/* Pending Confirmation */}
          {hasPendingConfirmationTrips && (
             <AccordionItem value="pending" className="border-none">
              <Card>
                <AccordionTrigger className="p-6 text-lg hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Hourglass className="h-6 w-6 text-yellow-500" aria-hidden="true" />
                    <CardTitle>حجوزات بانتظار التأكيد ({pendingConfirmationTrips.length})</CardTitle>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="space-y-6 pt-6">
                    {pendingConfirmationTrips.map(({trip, booking}) => (
                      <Card key={booking.id} className="bg-background/50 border-yellow-500/50">
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base font-bold">رحلة {cities[trip.origin] || trip.origin} إلى {cities[trip.destination] || trip.destination}</CardTitle>
                            <Badge variant={statusVariantMap[booking.status] || 'outline'}>{statusMap[booking.status] || booking.status}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center text-center space-y-2 p-6">
                            <AlertCircle className="h-8 w-8 text-yellow-500" aria-hidden="true" />
                            <p className="font-bold">بانتظار موافقة الناقل</p>
                            <p className="text-sm text-muted-foreground">
                              تم إرسال طلبك للناقل. سيتم إعلامك فور تأكيد الحجز.
                            </p>
                          </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          )}

          {/* Confirmed & Past Trips */}
          {hasConfirmedTrips && (
            <AccordionItem value="confirmed" className="border-none">
              <Card>
                <AccordionTrigger className="p-6 text-lg hover:no-underline">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-green-500" aria-hidden="true" />
                    <CardTitle>رحلاتي المؤكدة والسابقة ({confirmedTrips.length})</CardTitle>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 p-6">
                    {confirmedTrips.map(({trip, booking}) => {
                      const isCompleted = booking.status === 'Completed';
                      const canCancel = booking.status === 'Confirmed' && isFuture(new Date(trip.departureDate));
                      const closureTime = trip.departureDate && trip.durationHours ? addHours(new Date(trip.departureDate), trip.durationHours + 4) : null;
                      const isClosureDue = closureTime ? new Date() > closureTime : false;

                      return (
                         <ScheduledTripCard
                            key={booking.id}
                            trip={trip}
                            booking={booking}
                            onBookNow={() => {}}
                            onClosureAction={isClosureDue ? () => handleOpenClosureDialog(trip) : undefined}
                            onCancelBooking={canCancel ? () => handleOpenCancelDialog(trip, booking) : undefined}
                            context="history"
                          />
                      )
                    })}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          )}
        </Accordion>
      </div>

      {/* --- Dialogs --- */}
      {selectedOfferForBooking && (
          <BookingDialog
            isOpen={isBookingDialogOpen}
            onOpenChange={setIsBookingDialogOpen}
            trip={bookingDialogData!.trip}
            seatCount={bookingDialogData!.trip?.passengers || 1}
            offerPrice={bookingDialogData!.offer.price}
            depositPercentage={bookingDialogData!.offer.depositPercentage || 20}
            onConfirm={handleConfirmBookingFromOffer}
            isProcessing={isProcessingBooking}
          />
      )}
      
      {selectedTripForClosure && (
        <TripClosureDialog
            isOpen={isClosureDialogOpen}
            onOpenChange={setIsClosureDialogOpen}
            trip={selectedTripForClosure}
            onRate={() => {
                setIsClosureDialogOpen(false);
                setTimeout(() => setIsRatingDialogOpen(true), 150);
            }}
        />
      )}

      <RateTripDialog 
        isOpen={isRatingDialogOpen}
        onOpenChange={setIsRatingDialogOpen}
        trip={selectedTripForClosure}
        onConfirm={() => setSelectedTripForClosure(null)}
      />
      
      {selectedBookingForCancellation && (
        <CancellationDialog
            isOpen={isCancelDialogOpen}
            onOpenChange={setIsCancelDialogOpen}
            isCancelling={isCancelling}
            onConfirm={handleConfirmCancellation}
        />
      )}
    </AppLayout>
  );
}
