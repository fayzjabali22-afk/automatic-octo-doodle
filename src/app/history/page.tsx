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
import { collection, query, where, doc, writeBatch, arrayUnion } from 'firebase/firestore'; 
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trip, Offer, Booking } from '@/lib/data';
import { CheckCircle, PackageOpen, AlertCircle, PlusCircle, CalendarX, Hourglass, Sparkles } from 'lucide-react';
import { TripOffers } from '@/components/trip-offers';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { BookingDialog, type PassengerDetails } from '@/components/booking/booking-dialog';
import { ScheduledTripCard } from '@/components/scheduled-trip-card';

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

  // --- Queries ---
  const userTripsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'trips'),
      where('userId', '==', user.uid)
    );
  }, [firestore, user]);

  const scheduledTripsQuery = useMemo(() => {
      if (!firestore || !user) return null;
      return query(
          collection(firestore, 'trips'),
          where('status', '==', 'Planned'),
          where('userId', '!=', user.uid) // Don't show user their own trips as alternatives
      );
  }, [firestore, user]);
  
  const { data: allUserTrips, isLoading: isLoadingTrips } = useCollection<Trip>(userTripsQuery);
  const { data: allScheduledTrips, isLoading: isLoadingScheduled } = useCollection<Trip>(scheduledTripsQuery);

  const { awaitingTrips, pendingConfirmationTrips, confirmedTrips } = useMemo(() => {
    if (!allUserTrips) {
      return { awaitingTrips: [], pendingConfirmationTrips: [], confirmedTrips: [] };
    }
    
    const sortedTrips = [...allUserTrips].sort((a, b) => 
        new Date(b.departureDate).getTime() - new Date(a.departureDate).getTime()
    );

    const awaiting = sortedTrips.filter(t => t.status === 'Awaiting-Offers');
    const pending = sortedTrips.filter(t => t.status === 'Pending-Carrier-Confirmation');
    const confirmed = sortedTrips.filter(t => ['Planned', 'Completed', 'Cancelled'].includes(t.status));
    
    return { 
        awaitingTrips: awaiting, 
        pendingConfirmationTrips: pending, 
        confirmedTrips: confirmed 
    };
  }, [allUserTrips]);

  const matchingScheduledTripsMap = useMemo(() => {
      if (!awaitingTrips || !allScheduledTrips) return new Map<string, Trip[]>();

      const map = new Map<string, Trip[]>();
      awaitingTrips.forEach(request => {
          const matches = allScheduledTrips.filter(scheduled => 
              scheduled.origin === request.origin &&
              scheduled.destination === request.destination &&
              isSameDay(scheduled.departureDate, request.departureDate) &&
              (scheduled.availableSeats || 0) >= (request.passengers || 1)
          );
          if (matches.length > 0) {
              map.set(request.id, matches);
          }
      });
      return map;

  }, [awaitingTrips, allScheduledTrips]);


  const hasAwaitingTrips = awaitingTrips && awaitingTrips.length > 0;
  const hasPendingConfirmationTrips = pendingConfirmationTrips && pendingConfirmationTrips.length > 0;
  const hasConfirmedTrips = confirmedTrips && confirmedTrips.length > 0;

  const totalLoading = isUserLoading || isLoadingTrips || isLoadingScheduled;
  const noTripsAtAll = !totalLoading && !hasAwaitingTrips && !hasPendingConfirmationTrips && !hasConfirmedTrips;

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
  
  const handleBookScheduledTrip = (trip: Trip) => {
      setSelectedScheduledTrip(trip);
      setIsBookingDialogOpen(true);
  }

  const handleConfirmBookingFromOffer = async (passengers: PassengerDetails[]) => {
      if (!firestore || !user || !selectedOfferForBooking) return;
      setIsProcessingBooking(true);
      const { trip, offer } = selectedOfferForBooking;
  
      try {
        const batch = writeBatch(firestore);
        
        const bookingData: Omit<Booking, 'id'> = {
            tripId: trip.id,
            userId: user.uid,
            carrierId: offer.carrierId,
            seats: passengers.length,
            passengersDetails: passengers,
            status: 'Pending-Carrier-Confirmation',
            totalPrice: offer.price * passengers.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const bookingRef = doc(collection(firestore, 'bookings'));
        batch.set(bookingRef, bookingData);
        
        batch.update(doc(firestore, 'trips', trip.id), { 
            status: 'Pending-Carrier-Confirmation',
            acceptedOfferId: offer.id,
            bookingIds: arrayUnion(bookingRef.id),
            carrierId: offer.carrierId,
            carrierName: (offer as any).carrierName || 'Unknown Carrier'
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

  const handleConfirmBookingFromScheduled = async (passengers: PassengerDetails[]) => {
    if (!firestore || !user || !selectedScheduledTrip) return;
    setIsProcessingBooking(true);
    const trip = selectedScheduledTrip;
  
    try {
      const batch = writeBatch(firestore);
      
      const bookingData: Omit<Booking, 'id'> = {
          tripId: trip.id,
          userId: user.uid,
          carrierId: trip.carrierId!,
          seats: passengers.length,
          passengersDetails: passengers,
          status: 'Confirmed', // Direct confirmation as it's a scheduled trip
          totalPrice: (trip.price || 0) * passengers.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
      };

      const bookingRef = doc(collection(firestore, 'bookings'));
      batch.set(bookingRef, bookingData);
      
      batch.update(doc(firestore, 'trips', trip.id), { 
          availableSeats: (trip.availableSeats || 0) - passengers.length,
          bookingIds: arrayUnion(bookingRef.id),
      });
      
      addDocumentNonBlocking(collection(firestore, 'notifications'), {
          userId: trip.carrierId!,
          title: 'حجز جديد ومؤكد!',
          message: `لديك حجز مؤكد جديد في رحلة ${cities[trip.origin]} - ${cities[trip.destination]}.`,
          type: 'booking_confirmed',
          isRead: false,
          createdAt: new Date().toISOString(),
          link: `/carrier/trips`
      });

      await batch.commit();
      
      toast({ title: 'تم تأكيد حجزك الفوري بنجاح!', description: 'تم نقل الحجز إلى قسم "رحلاتي المؤكدة".' });
      setIsBookingDialogOpen(false);
      setSelectedScheduledTrip(null);
    } catch (error) {
      console.error("Scheduled Booking Error:", error);
      toast({ variant: 'destructive', title: 'فشل الحجز الفوري', description: 'حدث خطأ أثناء الحجز، حاول لاحقاً.' });
    } finally {
      setIsProcessingBooking(false);
    }
  };


  const renderSkeleton = () => (
    <div className="space-y-4" role="status" aria-label="جار التحميل">
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
    </div>
  );
  
  if (isUserLoading) return <AppLayout>{renderSkeleton()}</AppLayout>;

  const bookingDialogData = selectedOfferForBooking || { trip: selectedScheduledTrip, offer: { price: selectedScheduledTrip?.price || 0, depositPercentage: selectedScheduledTrip?.depositPercentage || 20 }};

  return (
    <AppLayout>
      <div className="bg-background/80 p-2 md:p-8 rounded-lg space-y-8">
        {/* Header */}
        <Card className="bg-card/90 border-border/50">
           <CardHeader className="p-4 md:p-6 flex flex-row justify-between items-center">
            <div>
              <CardTitle>إدارة الحجز</CardTitle>
              <CardDescription>تابع عروضك وحجوزاتك من هنا</CardDescription>
            </div>
          </CardHeader>
        </Card>

        {/* Empty State */}
        {noTripsAtAll && (
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
          {isLoadingTrips ? renderSkeleton() : hasAwaitingTrips && (
            <AccordionItem value="awaiting" className="border-none">
              <Card>
                <AccordionTrigger className="p-6 text-lg hover:no-underline">
                  <div className="flex items-center gap-2">
                    <PackageOpen className="h-6 w-6 text-primary" aria-hidden="true" />
                    <CardTitle>عروض الناقلين ({awaitingTrips.length})</CardTitle>
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
                      
                      {matchingScheduledTripsMap.has(trip.id) && (
                          <div className="space-y-4">
                              <h3 className="font-bold text-lg flex items-center gap-2 justify-center text-accent">
                                <Sparkles className="h-5 w-5" />
                                رحلات مجدولة متاحة للحجز الفوري
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {matchingScheduledTripsMap.get(trip.id)?.map(scheduledTrip => (
                                      <ScheduledTripCard 
                                          key={scheduledTrip.id}
                                          trip={scheduledTrip}
                                          onBookNow={() => handleBookScheduledTrip(scheduledTrip)}
                                      />
                                  ))}
                              </div>
                          </div>
                      )}
                    </CardContent>
                  ))}
                </AccordionContent>
              </Card>
            </AccordionItem>
          )}
          
          {/* Pending Confirmation */}
          {isLoadingTrips ? renderSkeleton() : hasPendingConfirmationTrips && (
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
                    {pendingConfirmationTrips.map(trip => (
                      <Card key={trip.id} className="bg-background/50 border-yellow-500/50">
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base font-bold">رحلة {cities[trip.origin] || trip.origin} إلى {cities[trip.destination] || trip.destination}</CardTitle>
                            <Badge variant={statusVariantMap[trip.status] || 'outline'}>{statusMap[trip.status] || trip.status}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center text-center space-y-2 p-6">
                            <AlertCircle className="h-8 w-8 text-yellow-500" aria-hidden="true" />
                            <p className="font-bold">بانتظار موافقة الناقل</p>
                            <p className="text-sm text-muted-foreground">
                              تم إرسال طلبك للناقل "{trip.carrierName || 'غير معروف'}". سيتم إعلامك فور تأكيد الحجز.
                            </p>
                          </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          )}

          {/* Confirmed Trips */}
          {isLoadingTrips ? renderSkeleton() : hasConfirmedTrips && (
            <AccordionItem value="confirmed" className="border-none">
              <Card>
                <AccordionTrigger className="p-6 text-lg hover:no-underline">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-green-500" aria-hidden="true" />
                    <CardTitle>رحلاتي المؤكدة ({confirmedTrips.length})</CardTitle>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 p-6">
                    {confirmedTrips.map(trip => (
                      <ScheduledTripCard
                        key={trip.id}
                        trip={trip}
                        onBookNow={() => {}}
                        context="history"
                      />
                    ))}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          )}
        </Accordion>
      </div>

      {/* Booking Dialog */}
      {(selectedOfferForBooking || selectedScheduledTrip) && (
          <BookingDialog
            isOpen={isBookingDialogOpen}
            onOpenChange={setIsBookingDialogOpen}
            trip={bookingDialogData.trip!}
            seatCount={bookingDialogData.trip?.passengers || 1}
            offerPrice={bookingDialogData.offer.price}
            depositPercentage={bookingDialogData.offer.depositPercentage || 20}
            onConfirm={selectedScheduledTrip ? handleConfirmBookingFromScheduled : handleConfirmBookingFromOffer}
            isProcessing={isProcessingBooking}
          />
      )}
    </AppLayout>
  );
}
