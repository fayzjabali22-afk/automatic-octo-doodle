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
import { CheckCircle, PackageOpen, AlertCircle, PlusCircle, CalendarX, Hourglass, Sparkles, Flag, MessageSquare, Radar } from 'lucide-react';
import { TripOffers } from '@/components/trip-offers';
import { useToast } from '@/hooks/use-toast';
import { format, addHours, isFuture } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { BookingDialog } from '@/components/booking/booking-dialog';
import { ScheduledTripCard } from '@/components/scheduled-trip-card';
import { TripClosureDialog } from '@/components/trip-closure/rate-trip-dialog';
import { RateTripDialog } from '@/components/trip-closure/rate-trip-dialog';
import { CancellationDialog } from '@/components/booking/cancellation-dialog';
import { ChatDialog } from '@/components/chat/chat-dialog';
import { SmartResubmissionDialog } from '@/components/booking/smart-resubmission-dialog';

// --- MOCK DATA ---
const mockAwaitingTrips: Trip[] = [
    {
        id: 'trip_req_1',
        userId: 'user1',
        origin: 'amman',
        destination: 'riyadh',
        departureDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        passengers: 2,
        status: 'Awaiting-Offers',
        createdAt: new Date().toISOString(),
    }
];

// Relevant scheduled trips for the smart resubmission dialog
const mockRelevantScheduledTrips: Trip[] = [
     // Perfect Match
    {
        id: 'scheduled_match_1',
        userId: 'carrier_smart',
        carrierId: 'carrier_smart',
        carrierName: 'الناقل الذكي',
        origin: 'amman',
        destination: 'riyadh',
        departureDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        price: 75,
        currency: 'JOD',
        availableSeats: 3,
        status: 'Planned',
    },
    // Nearby Date Match
    {
        id: 'scheduled_nearby_1',
        userId: 'carrier_flexible',
        carrierId: 'carrier_flexible',
        carrierName: 'المرن للنقل',
        origin: 'amman',
        destination: 'riyadh',
        departureDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(), // One day after
        price: 70,
        currency: 'JOD',
        availableSeats: 4,
        status: 'Planned',
    }
]

const mockPendingConfirmationTrips: { trip: Trip, booking: Booking }[] = [
    {
        trip: {
            id: 'trip_pending_1',
            userId: 'user1',
            carrierId: 'carrier2',
            carrierName: 'الناقل السريع',
            origin: 'damascus',
            destination: 'amman',
            departureDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Pending-Carrier-Confirmation',
        },
        booking: {
            id: 'booking_pending_1',
            tripId: 'trip_pending_1',
            userId: 'user1',
            carrierId: 'carrier2',
            seats: 1,
            passengersDetails: [{ name: 'Fayez Al-Harbi', type: 'adult' }],
            status: 'Pending-Carrier-Confirmation',
            totalPrice: 40,
            currency: 'JOD',
            createdAt: new Date().toISOString(),
        }
    }
];

const mockConfirmedTrips: { trip: Trip, booking: Booking }[] = [
    {
        trip: {
            id: 'trip_confirmed_1',
            userId: 'user1',
            carrierId: 'carrier3',
            carrierName: 'راحة الطريق',
            origin: 'cairo',
            destination: 'jeddah',
            departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Planned',
        },
        booking: {
            id: 'booking_confirmed_1',
            tripId: 'trip_confirmed_1',
            userId: 'user1',
            carrierId: 'carrier3',
            seats: 2,
            passengersDetails: [{ name: 'Hassan', type: 'adult' }, { name: 'Ali', type: 'child' }],
            status: 'Confirmed',
            totalPrice: 180,
            currency: 'USD',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        }
    },
    {
        trip: {
            id: 'trip_completed_1',
            userId: 'user1',
            carrierId: 'carrier4',
            carrierName: 'ملوك الطريق',
            origin: 'riyadh',
            destination: 'amman',
            departureDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Completed',
            durationHours: 8,
        },
        booking: {
            id: 'booking_completed_1',
            tripId: 'trip_completed_1',
            userId: 'user1',
            carrierId: 'carrier4',
            seats: 1,
            passengersDetails: [{ name: 'Sara', type: 'adult' }],
            status: 'Completed',
            totalPrice: 70,
            currency: 'JOD',
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        }
    },
    // --- NEW SCENARIO: Trip Cancelled by Carrier ---
    {
        trip: {
            id: 'trip_cancelled_by_carrier_1',
            userId: 'user1',
            carrierId: 'carrier_X',
            carrierName: 'النسر الذهبي',
            origin: 'jeddah',
            destination: 'cairo',
            departureDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Cancelled', // Trip status is cancelled
        },
        booking: {
            id: 'booking_cancelled_1',
            tripId: 'trip_cancelled_by_carrier_1',
            userId: 'user1',
            carrierId: 'carrier_X',
            seats: 1,
            passengersDetails: [{ name: 'Noura', type: 'adult' }],
            status: 'Cancelled', // Booking status is also cancelled
            cancelledBy: 'carrier', // Indicates who cancelled
            cancellationReason: 'ظروف تشغيلية طارئة لدى الناقل',
            totalPrice: 150,
            currency: 'SAR',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        }
    }
];

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
  const [isProcessingBooking, setIsProcessingBooking] = useState(false);

  // Closure and Rating Dialog State
  const [isClosureDialogOpen, setIsClosureDialogOpen] = useState(false);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [selectedTripForClosure, setSelectedTripForClosure] = useState<Trip | null>(null);

  // Cancellation Dialog State
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedBookingForCancellation, setSelectedBookingForCancellation] = useState<{trip: Trip, booking: Booking} | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Chat Dialog State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedChatInfo, setSelectedChatInfo] = useState<{bookingId: string, otherPartyName: string} | null>(null);

  // Smart Resubmission State
  const [isResubmissionDialogOpen, setIsResubmissionDialogOpen] = useState(false);
  const [selectedTripForResubmission, setSelectedTripForResubmission] = useState<Trip | null>(null);
  

  // --- USE MOCK DATA ---
  const awaitingTrips = mockAwaitingTrips;
  const pendingConfirmationTrips = mockPendingConfirmationTrips;
  const confirmedTrips = mockConfirmedTrips;
  const totalLoading = false;
  // --- END MOCK DATA ---

  const hasAwaitingTrips = awaitingTrips && awaitingTrips.length > 0;
  const hasPendingConfirmationTrips = pendingConfirmationTrips && pendingConfirmationTrips.length > 0;
  const hasConfirmedTrips = confirmedTrips && confirmedTrips.length > 0;

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

  const handleOpenChatDialog = (booking: Booking, trip: Trip) => {
      setSelectedChatInfo({
          bookingId: booking.id,
          otherPartyName: trip.carrierName || "الناقل"
      });
      setIsChatOpen(true);
  }

  const handleOpenResubmissionDialog = (trip: Trip) => {
    setSelectedTripForResubmission(trip);
    setIsResubmissionDialogOpen(true);
  }

  const handleConfirmCancellation = async () => {
      if (!firestore || !user || !selectedBookingForCancellation) return;
      
      setIsCancelling(true);
      
      // SIMULATION
      setTimeout(() => {
        toast({ 
            title: 'محاكاة: تم إلغاء الحجز بنجاح', 
            description: 'بقرار من المسافر دون اي مسؤولية على موقع سفريات الوسيط الاكتروني تم الغاء الرحلة منقبل المسافر وعلية كامل المسؤولية' 
        });
        setIsCancelling(false);
        setIsCancelDialogOpen(false);
      }, 1000);
  };


  const handleConfirmBookingFromOffer = async (passengers: PassengerDetails[]) => {
      if (!firestore || !user || !selectedOfferForBooking) return;
      setIsProcessingBooking(true);
      
      // SIMULATION
      setTimeout(() => {
        toast({ title: 'محاكاة: تم إرسال طلب الحجز!', description: 'بانتظار موافقة الناقل.' });
        setIsProcessingBooking(false);
        setIsBookingDialogOpen(false);
        setSelectedOfferForBooking(null);
      }, 1500);
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
                    <div key={trip.id}>
                        <CardContent className="border-t pt-6 space-y-4">
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
                         <CardFooter className="bg-muted/30 p-2 border-t">
                            <Button variant="outline" className="w-full" onClick={() => handleOpenResubmissionDialog(trip)}>
                               <Radar className="ml-2 h-4 w-4" />
                               خيارات إعادة النشر الذكية
                               <Badge variant="destructive" className="mr-2">جديد</Badge>
                            </Button>
                        </CardFooter>
                    </div>
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
                      const isCancelledByCarrier = booking.status === 'Cancelled' && booking.cancelledBy === 'carrier';
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
                            onMessageCarrier={() => handleOpenChatDialog(booking, trip)}
                            isCancelledByCarrier={isCancelledByCarrier}
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
            depositPercentage={bookingDialogData!.offer.depositPercentage || 25}
            onConfirm={handleConfirmBookingFromOffer}
            isProcessing={isProcessingBooking}
          />
      )}
      
      {selectedTripForClosure && (
        <RateTripDialog 
            isOpen={isClosureDialogOpen}
            onOpenChange={setIsClosureDialogOpen}
            trip={selectedTripForClosure}
            onConfirm={() => setSelectedTripForClosure(null)}
        />
      )}
      
      {selectedBookingForCancellation && (
        <CancellationDialog
            isOpen={isCancelDialogOpen}
            onOpenChange={setIsCancelDialogOpen}
            isCancelling={isCancelling}
            onConfirm={handleConfirmCancellation}
        />
      )}

      {selectedChatInfo && (
          <ChatDialog
              isOpen={isChatOpen}
              onOpenChange={setIsChatOpen}
              bookingId={selectedChatInfo.bookingId}
              otherPartyName={selectedChatInfo.otherPartyName}
          />
      )}

      {selectedTripForResubmission && (
        <SmartResubmissionDialog
          isOpen={isResubmissionDialogOpen}
          onOpenChange={setIsResubmissionDialogOpen}
          tripRequest={selectedTripForResubmission}
          // Passing mock scheduled trips for demonstration
          allScheduledTrips={mockRelevantScheduledTrips}
        />
      )}
    </AppLayout>
  );
}
