'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, addDocumentNonBlocking, useDoc } from '@/firebase';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trip, Offer, Booking, UserProfile } from '@/lib/data';
import { CheckCircle, PackageOpen, AlertCircle, PlusCircle, CalendarX, Hourglass, Radar, MessageSquare, Flag, CreditCard, UserCheck, Archive, Ticket, ListFilter, Users, MapPin, Phone, Car, Link as LinkIcon, Edit, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { doc } from 'firebase/firestore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


// --- STRATEGIC MOCK DATA FOR THE FULL LIFECYCLE ---
// 1. Awaiting Offers (General Request) -> Will show Radar - REMOVED FOR NOW

// 2. Awaiting Offers (Direct Request) -> Will show Hourglass - REMOVED FOR NOW

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
        carrierName: 'فوزي الناقل', 
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


// Helper data
const cities: { [key: string]: string } = {
    damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص', amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
    riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام', cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة',
};
const getCityName = (key: string) => cities[key] || key;

// --- MORPHING CARD COMPONENTS ---

const RequestTrackerCard = ({ trip }: { trip: Trip }) => {
    const [isOffersOpen, setIsOffersOpen] = useState(false);

    return (
        <>
            <Card className="border-primary border-2">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2 text-base"><Radar className="h-5 w-5 text-primary animate-pulse" /> طلب بانتظار العروض</CardTitle>
                        <Badge variant="outline">{trip.requestType === 'Direct' ? 'طلب مباشر' : 'طلب عام'}</Badge>
                    </div>
                    <CardDescription>رحلة من {getCityName(trip.origin)} إلى {getCityName(trip.destination)} بتاريخ {format(new Date(trip.departureDate), 'd MMMM', { locale: arSA })}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                     <p className="text-sm text-muted-foreground mb-4">لديك 3 عروض جديدة. استعرضها الآن واختر الأنسب لك.</p>
                     <Button className="w-full" onClick={() => setIsOffersOpen(true)}>
                        استعراض ومقارنة العروض
                    </Button>
                </CardContent>
            </Card>
            <Dialog open={isOffersOpen} onOpenChange={setIsOffersOpen}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>العروض المقدمة لطلبك</DialogTitle>
                        <DialogDescription>
                            قارن بين العروض واختر الأنسب لك.
                        </DialogDescription>
                    </DialogHeader>
                    <TripOffers trip={trip} onAcceptOffer={() => {}} isProcessing={false} />
                </DialogContent>
            </Dialog>
        </>
    );
};

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

const HeroTicket = ({ trip, booking, onCancelBooking, onMessageCarrier, toast }: { trip: Trip, booking: Booking, onCancelBooking?: (trip: Trip, booking: Booking) => void, onMessageCarrier?: (booking: Booking, trip: Trip) => void, toast: (options: any) => void }) => {
    // MOCK CARRIER DATA
    const carrierProfile: UserProfile = {
        id: 'carrier3',
        firstName: 'فوزي',
        lastName: 'الناقل',
        email: 'carrier@safar.com',
        phoneNumber: '+962791234567'
    };
    
    // Financial details
    const depositAmount = (booking.totalPrice * ((trip.depositPercentage || 20) / 100));
    const remainingAmount = booking.totalPrice - depositAmount;

    return (
        <Card className="bg-gradient-to-br from-card to-muted/50 shadow-lg border-accent">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <Badge variant="default" className="w-fit bg-accent text-accent-foreground mb-2">تذكرة مؤكدة</Badge>
                        <CardTitle className="pt-1">{getCityName(trip.origin)} - {getCityName(trip.destination)}</CardTitle>
                    </div>
                    <Button size="icon" variant="outline" className="rounded-full h-12 w-12" onClick={() => onMessageCarrier?.(booking, trip)}>
                        <MessageSquare className="h-6 w-6" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div className="p-3 bg-background rounded-lg border space-y-2">
                    <p className="font-bold text-xs flex items-center gap-1"><UserCheck className="h-4 w-4 text-primary"/> بيانات الناقل</p>
                    <div className="flex justify-between items-center text-xs">
                        <span>اسم الناقل:</span>
                        <span className="font-bold">{carrierProfile?.firstName || trip.carrierName}</span>
                    </div>
                     <div className="flex justify-between items-center text-xs">
                        <span>رقم الهاتف:</span>
                        {carrierProfile?.phoneNumber ? (
                           <a href={`tel:${carrierProfile.phoneNumber}`} className="font-bold hover:underline">{carrierProfile.phoneNumber}</a>
                        ) : <span className="font-bold">غير متوفر</span>}
                    </div>
                </div>

                 <div className="p-3 bg-background rounded-lg border space-y-2">
                    <p className="font-bold text-xs flex items-center gap-1"><MapPin className="h-4 w-4 text-primary"/> نقطة وتوقيت الانطلاق</p>
                    <div className="text-xs">
                         <div className="flex justify-between"><span>التاريخ:</span> <span className="font-bold">{format(new Date(trip.departureDate), 'd MMM yyyy', { locale: arSA })}</span></div>
                         <div className="flex justify-between"><span>الوقت:</span> <span className="font-bold">{format(new Date(trip.departureDate), 'h:mm a', { locale: arSA })}</span></div>
                         <div className="flex justify-between mt-1 pt-1 border-t"><span>المكان:</span> <span className="font-bold">{trip.meetingPoint}</span></div>
                    </div>
                    {trip.meetingPointLink && (
                        <a href={trip.meetingPointLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-xs flex items-center gap-1 hover:underline">
                            <LinkIcon className="h-3 w-3" />
                            عرض على الخريطة
                        </a>
                    )}
                </div>

                 <div className="p-3 bg-background rounded-lg border space-y-2">
                    <p className="font-bold text-xs flex items-center gap-1"><Car className="h-4 w-4 text-primary"/> تفاصيل المركبة</p>
                     <div className="flex justify-between items-center text-xs">
                        <span>نوع المركبة:</span>
                        <span className="font-bold">{trip.vehicleType || 'غير محدد'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span>رقم اللوحة:</span>
                        <span className="font-bold">{trip.vehiclePlateNumber || 'غير محدد'}</span>
                    </div>
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
                        <div className="flex justify-between"><span>تاريخ الدفع:</span> <span className="font-bold">{format(new Date(booking.updatedAt || booking.createdAt!), 'd MMM yyyy', { locale: arSA })}</span></div>
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
                 <Button variant="outline" size="sm" onClick={() => toast({title: "قيد الإنشاء"})} disabled>
                    <Edit className="ml-2 h-4 w-4" />تعديل الطلب
                 </Button>
                 <Button variant="destructive" size="sm" onClick={() => toast({title: "سيتم تنفيذ هذا لاحقاً"})}>
                    <XCircle className="ml-2 h-4 w-4" />إغلاق الرحلة
                 </Button>
            </CardFooter>
        </Card>
    )
};


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
        { ...mockPendingConfirmation, status: mockPendingConfirmation.booking.status },
        { ...mockPendingPayment, status: mockPendingPayment.booking.status },
        { ...mockConfirmed, status: mockConfirmed.booking.status },
    ];
  }, []);

  const { processingItems, ticketItems } = useMemo(() => {
      const processing: any[] = [];
      const tickets: any[] = [];

      allTripsAndBookings.forEach(item => {
          const status = item.status;
          if (status === 'Completed' || status === 'Cancelled') {
              // Archive items are no longer displayed on this page
          } else if (status === 'Confirmed') {
              tickets.push(item);
          } else {
              processing.push(item);
          }
      });
      return { processingItems: processing, ticketItems: tickets };
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
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="processing"><ListFilter className="ml-2 h-4 w-4" />قيد المعالجة ({processingItems.length})</TabsTrigger>
                <TabsTrigger value="tickets"><Ticket className="ml-2 h-4 w-4" />تذاكري النشطة ({ticketItems.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="processing" className="mt-6 space-y-4">
                {/* DUMMY ACCORDIONS FOR SURGERY */}
                <Accordion type="single" collapsible className="w-full space-y-4">
                    <AccordionItem value="item-1" className="border-none">
                       <Card className="border-accent">
                         <AccordionTrigger className="p-4 text-md hover:no-underline font-bold">
                            <div className="flex items-center gap-2">
                                <span>عمان - بغداد</span>
                                <Badge variant="outline">بانتظار العروض</Badge>
                            </div>
                         </AccordionTrigger>
                         <AccordionContent className="p-4 pt-0">
                            <div className="text-sm text-muted-foreground space-y-2">
                                <p>السعر المستهدف: 25 دينار</p>
                                <p>نسبة العربون المقترحة: 15%</p>
                                <Button size="sm" className="mt-2 w-full">استعراض العروض (0)</Button>
                            </div>
                         </AccordionContent>
                       </Card>
                    </AccordionItem>
                    <AccordionItem value="item-2" className="border-none">
                         <Card className="border-accent">
                             <AccordionTrigger className="p-4 text-md hover:no-underline font-bold">
                                <div className="flex items-center gap-2">
                                    <span>عمان - الرياض</span>
                                    <Badge variant="outline">بانتظار العروض</Badge>
                                </div>
                             </AccordionTrigger>
                             <AccordionContent className="p-4 pt-0">
                                <div className="text-sm text-muted-foreground space-y-2">
                                    <p>السعر المستهدف: 40 دينار</p>
                                    <p>نسبة العربون المقترحة: 25%</p>
                                    <Button size="sm" className="mt-2 w-full">استعراض العروض (0)</Button>
                                </div>
                             </AccordionContent>
                        </Card>
                    </AccordionItem>
                </Accordion>

                {processingItems.length > 0 ? processingItems.map(item => {
                    const key = item.trip.id + (item.booking?.id || '');
                    if (item.status === 'Awaiting-Offers') {
                       return <RequestTrackerCard key={key} trip={item.trip} />;
                    }
                    if (item.status === 'Pending-Carrier-Confirmation') {
                        return <WaitingCard key={key} trip={item.trip} />;
                    }
                    if (item.status === 'Pending-Payment') {
                        return <PaymentPass key={key} trip={item.trip} booking={item.booking} onPayNow={handlePayNow} />;
                    }
                    return null;
                }) : null /* Hiding the "no items" message for now */}
            </TabsContent>

            <TabsContent value="tickets" className="mt-6 space-y-4">
                {ticketItems.length > 0 ? ticketItems.map(item => (
                    <HeroTicket 
                        key={item.booking.id} 
                        trip={item.trip} 
                        booking={item.booking}
                        onMessageCarrier={handleMessageCarrier}
                        toast={toast}
                    />
                )) : <div className="text-center py-16 text-muted-foreground">لا توجد لديك تذاكر نشطة.</div>}
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
