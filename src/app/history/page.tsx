'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, addDocumentNonBlocking, useDoc } from '@/firebase';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trip, Offer, Booking, UserProfile } from '@/lib/data';
import { CheckCircle, PackageOpen, AlertCircle, PlusCircle, CalendarX, Hourglass, Radar, MessageSquare, Flag, CreditCard, UserCheck, Ticket, ListFilter, Users, MapPin, Phone, Car, Link as LinkIcon, Edit, XCircle, Send, Loader2, ArrowRight } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';


// --- STRATEGIC MOCK DATA FOR THE FULL LIFECYCLE ---
// 1. Awaiting Offers (General Request) -> Will show Radar - REMOVED FOR NOW

// 2. Awaiting Offers (Direct Request) -> Will show Hourglass - REMOVED FOR NOW

// 3. Pending Carrier Confirmation -> Will be handled by state now
// const mockPendingConfirmation: { trip: Trip, booking: Booking } = {
//     trip: { id: 'trip_pending_1', userId: 'user1', carrierId: 'carrier2', carrierName: 'الناقل السريع', origin: 'damascus', destination: 'amman', departureDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), status: 'Pending-Carrier-Confirmation' },
//     booking: { id: 'booking_pending_1', tripId: 'trip_pending_1', userId: 'user1', carrierId: 'carrier2', seats: 1, passengersDetails: [{ name: 'Fayez Al-Harbi', type: 'adult' }], status: 'Pending-Carrier-Confirmation', totalPrice: 40, currency: 'JOD', createdAt: new Date().toISOString() }
// };

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

const mockTripBaghdad: Trip = {
    id: 'trip_baghdad_mock',
    carrierId: 'carrier_mock_1',
    carrierName: 'أسود الرافدين',
    origin: 'amman',
    destination: 'baghdad',
    departureDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Planned',
    price: 25,
    currency: 'دينار',
    availableSeats: 2,
    depositPercentage: 15,
    vehicleType: 'Hyundai Tucson 2023',
    userId: 'carrier_mock_1'
};
const mockTripRiyadh: Trip = {
    id: 'trip_riyadh_mock',
    carrierId: 'carrier_mock_2',
    carrierName: 'صقور الجزيرة',
    origin: 'amman',
    destination: 'riyadh',
    departureDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Planned',
    price: 40,
    currency: 'دينار',
    availableSeats: 4,
    depositPercentage: 25,
    vehicleType: 'Toyota Hiace 2024',
     userId: 'carrier_mock_2'
};

const processingTrips = [mockTripBaghdad, mockTripRiyadh];


// Helper data
const cities: { [key: string]: string } = {
    damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص', amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
    riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام', cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة', baghdad: 'بغداد'
};
const getCityName = (key: string) => cities[key] || key;

// --- MORPHING CARD COMPONENTS ---

const BookingPassengersScreen = ({ trip, seatCount, onCancel, onConfirm }: { trip: Trip, seatCount: number, onCancel: () => void, onConfirm: (passengers: any[]) => void }) => {
    // This is a placeholder component.
    const [passengers, setPassengers] = useState(() => Array.from({ length: seatCount }, () => ({ name: '', type: 'adult' })));
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        setPassengers(Array.from({ length: seatCount }, () => ({ name: '', type: 'adult' })));
    }, [seatCount]);


    const handleConfirm = () => {
        setIsProcessing(true);
        setTimeout(() => {
            onConfirm(passengers);
            setIsProcessing(false);
        }, 1500);
    }
    
    return (
        <div className="p-4 space-y-4 bg-background rounded-b-lg">
            <h3 className="font-bold text-lg">إدخال بيانات الركاب ({seatCount})</h3>
            {passengers.map((p, index) => (
                 <div key={index} className="space-y-2">
                    <Label htmlFor={`passenger-${index}`}>اسم الراكب {index + 1}</Label>
                    <Input id={`passenger-${index}`} placeholder="الاسم الكامل كما في الهوية" />
                </div>
            ))}
            <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={onCancel} disabled={isProcessing}>إلغاء</Button>
                <Button onClick={handleConfirm} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                    تأكيد الحجز
                </Button>
            </div>
        </div>
    )
};

const PendingConfirmationCard = ({ booking, trip }: { booking: Booking, trip: Trip }) => {
    return (
        <Card className="border-yellow-500 border-2 bg-yellow-500/5">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg">{getCityName(trip.origin)} - {getCityName(trip.destination)}</CardTitle>
                        <CardDescription>مع الناقل: {trip.carrierName}</CardDescription>
                    </div>
                     <Badge variant="outline" className="flex items-center gap-2 bg-yellow-100 text-yellow-800 border-yellow-300">
                        <Hourglass className="h-4 w-4 animate-spin" />
                        بانتظار موافقة الناقل
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-sm space-y-1">
                    <p><strong>عدد المقاعد:</strong> {booking.seats}</p>
                    <p><strong>السعر الإجمالي:</strong> {booking.totalPrice.toFixed(2)} {booking.currency}</p>
                </div>
            </CardContent>
        </Card>
    );
};


// --- MAIN PAGE COMPONENT ---
export default function HistoryPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Dialog states
  const [isBookingPaymentOpen, setIsBookingPaymentOpen] = useState(false);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<{ trip: Trip, booking: Booking } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedChatInfo, setSelectedChatInfo] = useState<{bookingId: string, otherPartyName: string} | null>(null);
  
  // State for dynamic view switching inside accordion
  const [bookingState, setBookingState] = useState<{ tripId: string | null, view: 'details' | 'booking' }>({ tripId: null, view: 'details' });
  const [seatCount, setSeatCount] = useState(1);
  
  // --- STATE FOR MOCK BOOKING LIFECYCLE ---
  const [pendingConfirmationBookings, setPendingConfirmationBookings] = useState<{booking: Booking, trip: Trip}[]>([]);


  useEffect(() => {
    const seats = searchParams.get('seats');
    setSeatCount(seats ? parseInt(seats, 10) : 1);
  }, [searchParams]);

  // --- MOCK DATA SIMULATION ---
  const allTripsAndBookings = useMemo(() => {
    return [
        { ...mockConfirmed, status: mockConfirmed.booking.status },
    ];
  }, []);

  const { ticketItems } = useMemo(() => {
      const tickets: any[] = [];
      allTripsAndBookings.forEach(item => {
          const status = item.status;
          if (status === 'Confirmed') {
              tickets.push(item);
          }
      });
      return { ticketItems: tickets };
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
  
  const handleBookNow = (trip: Trip) => {
    setBookingState({ tripId: trip.id, view: 'booking' });
  }
  
  const handleCancelBookingFlow = () => {
    setBookingState({ tripId: null, view: 'details' });
  }

  const handleConfirmBookingFlow = (passengers: any[]) => {
      // ** LIVE SIMULATION LOGIC **
      const currentTrip = processingTrips.find(t => t.id === bookingState.tripId);
      if (!currentTrip) return;

      const newBooking: Booking = {
        id: `booking_mock_${Date.now()}`,
        tripId: currentTrip.id,
        userId: 'current_user_mock',
        carrierId: currentTrip.carrierId!,
        seats: seatCount,
        passengersDetails: passengers,
        status: 'Pending-Carrier-Confirmation',
        totalPrice: (currentTrip.price || 0) * seatCount,
        currency: 'JOD',
        createdAt: new Date().toISOString(),
      };
      
      setPendingConfirmationBookings(prev => [...prev, { booking: newBooking, trip: currentTrip }]);
      
      toast({
        title: "محاكاة: تم إرسال طلب الحجز للناقل",
        description: "سيظهر طلبك في الأعلى بانتظار موافقة الناقل.",
      });
      
      setBookingState({ tripId: null, view: 'details' });
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
                <TabsTrigger value="processing"><ListFilter className="ml-2 h-4 w-4" />قيد المعالجة</TabsTrigger>
                <TabsTrigger value="tickets"><Ticket className="ml-2 h-4 w-4" />تذاكري النشطة ({ticketItems.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="processing" className="mt-6 space-y-6">
                {/* Section for bookings awaiting carrier confirmation */}
                {pendingConfirmationBookings.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg">طلبات بانتظار الموافقة</h3>
                        {pendingConfirmationBookings.map(item => (
                            <PendingConfirmationCard key={item.booking.id} booking={item.booking} trip={item.trip} />
                        ))}
                    </div>
                )}


                {/* Section for browsing and booking available trips */}
                <div className="space-y-4">
                     <h3 className="font-bold text-lg">رحلات مجدولة متاحة للحجز</h3>
                     <Accordion type="single" collapsible className="w-full space-y-4">
                        {processingTrips.map(trip => (
                           <AccordionItem key={trip.id} value={trip.id} className="border-none">
                               <Card className="border-accent">
                                 <AccordionTrigger className="p-4 text-md hover:no-underline font-bold flex justify-between w-full">
                                    <span className="text-right">{getCityName(trip.origin)} <ArrowRight className="inline h-4 w-4"/> {getCityName(trip.destination)}</span>
                                    <span className="text-base text-muted-foreground font-semibold text-left">السعر المعروض: {trip.price} {trip.currency}</span>
                                 </AccordionTrigger>
                                 <AccordionContent className="p-0">
                                    {bookingState.tripId === trip.id && bookingState.view === 'booking' ? (
                                        <BookingPassengersScreen 
                                            trip={trip}
                                            seatCount={seatCount}
                                            onCancel={handleCancelBookingFlow}
                                            onConfirm={handleConfirmBookingFlow}
                                        />
                                    ) : (
                                        <ScheduledTripCard trip={trip} onBookNow={() => handleBookNow(trip)} context="dashboard" />
                                    )}
                                 </AccordionContent>
                               </Card>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </TabsContent>

            <TabsContent value="tickets" className="mt-6 space-y-4">
                {ticketItems.length > 0 ? ticketItems.map(item => (
                    <HeroTicket 
                        key={item.booking.id} 
                        trip={item.trip} 
                        booking={item.booking}
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

const HeroTicket = ({ trip, booking }: { trip: Trip, booking: Booking}) => {
    // MOCK CARRIER DATA
    const carrierProfile: UserProfile = {
        id: 'carrier3',
        firstName: 'فوزي',
        lastName: 'الناقل',
        email: 'carrier@safar.com',
        phoneNumber: '+962791234567'
    };
    
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
                    {/* Placeholder for future message button */}
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
            {/* Footer can be added later if needed */}
        </Card>
    )
};
