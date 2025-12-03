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
import { CheckCircle, PackageOpen, AlertCircle, PlusCircle, CalendarX, Hourglass } from 'lucide-react';
import { TripOffers } from '@/components/trip-offers';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { BookingDialog, type PassengerDetails } from '@/components/booking-dialog';
import { ScheduledTripCard } from '@/components/scheduled-trip-card';

// --- Helper Functions & Data ---
// Note: Consider moving these to @/lib/constants.ts for reusability
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

export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [selectedOfferForBooking, setSelectedOfferForBooking] = useState<{ trip: Trip, offer: Offer } | null>(null);
  const [isProcessingBooking, setIsProcessingBooking] = useState(false);

  // --- Queries ---
  const userTripsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'trips'),
      where('userId', '==', user.uid)
    );
  }, [firestore, user]);
  
  const { data: allUserTrips, isLoading: isLoadingTrips } = useCollection<Trip>(userTripsQuery);

  const { awaitingTrips, pendingConfirmationTrips, confirmedTrips } = useMemo(() => {
    if (!allUserTrips) {
      return { awaitingTrips: [], pendingConfirmationTrips: [], confirmedTrips: [] };
    }
    
    // Sort after fetching, as Firestore doesn't allow multiple inequality filters with orderBy
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


  const hasAwaitingTrips = awaitingTrips && awaitingTrips.length > 0;
  const hasPendingConfirmationTrips = pendingConfirmationTrips && pendingConfirmationTrips.length > 0;
  const hasConfirmedTrips = confirmedTrips && confirmedTrips.length > 0;

  // DEV MODE: Authentication check disabled
  // useEffect(() => {
  //   if (!isUserLoading && !user) router.push('/login');
  // }, [user, isUserLoading, router]);

  const totalLoading = isUserLoading || isLoadingTrips;
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
      // For now, we will handle this via chat. The actual booking confirmation will be done by carrier.
      // This function can be used to initiate the chat.
      if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'يجب تسجيل الدخول لبدء محادثة.'});
        return;
      }
      const chatId = `${trip.id}_${user.uid}_${offer.carrierId}`;
      router.push(`/chats/${chatId}`);
  };

  const handleConfirmBookingFromOffer = async (passengers: PassengerDetails[]) => {
      if (!firestore || !user || !selectedOfferForBooking) return;
      setIsProcessingBooking(true);
      const { trip, offer } = selectedOfferForBooking;
  
      try {
        const batch = writeBatch(firestore);
        
        // This process is now simplified. We create a Booking document and set the trip to pending.
        const bookingData: Omit<Booking, 'id'> = {
            tripId: trip.id,
            userId: user.uid,
            carrierId: offer.carrierId,
            seats: passengers.length,
            passengersDetails: passengers,
            status: 'Pending-Carrier-Confirmation',
            totalPrice: offer.price, // Using the offer price
            createdAt: new Date().toISOString(),
        };

        // Create booking doc
        const bookingRef = doc(collection(firestore, 'bookings'));
        batch.set(bookingRef, bookingData);
        
        // Update trip status and link to the booking
        batch.update(doc(firestore, 'trips', trip.id), { 
            status: 'Pending-Carrier-Confirmation',
            acceptedOfferId: offer.id,
            bookingIds: arrayUnion(bookingRef.id),
            carrierId: offer.carrierId,
            carrierName: (offer as any).carrierName || 'Unknown Carrier' // Get carrier name if available
        });
        
        // Notify the carrier
        const notificationsCollection = collection(firestore, 'notifications');
        addDocumentNonBlocking(notificationsCollection, {
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
  
  if (isUserLoading) return <AppLayout>{renderSkeleton()}</AppLayout>;

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
                    <CardContent key={trip.id} className="border-t pt-6">
                      <div className="mb-4">
                        <CardTitle className="text-md">طلب رحلة: {cities[trip.origin] || trip.origin} إلى {cities[trip.destination] || trip.destination}</CardTitle>
                        <CardDescription className="text-xs">
                          تاريخ الطلب: {safeDateFormat(trip.departureDate)} | عدد الركاب: {trip.passengers || 'غير محدد'}
                        </CardDescription>
                      </div>
                      <TripOffers trip={trip} onAcceptOffer={() => {}} />
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
                        onBookNow={() => {}} // No action needed here for now
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
      {selectedOfferForBooking && (
          <BookingDialog
            isOpen={isBookingDialogOpen}
            onOpenChange={setIsBookingDialogOpen}
            trip={selectedOfferForBooking.trip}
            seatCount={selectedOfferForBooking.trip.passengers || selectedOfferForBooking.offer.availableSeats || 1}
            onConfirm={handleConfirmBookingFromOffer}
            isProcessing={isProcessingBooking}
          />
      )}
    </AppLayout>
  );
}
