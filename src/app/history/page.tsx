'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, addDocumentNonBlocking } from '@/firebase';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trip, Offer, Booking, UserProfile } from '@/lib/data';
import { CheckCircle, PackageOpen, AlertCircle, PlusCircle, CalendarX, Hourglass, Radar, MessageSquare, Flag, CreditCard, UserCheck, Archive, Ticket, ListFilter, Users, MapPin, Phone, Car, Link as LinkIcon, Edit } from 'lucide-react';
import { TripOffers } from '@/components/trip-offers';
import { useToast } from '@/hooks/use-toast';
import { format, addHours, isFuture } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { BookingPaymentDialog } from '@/components/booking/booking-payment-dialog';
import { ScheduledTripCard } from '@/components/scheduled-trip-card';
import { RateTripDialog } from '@/components/trip-closure/rate-trip-dialog';
import { CancellationDialog } from '@/components/booking/cancellation-dialog';
import { ChatDialog } from '@/components/chat/chat-dialog';
import { SmartResubmissionDialog } from '@/components/booking/smart-resubmission-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';

// --- STRATEGIC MOCK DATA FOR THE FULL LIFECYCLE ---
// 1. Awaiting Offers (General Request) -> Will show Radar
const mockAwaitingGeneral: Trip = {
    id: 'trip_req_1', userId: 'user1', origin: 'amman', destination: 'riyadh',
    departureDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    passengers: 2, status: 'Awaiting-Offers', requestType: 'General', createdAt: new Date().toISOString(),
};

// 2. Awaiting Offers (Direct Request) -> Will show Hourglass
const mockAwaitingDirect: Trip = {
    id: 'trip_req_direct_1', userId: 'user1', origin: 'damascus', destination: 'jeddah',
    departureDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    passengers: 1, status: 'Awaiting-Offers', requestType: 'Direct', targetCarrierId: 'carrier_special', createdAt: new Date().toISOString(),
};

// 3. Pending Carrier Confirmation -> Will show Hourglass
const mockPendingConfirmation: { trip: Trip, booking: Booking } = {
    trip: { id: 'trip_pending_1', userId: 'user1', carrierId: 'carrier2', carrierName: 'الناقل السريع', origin: 'damascus', destination: 'amman', departureDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), status: 'Pending-Carrier-Confirmation' },
    booking: { id: 'booking_pending_1', tripId: 'trip_pending_1', userId: 'user1', carrierId: 'carrier2', seats: 1, passengersDetails: [{ name: 'Fayez Al-Harbi', type: 'adult' }], status: 'Pending-Carrier-Confirmation', totalPrice: 40, currency: 'JOD', createdAt: new Date().toISOString() }
};

// 4. Pending Payment -> Will show Invoice
const mockPendingPayment: { trip: Trip, booking: Booking } = {
    trip: { id: 'trip_payment_1', userId: 'carrier_payment', carrierId: 'carrier_payment', carrierName: 'النقل الذهبي', origin: 'jeddah', destination: 'cairo', departureDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), status: 'Pending-Payment', price: 150, currency: 'SAR', depositPercentage: 25 },
    booking: { id: 'booking_payment_1', tripId: 'trip_payment_1', userId: 'user1', carrierId: 'carrier_payment', seats: 2, passengersDetails: [{ name: 'Jasser Mohamed', type: 'adult' }, { name: 'Reem Mohamed', type: 'adult' }], status: 'Pending-Payment', totalPrice: 300, currency: 'SAR', createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() }
};

// 5. Confirmed Ticket -> Will show Golden Ticket
const mockConfirmed: { trip: Trip, booking: Booking } = {
    trip: { 
        id: 'trip_confirmed_1', 
        userId: 'user1', 
        carrierId: 'carrier3', 
        carrierName: 'راحة الطريق', 
        origin: 'cairo', 
        destination: 'jeddah', 
        departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), 
        status: 'Planned', 
        meetingPoint: "مطار القاهرة الدولي - صالة 3",
        meetingPointLink: "https://maps.app.goo.gl/12345",
        conditions: "حقيبة واحدة لكل راكب. ممنوع التدخين.",
        vehicleType: "GMC Yukon 2024",
        vehiclePlateNumber: "123-ABC"
    },
    booking: { id: 'booking_confirmed_1', tripId: 'trip_confirmed_1', userId: 'user1', carrierId: 'carrier3', seats: 2, passengersDetails: [{ name: 'حسن علي', type: 'adult' }, { name: 'علي حسن', type: 'child' }], status: 'Confirmed', totalPrice: 180, currency: 'USD', createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString() }
};

// 6. Archived (Completed) Trip
const mockArchivedCompleted: { trip: Trip, booking: Booking } = {
    trip: { id: 'trip_completed_1', userId: 'user1', carrierId: 'carrier4', carrierName: 'ملوك الطريق', origin: 'riyadh', destination: 'amman', departureDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), status: 'Completed', durationHours: 8 },
    booking: { id: 'booking_completed_1', tripId: 'trip_completed_1', userId: 'user1', carrierId: 'carrier4', seats: 1, passengersDetails: [{ name: 'Sara', type: 'adult' }], status: 'Completed', totalPrice: 70, currency: 'JOD', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() }
};

// Helper data
const cities: { [key: string]: string } = {
    damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص', amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
    riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام', cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة',
};
const getCityName = (key: string) => cities[key] || key;

// --- MORPHING CARD COMPONENTS ---

const RequestTrackerCard = ({ trip, onAcceptOffer, isProcessing }: { trip: Trip, onAcceptOffer: (trip: Trip, offer: Offer) => void, isProcessing: boolean }) => (
    <Card className="border-primary border-2">
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-base"><Radar className="h-5 w-5 text-primary animate-pulse" /> طلب بانتظار العروض</CardTitle>
                <Badge variant="outline">طلب عام</Badge>
            </div>
            <CardDescription>رحلة من {getCityName(trip.origin)} إلى {getCityName(trip.destination)} بتاريخ {format(new Date(trip.departureDate), 'd MMMM', { locale: arSA })}</CardDescription>
        </CardHeader>
        <CardContent>
            <TripOffers trip={trip} onAcceptOffer={onAcceptOffer} isProcessing={isProcessing} />
        </CardContent>
    </Card>
);

const WaitingCard = ({ trip }: { trip: Trip }) => (
    <Card>
        <CardHeader>
             <div className="flex justify-between items-center">
                 <CardTitle className="flex items-center gap-2 text-base"><Hourglass className="h-5 w-5 text-yellow-500 animate-spin" /> قيد المراجعة</CardTitle>
                 <Badge variant="secondary">{trip.requestType === 'Direct' ? 'طلب مباشر' : 'بانتظار التأكيد'}</Badge>
            </div>
            <CardDescription>رحلة من {getCityName(trip.origin)} إلى {getCityName(trip.destination)}</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
            <p className="font-bold">{trip.requestType === 'Direct' ? 'تم إرسال طلبك المباشر للناقل' : 'تم إرسال طلبك للناقل'}</p>
            <p className="text-sm mt-1">سيتم إعلامك فور تحديث حالة طلبك.</p>
        </CardContent>
    </Card>
);

const PaymentPass = ({ trip, booking, onPayNow }: { trip: Trip, booking: Booking, onPayNow: (trip: Trip, booking: Booking) => void }) => (
    <Card className="border-destructive border-2">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive text-base"><CreditCard className="h-5 w-5" /> مطلوب إتمام الدفع</CardTitle>
            <CardDescription>وافق الناقل على طلبك! يرجى دفع العربون لتأكيد حجزك.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="p-4 bg-muted/50 rounded-lg border border-dashed text-center">
                 <div className="text-sm text-muted-foreground">العربون المطلوب لتأكيد الحجز</div>
                 <div className="text-3xl font-bold text-destructive">{(booking.totalPrice * ((trip.depositPercentage || 20) / 100)).toFixed(2)} {booking.currency}</div>
            </div>
        </CardContent>
        <CardFooter>
            <Button className="w-full" onClick={() => onPayNow(trip, booking)}>
                <CreditCard className="ml-2 h-4 w-4" />
                اذهب إلى الدفع
            </Button>
        </CardFooter>
    </Card>
);

const HeroTicket = ({ trip, booking, onCancelBooking, onMessageCarrier }: { trip: Trip, booking: Booking, onCancelBooking?: (trip: Trip, booking: Booking) => void, onMessageCarrier?: (booking: Booking, trip: Trip) => void }) => {
    const firestore = useFirestore();
    const carrierProfileRef = useMemo(() => {
        if (!firestore || !trip.carrierId) return null;
        return doc(firestore, 'users', trip.carrierId);
    }, [firestore, trip.carrierId]);

    const { data: carrierProfile } = useDoc<UserProfile>(carrierProfileRef);
    
    // Financial details
    const depositAmount = (booking.totalPrice * ((trip.depositPercentage || 20) / 100));
    const remainingAmount = booking.totalPrice - depositAmount;

    return (
        <Card className="bg-gradient-to-br from-card to-muted/50 shadow-lg border-accent">
            <CardHeader className="text-center">
                <Badge variant="default" className="mx-auto w-fit bg-accent text-accent-foreground">تذكرة مؤكدة</Badge>
                <CardTitle className="pt-2">{getCityName(trip.origin)} - {getCityName(trip.destination)}</CardTitle>
                <CardDescription>الناقل: {carrierProfile?.firstName || trip.carrierName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-background rounded-md">
                        <div className="font-bold text-xs text-muted-foreground">التاريخ والوقت</div>
                        <div>{format(new Date(trip.departureDate), 'd MMM yyyy, h:mm a', { locale: arSA })}</div>
                    </div>
                     <div className="p-3 bg-background rounded-md">
                        <div className="font-bold text-xs text-muted-foreground">بيانات الناقل</div>
                         <div className="flex items-center gap-2">
                             <Phone className="h-3 w-3" />
                             {carrierProfile?.phoneNumber ? (
                                <a href={`tel:${carrierProfile.phoneNumber}`} className="hover:underline">{carrierProfile.phoneNumber}</a>
                             ) : 'غير متوفر'}
                         </div>
                    </div>
                </div>

                <div className="p-3 bg-background rounded-lg border space-y-2">
                    <p className="font-bold text-xs flex items-center gap-1"><MapPin className="h-4 w-4 text-primary"/> نقطة الانطلاق</p>
                    <p>{trip.meetingPoint}</p>
                    {trip.meetingPointLink && (
                        <a href={trip.meetingPointLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-xs flex items-center gap-1 hover:underline">
                            <LinkIcon className="h-3 w-3" />
                            عرض على الخريطة
                        </a>
                    )}
                </div>

                 <div className="p-3 bg-background rounded-lg border space-y-2">
                    <p className="font-bold text-xs flex items-center gap-1"><Car className="h-4 w-4 text-primary"/> تفاصيل المركبة</p>
                    <p>نوع المركبة: {trip.vehicleType || 'غير محدد'}</p>
                    <p>رقم اللوحة: {trip.vehiclePlateNumber || 'غير محدد'}</p>
                </div>
                
                 <div className="p-3 bg-background rounded-lg border space-y-2">
                    <p className="font-bold text-xs flex items-center gap-1"><Users className="h-4 w-4 text-primary"/> الركاب</p>
                    <ul className="list-disc pr-4 text-xs">
                        {booking.passengersDetails.map((p, i) => <li key={i}>{p.name} ({p.type === 'adult' ? 'بالغ' : 'طفل'})</li>)}
                    </ul>
                </div>
                
                 <div className="p-3 bg-background rounded-lg border space-y-2">
                    <p className="font-bold text-xs flex items-center gap-1"><CreditCard className="h-4 w-4 text-primary"/> التفاصيل المالية</p>
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span>تاريخ الحجز:</span> <span className="font-bold">{format(new Date(booking.updatedAt || booking.createdAt!), 'd MMM yyyy', { locale: arSA })}</span></div>
                        <div className="flex justify-between"><span>السعر الإجمالي:</span> <span className="font-bold">{booking.totalPrice.toFixed(2)} {booking.currency}</span></div>
                        <div className="flex justify-between"><span>العربون المدفوع:</span> <span className="font-bold text-green-500">{depositAmount.toFixed(2)} {booking.currency}</span></div>
                        <div className="flex justify-between"><span>المبلغ المتبقي:</span> <span className="font-bold">{remainingAmount.toFixed(2)} {booking.currency}</span></div>
                    </div>
                 </div>

                 {trip.conditions && (
                    <div className="p-3 bg-background rounded-lg border space-y-2">
                        <p className="font-bold text-xs flex items-center gap-1"><ListFilter className="h-4 w-4 text-primary"/> شروط الناقل</p>
                        <p className="text-xs whitespace-pre-wrap">{trip.conditions}</p>
                    </div>
                 )}
            </CardContent>
            <CardFooter className="grid grid-cols-2 gap-2 p-2">
                 <Button variant="outline" size="sm" onClick={() => onMessageCarrier?.(booking, trip)}><MessageSquare className="ml-2 h-4 w-4" />مراسلة الناقل</Button>
                 <Button variant="outline" size="sm" disabled><Edit className="ml-2 h-4 w-4" />تعديل الطلب</Button>
            </CardFooter>
        </Card>
    )
};


const ArchivedCard = ({ trip, booking }: { trip: Trip, booking: Booking }) => (
    <Card className="bg-card/50">
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="text-sm">{getCityName(trip.origin)} - {getCityName(trip.destination)}</CardTitle>
                <Badge variant={booking.status === 'Completed' ? 'default' : 'destructive'} className="bg-opacity-70">
                    {booking.status === 'Completed' ? <CheckCircle className="ml-1 h-3 w-3" /> : <CalendarX className="ml-1 h-3 w-3" />}
                    {booking.status === 'Completed' ? 'مكتملة' : 'ملغاة'}
                </Badge>
            </div>
            <CardDescription className="text-xs">تاريخ الرحلة: {format(new Date(trip.departureDate), 'd MMM yyyy', { locale: arSA })}</CardDescription>
        </CardHeader>
    </Card>
);

// --- MAIN PAGE COMPONENT ---
export default function HistoryPage() {
  const { toast } = useToast();
  // Dialog states
  const [isBookingPaymentOpen, setIsBookingPaymentOpen] = useState(false);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<{ trip: Trip, booking: Booking } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedChatInfo, setSelectedChatInfo] = useState<{bookingId: string, otherPartyName: string} | null>(null);
  
  // --- MOCK DATA SIMULATION ---
  const allTripsAndBookings = useMemo(() => {
    // This combines all mock data into a format that can be filtered
    return [
        { trip: mockAwaitingGeneral, booking: null, status: mockAwaitingGeneral.status },
        { trip: mockAwaitingDirect, booking: null, status: mockAwaitingDirect.status },
        { ...mockPendingConfirmation, status: mockPendingConfirmation.booking.status },
        { ...mockPendingPayment, status: mockPendingPayment.booking.status },
        { ...mockConfirmed, status: mockConfirmed.booking.status },
        { ...mockArchivedCompleted, status: mockArchivedCompleted.booking.status },
    ];
  }, []);

  const { processingItems, ticketItems, archiveItems } = useMemo(() => {
      const processing: any[] = [];
      const tickets: any[] = [];
      const archive: any[] = [];

      allTripsAndBookings.forEach(item => {
          const status = item.status;
          if (status === 'Completed' || status === 'Cancelled') {
              archive.push(item);
          } else if (status === 'Confirmed') {
              tickets.push(item);
          } else {
              processing.push(item);
          }
      });
      return { processingItems: processing, ticketItems: tickets, archiveItems: archive };
  }, [allTripsAndBookings]);


  const handlePayNow = (trip: Trip, booking: Booking) => {
    setSelectedBookingForPayment({ trip, booking });
    setIsBookingPaymentOpen(true);
  }

  const handleMessageCarrier = (booking: Booking, trip: Trip) => {
      setSelectedChatInfo({
          bookingId: booking.id,
          otherPartyName: trip.carrierName || "الناقل"
      });
      setIsChatOpen(true);
  };
  
  const handleConfirmBookingPayment = () => {
    toast({ title: 'محاكاة: تم تأكيد الدفع بنجاح!', description: 'تم نقل حجزك إلى تذاكري النشطة.' });
    setIsBookingPaymentOpen(false);
  }

  const handleAcceptOffer = () => {
    toast({ title: 'محاكاة: تم قبول العرض!', description: 'طلبك الآن بانتظار موافقة الناقل النهائية.' });
  }

  return (
    <AppLayout>
      <div className="bg-background/80 p-2 md:p-8 rounded-lg space-y-8">
        <Card className="bg-card/90 border-border/50">
           <CardHeader>
              <CardTitle>إدارة الحجز والرحلات</CardTitle>
              <CardDescription>تابع طلباتك، عروضك، وحجوزاتك من هنا.</CardDescription>
          </CardHeader>
        </Card>

         <Tabs defaultValue="processing" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="processing"><ListFilter className="ml-2 h-4 w-4" />قيد المعالجة ({processingItems.length})</TabsTrigger>
                <TabsTrigger value="tickets"><Ticket className="ml-2 h-4 w-4" />تذاكري النشطة ({ticketItems.length})</TabsTrigger>
                <TabsTrigger value="archive"><Archive className="ml-2 h-4 w-4" />الأرشيف ({archiveItems.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="processing" className="mt-6 space-y-4">
                {processingItems.length > 0 ? processingItems.map(item => {
                    const key = item.trip.id + (item.booking?.id || '');
                    if (item.status === 'Awaiting-Offers') {
                        if (item.trip.requestType === 'Direct') {
                            return <WaitingCard key={key} trip={item.trip} />;
                        }
                        return <RequestTrackerCard key={key} trip={item.trip} onAcceptOffer={handleAcceptOffer} isProcessing={false}/>;
                    }
                    if (item.status === 'Pending-Carrier-Confirmation') {
                        return <WaitingCard key={key} trip={item.trip} />;
                    }
                    if (item.status === 'Pending-Payment') {
                        return <PaymentPass key={key} trip={item.trip} booking={item.booking} onPayNow={handlePayNow} />;
                    }
                    return null;
                }) : <div className="text-center py-16 text-muted-foreground">لا توجد طلبات قيد المعالجة حالياً.</div>}
            </TabsContent>

            <TabsContent value="tickets" className="mt-6 space-y-4">
                {ticketItems.length > 0 ? ticketItems.map(item => (
                    <HeroTicket 
                        key={item.booking.id} 
                        trip={item.trip} 
                        booking={item.booking}
                        onMessageCarrier={handleMessageCarrier}
                    />
                )) : <div className="text-center py-16 text-muted-foreground">لا توجد لديك تذاكر نشطة.</div>}
            </TabsContent>
            
            <TabsContent value="archive" className="mt-6 space-y-4">
                 {archiveItems.length > 0 ? archiveItems.map(item => (
                    <ArchivedCard key={item.booking.id} trip={item.trip} booking={item.booking} />
                 )) : <div className="text-center py-16 text-muted-foreground">الأرشيف فارغ.</div>}
            </TabsContent>
        </Tabs>
      </div>

       {/* --- Dialogs --- */}
      {selectedBookingForPayment && (
          <BookingPaymentDialog
            isOpen={isBookingPaymentOpen}
            onOpenChange={setIsBookingPaymentOpen}
            trip={selectedBookingForPayment.trip}
            booking={selectedBookingForPayment.booking}
            onConfirm={handleConfirmBookingPayment}
            isProcessing={false}
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
    </AppLayout>
  );
}
