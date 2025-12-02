'use client';

import { AppLayout } from '@/components/app-layout';
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
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, writeBatch, orderBy, limit } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trip, Notification, Offer } from '@/lib/data';
import { Bell, CheckCircle, PackageOpen, AlertCircle, Phone, Pencil, SendHorizonal, Paperclip, CalendarX, PlusCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { TripOffers } from '@/components/trip-offers';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { BookingDialog, type PassengerDetails } from '@/components/booking-dialog';

// --- Helper Functions ---
const statusMap: Record<string, string> = {
    'Awaiting-Offers': 'بانتظار العروض',
    'Planned': 'مؤكدة',
    'Completed': 'مكتملة',
    'Cancelled': 'ملغاة',
    'Pending-Carrier-Confirmation': 'بانتظار تأكيد الناقل'
}

const statusVariantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    'Awaiting-Offers': 'outline',
    'Planned': 'secondary',
    'Completed': 'default',
    'Cancelled': 'destructive',
    'Pending-Carrier-Confirmation': 'secondary'
}

const safeDateFormat = (dateInput: any, formatStr: string = 'PPP'): string => {
    if (!dateInput) return 'N/A';
    try {
        let dateObj;
        if (typeof dateInput.toDate === 'function') {
            dateObj = dateInput.toDate();
        } else {
            dateObj = new Date(dateInput);
        }
        return format(dateObj, formatStr, { locale: arSA });
    } catch (error) {
        return 'تاريخ غير صالح';
    }
};

// --- DUMMY DATA ---
const dummyAwaitingTrips: Trip[] = [
    { id: 'DUMMY01', userId: 'test-user', origin: 'الرياض', destination: 'عمّان', departureDate: new Date().toISOString(), status: 'Awaiting-Offers', carrierName: '', passengers: 2 },
];
const dummyConfirmedTrips: Trip[] = [
    { id: 'DUMMY02', userId: 'test-user', origin: 'جدة', destination: 'القاهرة', departureDate: '2024-08-10T20:00:00Z', status: 'Planned', carrierId: 'carrier01', carrierName: 'سفريات الأمان', cargoDetails: 'أمتعة شخصية', vehicleType: 'GMC Yukon', passengers: 1, price: 250 },
    { id: 'DUMMY03', userId: 'test-user', origin: 'الدمام', destination: 'دبي', departureDate: '2024-07-25T09:15:00Z', status: 'Planned', carrierId: 'carrier02', carrierName: 'الناقل الدولي', cargoDetails: 'مواد بناء', vehicleType: 'Ford Transit', passengers: 4, price: 400 },
];

export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [selectedOfferForBooking, setSelectedOfferForBooking] = useState<{trip: Trip, offer: Offer} | null>(null);
  const [isProcessingBooking, setIsProcessingBooking] = useState(false);
  
  // --- REAL DATA FETCHING ---
  const awaitingTripsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'trips'), 
      where('userId', '==', user.uid),
      where('status', '==', 'Awaiting-Offers'),
      orderBy('departureDate', 'asc'),
      limit(10)
    );
  }, [firestore, user]);
  const { data: realAwaitingTrips, isLoading: isLoadingAwaiting } = useCollection<Trip>(awaitingTripsQuery);
  
  const confirmedTripsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, 'trips'),
        where('userId', '==', user.uid),
        where('status', 'in', ['Planned', 'Pending-Carrier-Confirmation', 'Completed']),
        orderBy('departureDate', 'desc'),
        limit(10)
    );
  }, [firestore, user]);
  const { data: realConfirmedTrips, isLoading: isLoadingConfirmed } = useCollection<Trip>(confirmedTripsQuery);

  
  // --- FALLBACK LOGIC ---
  const awaitingTrips = (realAwaitingTrips && realAwaitingTrips.length > 0) ? realAwaitingTrips : dummyAwaitingTrips;
  const hasAwaitingSection = !isLoadingAwaiting && awaitingTrips && awaitingTrips.length > 0;
  
  const confirmedTrips = (realConfirmedTrips && realConfirmedTrips.length > 0) ? realConfirmedTrips : dummyConfirmedTrips;
  const hasConfirmedTrips = !isLoadingConfirmed && confirmedTrips && confirmedTrips.length > 0;

  const notifications: Notification[] = []; 
  const notificationCount = notifications?.length || 0;

  useEffect(() => {
    if (!isUserLoading && !user) {
        router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (isLoadingAwaiting || isLoadingConfirmed) return;
    
    // Auto-open logic
    if (awaitingTrips.length > 0 && awaitingTrips[0].id !== 'DUMMY01') {
      setOpenAccordion('awaiting');
    } else if (hasConfirmedTrips) {
      setOpenAccordion('confirmed');
    } else {
      setOpenAccordion(undefined);
    }
  }, [awaitingTrips, hasConfirmedTrips, isLoadingAwaiting, isLoadingConfirmed]);

  const handleAcceptOffer = (trip: Trip, offer: Offer) => {
    // --- POLICY: DUMMY DATA CHECK ---
    if (trip.id.startsWith('DUMMY')) {
        toast({
            title: "فحص العروض الوهمية",
            description: "هذا إجراء وهمي للفحص. يتم إنشاء الحجوزات للعروض الحقيقية فقط.",
        });
        return;
    }
    
    setSelectedOfferForBooking({ trip, offer });
    setIsBookingDialogOpen(true);
  };
  
  const handleConfirmBooking = async (passengers: PassengerDetails[]) => {
      if (!firestore || !user || !selectedOfferForBooking) return;
      
      setIsProcessingBooking(true);
      const { trip, offer } = selectedOfferForBooking;
      
      try {
        const batch = writeBatch(firestore);

        const bookingRef = doc(collection(firestore, 'bookings'));
        batch.set(bookingRef, {
            id: bookingRef.id,
            tripId: trip.id,
            offerId: offer.id,
            userId: user.uid,
            carrierId: offer.carrierId,
            seats: passengers.length,
            passengersDetails: passengers,
            status: 'Pending-Carrier-Confirmation',
            totalPrice: offer.price * passengers.length,
            createdAt: new Date().toISOString(),
        });

        const tripRef = doc(firestore, 'trips', trip.id);
        batch.update(tripRef, {
            status: 'Pending-Carrier-Confirmation',
            acceptedOfferId: offer.id,
            currentBookingId: bookingRef.id,
            carrierId: offer.carrierId,
        });

        const notificationRef = doc(collection(firestore, `users/${offer.carrierId}/notifications`));
        batch.set(notificationRef, {
            userId: offer.carrierId,
            title: `طلب حجز جديد لرحلة ${trip.origin} - ${trip.destination}`,
            message: `لديك طلب حجز جديد من المستخدم ${user.displayName || user.email}. الرجاء مراجعة قسم الحجوزات للتأكيد.`,
            type: 'new_booking_request',
            isRead: false,
            createdAt: new Date().toISOString(),
            link: `/carrier-dashboard/bookings`,
        });

        await batch.commit();

        toast({
            title: 'تم إرسال طلب الحجز بنجاح!',
            description: 'تم تحويل طلبك إلى حجز وفي انتظار موافقة الناقل. سيتم إعلامك بالتحديثات.',
        });
        
        setIsBookingDialogOpen(false);
        setSelectedOfferForBooking(null);

    } catch (e) {
        toast({
            variant: "destructive",
            title: "فشلت العملية",
            description: "حدث خطأ أثناء الحجز، يرجى المحاولة لاحقاً.",
        });
    } finally {
        setIsProcessingBooking(false);
    }
  };


  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
    </div>
  );

  if (isUserLoading) return <AppLayout>{renderSkeleton()}</AppLayout>;

  return (
    <AppLayout>
      <div className="bg-background/80 p-2 md:p-8 rounded-lg space-y-8">
        <Card className="bg-card/90 border-border/50">
          <CardHeader className="p-4 md:p-6">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>إدارة الحجز</CardTitle>
                <CardDescription>تابع العروض والحجوزات من هنا</CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="relative" aria-label="عرض الإشعارات">
                  <Bell className="h-5 w-5" aria-hidden="true" />
                  {notificationCount > 0 && <Badge className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 text-xs">{notificationCount}</Badge>}
              </Button>
            </div>
          </CardHeader>
        </Card>
        
        {!isLoadingAwaiting && !isLoadingConfirmed && !hasAwaitingSection && !hasConfirmedTrips && (
             <div className="text-center py-16 border-2 border-dashed rounded-lg bg-card/50">
                <CalendarX className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
                <h3 className="text-xl font-bold">لا يوجد سجل رحلات</h3>
                <p className="text-muted-foreground mt-2 mb-6">يبدو أنك لم تقم بإنشاء أي طلبات بعد.</p>
                <Button onClick={() => router.push('/dashboard')}>
                    <PlusCircle className="ml-2 h-4 w-4" />
                    إنشاء طلب رحلة جديد
                </Button>
             </div>
        )}

        <Accordion type="single" collapsible className="w-full space-y-6" value={openAccordion} onValueChange={setOpenAccordion}>
          {isLoadingAwaiting ? renderSkeleton() : (
            hasAwaitingSection && (
            <AccordionItem value="awaiting" className="border-none">
              <Card className="bg-card/90 border-border/50">
                <AccordionTrigger className="p-6 text-lg hover:no-underline">
                  <div className='flex items-center gap-2'><PackageOpen className="h-6 w-6 text-primary" aria-hidden="true" /><CardTitle>عروض الناقلين ({awaitingTrips.length})</CardTitle></div>
                </AccordionTrigger>
                <AccordionContent>
                    {awaitingTrips.map(trip => (
                          <CardContent key={trip.id} className="border-t pt-6">
                            <div className="mb-4">
                                <CardTitle className="text-md">طلب رحلة: {trip.origin} إلى {trip.destination}</CardTitle>
                                <CardDescription className="text-xs">
                                    تاريخ الطلب: {safeDateFormat(trip.departureDate)} | عدد الركاب: {trip.passengers || 'غير محدد'}
                                </CardDescription>
                            </div>
                            <TripOffers trip={trip} onAcceptOffer={(offer) => handleAcceptOffer(trip, offer)} />
                          </CardContent>
                    ))}
                </AccordionContent>
              </Card>
            </AccordionItem>
           )
          )}
          
          {isLoadingConfirmed ? renderSkeleton() : (
            hasConfirmedTrips && (
              <AccordionItem value="confirmed" className="border-none">
                <Card className="bg-card/90 border-border/50">
                  <AccordionTrigger className="p-6 text-lg hover:no-underline">
                    <div className='flex items-center gap-2'><CheckCircle className="h-6 w-6 text-green-500" aria-hidden="true" /><CardTitle>رحلاتي المؤكدة ({confirmedTrips.length})</CardTitle></div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="space-y-6">
                      {confirmedTrips.map((trip) => (
                        <Card key={trip.id} className="bg-background/50 border-border/50">
                           <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-base font-bold">رحلة {trip.origin} إلى {trip.destination}</CardTitle>
                                    <Badge variant={statusVariantMap[trip.status] || 'outline'}>{statusMap[trip.status] || trip.status}</Badge>
                                </div>
                           </CardHeader>
                           <CardContent className="grid md:grid-cols-2 gap-y-4 md:gap-6 p-4 md:p-6">
                                {/* Left Column: E-Ticket */}
                                <div className="p-4 border rounded-lg bg-card/50 space-y-3">
                                    <h3 className="font-bold border-b pb-2 mb-3">التذكرة الإلكترونية</h3>
                                    <div className="space-y-3 text-sm">
                                        <p><strong>الناقل:</strong> {trip.carrierName}</p>
                                        <p><strong>تاريخ الحجز:</strong> {safeDateFormat(trip.departureDate)}</p>
                                        <p><strong>القيمة الإجمالية:</strong> {trip.price} ريال</p>
                                        <p><strong>الركاب:</strong> {trip.passengers} راكب</p>
                                        <p><strong>تاريخ الانطلاق:</strong> {safeDateFormat(trip.departureDate, 'PPP p')}</p>
                                        <div className="border-t my-2"></div>
                                        <p className="text-xs text-amber-500"><strong>تعليمات:</strong> التواجد في موقع الانطلاق قبل ساعة ونصف من وقت الانطلاق.</p>
                                    </div>
                                </div>

                                {/* Right Column: Control & Communication Hub */}
                                <div className="p-4 border rounded-lg bg-card/50 space-y-4 flex flex-col">
                                     <h3 className="font-bold border-b pb-2 mb-3">مركز التحكم والتواصل</h3>

                                    <div className="p-3 rounded-lg bg-yellow-900/50 border border-yellow-700">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                                            <h4 className="font-bold text-yellow-300">تحديث على الموعد</h4>
                                        </div>
                                        <p className="text-sm mt-2">لا توجد تحديثات جديدة على موعد الرحلة.</p>
                                    </div>
                                    
                                    <div className="flex-grow flex flex-col space-y-2 h-72">
                                        <div className="flex-grow bg-muted/30 rounded-lg p-2 md:p-4 space-y-4 overflow-y-auto flex flex-col">
                                            {/* Chat Mockup */}
                                            <div className="flex items-end gap-2 max-w-md">
                                                <div className="bg-gray-700 text-white p-3 rounded-lg rounded-bl-none">
                                                    <p className="text-sm">أهلاً بك، تم تأكيد حجزك. هل لديك أي استفسارات؟</p>
                                                </div>
                                            </div>
                                            <div className="flex items-end gap-2 justify-end">
                                                <div className="bg-accent text-accent-foreground p-3 rounded-lg rounded-br-none">
                                                    <p className="text-sm">شكرًا لكم. كل شيء واضح حاليًا.</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-auto bg-background p-2 rounded-lg border">
                                            <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0" aria-label="إرفاق ملف">
                                                <Paperclip className="h-5 w-5" aria-hidden="true" />
                                            </Button>
                                            <Textarea placeholder="اكتب رسالتك هنا..." className="flex-grow bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none h-10 p-2" rows={1} />
                                            <Button size="icon" variant="default" className="h-10 w-10 shrink-0 bg-accent hover:bg-accent/90" aria-label="إرسال الرسالة">
                                                <SendHorizonal className="h-5 w-5" aria-hidden="true" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="border-t pt-4 space-y-2">
                                         <Button variant="outline" className="w-full"><Phone className="ml-2 h-4 w-4"/> التواصل مع الناقل</Button>
                                         <Button variant="destructive" className="w-full"><Pencil className="ml-2 h-4 w-4"/> طلب إلغاء الحجز</Button>
                                    </div>
                                </div>
                           </CardContent>
                        </Card>
                      ))}
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            )
          )}
        </Accordion>
      </div>

    {selectedOfferForBooking && (
        <BookingDialog 
            isOpen={isBookingDialogOpen}
            onOpenChange={setIsBookingDialogOpen}
            trip={selectedOfferForBooking.trip}
            seatCount={selectedOfferForBooking.trip.passengers || selectedOfferForBooking.offer.availableSeats || 1}
            onConfirm={handleConfirmBooking}
            isProcessing={isProcessingBooking}
        />
    )}
    </AppLayout>
  );
}
