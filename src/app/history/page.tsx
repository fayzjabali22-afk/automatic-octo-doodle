'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, addDocumentNonBlocking, useDoc, updateDocumentNonBlocking } from '@/firebase';
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
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { OfferDecisionRoom } from '@/components/offer-decision-room';


// --- STRATEGIC MOCK DATA FOR THE FULL LIFECYCLE ---

// SCENARIO 1: A trip request awaiting offers. This is the primary state for the "offers" path.
const mockAwaitingOffers: Trip = {
    id: 'trip_req_1',
    userId: 'current_user_mock',
    origin: 'amman',
    destination: 'riyadh',
    departureDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Awaiting-Offers',
    requestType: 'General',
    passengers: 2,
    createdAt: new Date().toISOString(),
};

// SCENARIO 2: A booking awaiting carrier confirmation. This is the primary state for the "direct booking" path.
const mockPendingConfirmation: { trip: Trip, booking: Booking } = {
    trip: { id: 'trip_pending_1', userId: 'user1', carrierId: 'carrier2', carrierName: 'الناقل السريع', origin: 'damascus', destination: 'amman', departureDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), status: 'Pending-Carrier-Confirmation' },
    booking: { id: 'booking_pending_1', tripId: 'trip_pending_1', userId: 'user1', carrierId: 'carrier2', seats: 1, passengersDetails: [{ name: 'Fayez Al-Harbi', type: 'adult' }], status: 'Pending-Carrier-Confirmation', totalPrice: 40, currency: 'JOD', createdAt: new Date().toISOString() }
};

// SCENARIO 3: A confirmed trip, ready for the "tickets" tab.
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

const mockOffers: Offer[] = [
    {
        id: 'offer1',
        tripId: 'trip_req_1',
        carrierId: 'carrier_A',
        price: 90,
        currency: 'JOD',
        notes: 'توقف للاستراحة في الطريق، واي فاي متوفر.',
        status: 'Pending',
        createdAt: new Date().toISOString(),
        vehicleType: 'GMC Yukon 2023',
        vehicleCategory: 'small',
        vehicleModelYear: 2023,
        availableSeats: 4,
        depositPercentage: 20,
        conditions: 'حقيبة واحدة فقط لكل راكب.'
    },
    {
        id: 'offer2',
        tripId: 'trip_req_1',
        carrierId: 'carrier_B',
        price: 85,
        currency: 'JOD',
        notes: 'رحلة مباشرة بدون توقف.',
        status: 'Pending',
        createdAt: new Date().toISOString(),
        vehicleType: 'Hyundai Staria 2024',
        vehicleCategory: 'small',
        vehicleModelYear: 2024,
        availableSeats: 6,
        depositPercentage: 15,
    }
];

// Helper data
const cities: { [key: string]: string } = {
    damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص', amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
    riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام', cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة', baghdad: 'بغداد'
};
const getCityName = (key: string) => cities[key] || key;

// --- CARD COMPONENTS FOR DIFFERENT STATES ---

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

const AwaitingOffersCard = ({ trip, offerCount, onClick }: { trip: Trip, offerCount: number, onClick: () => void }) => {
  return (
    <Card className="border-primary border-2 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors" onClick={onClick}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{getCityName(trip.origin)} - {getCityName(trip.destination)}</CardTitle>
            <CardDescription>طلبك منشور في السوق الآن</CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-2 bg-blue-100 text-blue-800 border-blue-300">
            <Radar className="h-4 w-4 animate-pulse" />
            بانتظار العروض
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-bold text-center text-primary">
          {offerCount > 0 ? `تم استلام ${offerCount} عرض. اضغط للاستعراض.` : "سيتم إعلامك فور وصول عروض جديدة."}
        </p>
      </CardContent>
    </Card>
  );
};


// --- MAIN PAGE COMPONENT ---
export default function HistoryPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const [activeTripRequest, setActiveTripRequest] = useState<Trip | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  // This state determines which path the user is on.
  const userPath: 'booking' | 'offers' | 'none' = useMemo(() => {
    if (mockPendingConfirmation) return 'booking';
    if (mockAwaitingOffers) return 'offers';
    return 'none';
  }, []);

  const pendingConfirmationBookings = userPath === 'booking' ? [mockPendingConfirmation] : [];
  const awaitingOffersTrips = userPath === 'offers' ? [mockAwaitingOffers] : [];
  const ticketItems = [mockConfirmed]; // Confirmed tickets always show up

  const handleAcceptOffer = (trip: Trip, offer: Offer) => {
    if (!firestore || !user) return;
    setIsProcessing(true);
    
    // SIMULATION
    toast({
        title: "محاكاة: تم قبول العرض!",
        description: "جاري إرسال طلب التأكيد النهائي للناقل. سيتم تحويلك إلى شاشة الانتظار."
    });

    setTimeout(() => {
        // In a real app, we would wait for a state change from Firestore.
        // Here, we just go back to the main history view.
        setActiveTripRequest(null); 
        setIsProcessing(false);
    }, 2000);
  };
  
  const renderMainContent = () => {
    if (activeTripRequest) {
      return (
        <OfferDecisionRoom
            trip={activeTripRequest}
            offers={mockOffers.filter(o => o.tripId === activeTripRequest.id)}
            onAcceptOffer={handleAcceptOffer}
            isProcessing={isProcessing}
            onBack={() => setActiveTripRequest(null)}
        />
      )
    }

    return (
         <Tabs defaultValue="processing" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="processing"><ListFilter className="ml-2 h-4 w-4" />قيد المعالجة</TabsTrigger>
                <TabsTrigger value="tickets"><Ticket className="ml-2 h-4 w-4" />تذاكري النشطة ({ticketItems.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="processing" className="mt-6 space-y-6">
                {userPath === 'booking' && (
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg">طلبات بانتظار الموافقة</h3>
                        {pendingConfirmationBookings.map(item => (
                            <PendingConfirmationCard key={item.booking.id} booking={item.booking} trip={item.trip} />
                        ))}
                    </div>
                )}
                
                {userPath === 'offers' && (
                     <div className="space-y-4">
                        <h3 className="font-bold text-lg">طلبات بانتظار العروض</h3>
                        {awaitingOffersTrips.map(trip => (
                            <AwaitingOffersCard 
                                key={trip.id} 
                                trip={trip} 
                                offerCount={mockOffers.filter(o => o.tripId === trip.id).length}
                                onClick={() => setActiveTripRequest(trip)}
                            />
                        ))}
                    </div>
                )}
                
                {userPath === 'none' && (
                    <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                        <PackageOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4"/>
                        <p className="font-bold">لا توجد لديك أي حجوزات أو طلبات قيد المعالجة.</p>
                        <p className="text-sm mt-1">ابدأ بحجز رحلتك الأولى من لوحة التحكم.</p>
                    </div>
                )}

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
    )
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
        
        {renderMainContent()}

      </div>
    </AppLayout>
  );
}

const HeroTicket = ({ trip, booking }: { trip: Trip, booking: Booking}) => {
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
        </Card>
    )
};
