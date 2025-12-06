
'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trip, Offer, Booking, UserProfile } from '@/lib/data';
import { CheckCircle, PackageOpen, Hourglass, Radar, MessageSquare, Flag, CreditCard, UserCheck, Ticket, ListFilter, Users, MapPin, Phone, Car, Link as LinkIcon, ArrowRight, ChevronLeft, Ship } from 'lucide-react';
import { TripOffers } from '@/components/trip-offers';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { doc, writeBatch, serverTimestamp, collection, query, where, runTransaction, limit } from 'firebase/firestore';
import { OfferDecisionRoom } from '@/components/offer-decision-room';

const cities: { [key: string]: string } = {
    damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص', amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
    riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام', cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة', baghdad: 'بغداد'
};
const getCityName = (key: string) => cities[key] || key;

// --- CARD COMPONENTS FOR DIFFERENT STATES ---
const PendingConfirmationCard = ({ booking, trip }: { booking: Booking, trip?: Trip | null }) => (
    <Card className="border-yellow-500 border-2 bg-yellow-500/5">
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-lg">{trip ? `${getCityName(trip.origin)} - ${getCityName(trip.destination)}` : '...'}</CardTitle>
                    <CardDescription>مع الناقل: {trip?.carrierName || '...'}</CardDescription>
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

const AwaitingOffersCard = ({ trip, offerCount, onClick }: { trip: Trip, offerCount: number, onClick: () => void }) => (
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


// --- MAIN PAGE COMPONENT ---
export default function HistoryPage() {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [activeTripRequest, setActiveTripRequest] = useState<Trip | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- QUERIES FOR ALL ACTIVE STATES ---
  const confirmedQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'bookings'), where('userId', '==', user.uid), where('status', '==', 'Confirmed'), limit(1));
  }, [firestore, user]);
  
  const awaitingOffersQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'trips'), where('userId', '==', user.uid), where('status', '==', 'Awaiting-Offers'));
  }, [firestore, user]);
  
  const pendingConfirmationQuery = useMemo(() => {
      if (!firestore || !user) return null;
      return query(collection(firestore, 'bookings'), where('userId', '==', user.uid), where('status', '==', 'Pending-Carrier-Confirmation'));
  }, [firestore, user]);
  
  // --- DATA FETCHING ---
  const { data: confirmedBookings, isLoading: isLoadingConfirmed } = useCollection<Booking>(confirmedQuery);
  const { data: awaitingOffersTrips, isLoading: isLoadingAwaiting } = useCollection<Trip>(awaitingOffersQuery);
  const { data: pendingBookings, isLoading: isLoadingPending } = useCollection<Booking>(pendingConfirmationQuery);

  const confirmedBooking = confirmedBookings?.[0];
  const { data: confirmedTrip } = useDoc<Trip>(
    (firestore && confirmedBooking) ? doc(firestore, 'trips', confirmedBooking.tripId) : null
  );

  const offersQuery = useMemo(() => {
      if (!firestore || !activeTripRequest) return null;
      return query(collection(firestore, 'trips', activeTripRequest.id, 'offers'));
  }, [firestore, activeTripRequest]);

  const { data: offersForActiveTrip, isLoading: isLoadingOffers } = useCollection<Offer>(offersQuery);

  const handleAcceptOffer = async (trip: Trip, offer: Offer) => {
    if (!firestore || !user) return;
    setIsProcessing(true);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const tripRef = doc(firestore, 'trips', trip.id);
            const offerRef = doc(firestore, 'trips', trip.id, 'offers', offer.id);
            const bookingRef = doc(collection(firestore, 'bookings'));

            const newBookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
                tripId: trip.id,
                userId: user.uid,
                carrierId: offer.carrierId,
                seats: trip.passengers || 1,
                passengersDetails: trip.passengersDetails || [],
                status: 'Pending-Carrier-Confirmation',
                totalPrice: offer.price,
                currency: offer.currency as Booking['currency'],
            };
            transaction.set(bookingRef, { ...newBookingData, id: bookingRef.id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            
            transaction.update(tripRef, { status: 'Pending-Carrier-Confirmation', acceptedOfferId: offer.id, bookingIds: [bookingRef.id] });
            transaction.update(offerRef, { status: 'Accepted' });
        });
        
        toast({
            title: "تم قبول العرض بنجاح!",
            description: "تم إرسال طلب التأكيد النهائي للناقل. تابع من هنا."
        });
        setActiveTripRequest(null);
    } catch (error) {
        console.error("Error accepting offer:", error);
        toast({ variant: 'destructive', title: 'خطأ', description: 'فشل قبول العرض.' });
    } finally {
        setIsProcessing(false);
    }
  };

  // --- RENDER LOGIC ---
  const renderLoading = () => (
    <div className="flex h-[calc(100vh-300px)] flex-col items-center justify-center gap-4 text-center">
        <Ship className="h-16 w-16 animate-pulse text-primary" />
        <h1 className="text-xl font-bold text-muted-foreground">جاري تحميل غرفة العمليات...</h1>
    </div>
  );

  const renderContent = () => {
    // Priority 1: Show the confirmed ticket ("the masterpiece") exclusively if it exists.
    if (confirmedBooking && confirmedTrip) {
        return <HeroTicket key={confirmedBooking.id} trip={confirmedTrip} booking={confirmedBooking} />;
    }
    
    // Priority 2: Show the offer decision room if a request has been clicked.
    if (activeTripRequest) {
      return (
        <OfferDecisionRoom
            trip={activeTripRequest}
            offers={offersForActiveTrip || []}
            onAcceptOffer={handleAcceptOffer}
            isProcessing={isProcessing || isLoadingOffers}
            onBack={() => setActiveTripRequest(null)}
        />
      );
    }

    // Priority 3: Show pending processes if no confirmed ticket exists.
    const hasPendingProcesses = (pendingBookings && pendingBookings.length > 0) || (awaitingOffersTrips && awaitingOffersTrips.length > 0);
    if (hasPendingProcesses) {
        return (
            <div className="space-y-6">
                {pendingBookings && pendingBookings.map(booking => {
                    // This part is a bit tricky without a dedicated hook for multiple docs
                    return <PendingBookingWrapper key={booking.id} booking={booking} />;
                })}
                {awaitingOffersTrips && awaitingOffersTrips.map(trip => (
                    <AwaitingOffersCard 
                        key={trip.id} 
                        trip={trip} 
                        offerCount={0} // Simplified for now
                        onClick={() => setActiveTripRequest(trip)}
                    />
                ))}
            </div>
        );
    }

    // Default: No active processes found.
    return (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
            <PackageOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4"/>
            <p className="font-bold">لا توجد لديك أي حجوزات أو طلبات نشطة.</p>
            <p className="text-sm mt-2">ابدأ رحلتك التالية من لوحة التحكم الرئيسية.</p>
             <Button onClick={() => router.push('/dashboard')} className="mt-4">
                الذهاب إلى لوحة التحكم
            </Button>
        </div>
    );
  };
  
  const isLoading = isUserLoading || isLoadingConfirmed || isLoadingAwaiting || isLoadingPending;

  return (
    <AppLayout>
      <div className="bg-background/80 p-2 md:p-8 rounded-lg space-y-8">
        <Card className="bg-card/90 border-border/50">
           <CardHeader>
              <CardTitle>غرفة عمليات الحجز</CardTitle>
              <CardDescription>تابع كل طلباتك وحجوزاتك النشطة من هنا.</CardDescription>
          </CardHeader>
        </Card>
        {isLoading ? renderLoading() : renderContent()}
      </div>
    </AppLayout>
  );
}

// Helper component to fetch trip for each pending booking
function PendingBookingWrapper({ booking }: { booking: Booking }) {
    const firestore = useFirestore();
    const { data: trip, isLoading } = useDoc<Trip>(
        firestore ? doc(firestore, 'trips', booking.tripId) : null
    );
    if (isLoading) return <Skeleton className="h-32 w-full" />;
    return <PendingConfirmationCard booking={booking} trip={trip} />;
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
                        <div className="flex justify-between"><span>تاريخ الدفع:</span> <span className="font-bold">{booking.updatedAt ? format(new Date(booking.updatedAt as any), 'd MMM yyyy', { locale: arSA }) : 'N/A'}</span></div>
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


    