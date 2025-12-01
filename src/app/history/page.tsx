
'use client';
import { AppLayout } from '@/components/app-layout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useUser, useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, addDocumentNonBlocking, useDoc } from '@/firebase';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trip, Notification, Offer, Booking } from '@/lib/data';
import { collection, query, where, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { Bell, CheckCircle, PackageOpen, Ship, Hourglass, XCircle } from 'lucide-react';
import { OfferCard } from '@/components/offer-card';
import { useToast } from '@/hooks/use-toast';
import { LegalDisclaimerDialog } from '@/components/legal-disclaimer-dialog';

const statusMap: Record<string, string> = {
    'Awaiting-Offers': 'بانتظار العروض',
    'Planned': 'مؤكدة',
    'Completed': 'مكتملة',
    'Cancelled': 'ملغاة',
}

const statusVariantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    'Awaiting-Offers': 'outline',
    'Planned': 'secondary',
    'Completed': 'default',
    'Cancelled': 'destructive',
}

const cities: { [key: string]: string } = {
    damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص',
    amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
    riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام',
    cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة',
    dubai: 'دبي', kuwait: 'الكويت'
};


const BookingStatusManager = ({ trip }: { trip: Trip; }) => {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();
    const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
    const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

    const offersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, `trips/${trip.id}/offers`), where('status', '==', 'Pending'));
    }, [firestore, trip.id]);

    const { data: offers, isLoading: isLoadingOffers } = useCollection<Offer>(offersQuery);
    
    const bookingRef = useMemoFirebase(() => {
        if (!firestore || !trip.currentBookingId) return null;
        return doc(firestore, 'bookings', trip.currentBookingId);
    }, [firestore, trip.currentBookingId]);

    const { data: booking, isLoading: isLoadingBooking } = useDoc<Booking>(bookingRef);

    const handleAcceptClick = (offer: Offer) => {
        setSelectedOffer(offer);
        setIsDisclaimerOpen(true);
    };

    const handleDisclaimerContinue = async () => {
        setIsDisclaimerOpen(false);
        if (!firestore || !user || !selectedOffer || !trip.passengers) return;

        toast({
            title: "جاري إرسال طلب التأكيد...",
            description: "سيتم إعلام الناقل بطلبك.",
        });

        const bookingsCollection = collection(firestore, 'bookings');
        const newBookingRef = doc(bookingsCollection);

        const newBooking: Booking = {
            id: newBookingRef.id,
            tripId: trip.id,
            userId: user.uid,
            carrierId: selectedOffer.carrierId,
            seats: trip.passengers,
            status: 'Pending-Carrier-Confirmation',
            totalPrice: selectedOffer.price,
        };

        const tripRef = doc(firestore, 'trips', trip.id);

        try {
            const batch = writeBatch(firestore);
            batch.set(newBookingRef, newBooking);
            batch.update(tripRef, { 
                acceptedOfferId: selectedOffer.id,
                currentBookingId: newBooking.id
            });
            await batch.commit();

            toast({
                title: "تم استلام طلبك بنجاح",
                description: "تم إرسال طلبك للناقل وبانتظار تأكيد المقاعد.",
            });
        } catch (error) {
            console.error("Error creating booking:", error);
            toast({
                title: "حدث خطأ",
                description: "لم نتمكن من إرسال طلبك. يرجى المحاولة مرة أخرى.",
                variant: "destructive"
            });
        }
    };
    
    const handleCancelPendingConfirmation = async () => {
        if (!firestore || !trip.id || !trip.currentBookingId) return;

        const tripRef = doc(firestore, 'trips', trip.id);
        const bookingRef = doc(firestore, 'bookings', trip.currentBookingId);

        try {
            const batch = writeBatch(firestore);
            batch.delete(bookingRef);
            // Use updateDoc for unsetting fields
            await updateDoc(tripRef, {
                acceptedOfferId: null,
                currentBookingId: null,
            });

            toast({
                title: 'تم الإلغاء',
                description: 'تم إلغاء طلب تأكيد الحجز. يمكنك الآن اختيار عرض آخر.',
            });
        } catch (error) {
            console.error("Error cancelling booking confirmation:", error);
             toast({
                title: "حدث خطأ",
                description: "لم نتمكن من إلغاء الطلب. يرجى المحاولة مرة أخرى.",
                variant: "destructive"
            });
        }
    }

    if (isLoadingOffers || isLoadingBooking) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }
    
    // STATE 2: Waiting for carrier confirmation
    if (booking?.status === 'Pending-Carrier-Confirmation') {
        return (
             <div className="text-center p-8 bg-background/30">
                <Hourglass className="mx-auto h-12 w-12 text-accent mb-4 animate-spin" />
                <h3 className="text-xl font-bold mb-2">نحن في سفريات ننتظر الناقل ليؤكد المقاعد لك.</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
                    بمجرد أن يفتح شاشة الحجز، سيصلك إشعار فورًا لتكمل حجزك بسهولة. هدفنا أن تكون العملية سلسة ومنظمة دون تراكم حجوزات عند الناقل.
                </p>
                <Button variant="ghost" onClick={handleCancelPendingConfirmation} className="text-red-500 hover:bg-red-500/10">
                    <XCircle className="ml-2 h-4 w-4" />
                    إلغاء الطلب والعودة للعروض
                </Button>
            </div>
        )
    }

    // STATE 1: Displaying offers
    if (!offers || offers.length === 0) {
        return <p className="text-center text-muted-foreground p-8">لم يصلك أي عروض بعد، عليك الانتظار.</p>;
    }

    return (
        <>
            <div className="p-0 md:p-0 space-y-4">
                <p className="text-center text-accent font-semibold px-4 pt-4">انتظر، قد تصلك عروض أفضل.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {offers.map(offer => (
                        <OfferCard key={offer.id} offer={offer} trip={trip} onAccept={() => handleAcceptClick(offer)} />
                    ))}
                </div>
            </div>
            {selectedOffer && (
                 <LegalDisclaimerDialog 
                    isOpen={isDisclaimerOpen}
                    onOpenChange={setIsDisclaimerOpen}
                    onContinue={handleDisclaimerContinue}
                />
            )}
        </>
    );
};


export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const [openAccordion, setOpenAccordion] = useState<string[]>([]);
  
  const userTripsQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return query(collection(firestore, 'trips'), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: allUserTrips, isLoading } = useCollection<Trip>(userTripsQuery);

  const awaitingTrips = allUserTrips?.filter(t => t.status === 'Awaiting-Offers') || [];
  const confirmedTrips = allUserTrips?.filter(t => ['Planned', 'Completed', 'Cancelled'].includes(t.status)) || [];
  
  const hasAwaitingOffers = !isLoading && awaitingTrips.length > 0;
  const hasConfirmedTrips = !isLoading && confirmedTrips.length > 0;
  
  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/notifications`));
  }, [firestore, user]);
  const { data: notifications } = useCollection<Notification>(notificationsQuery);
  const notificationCount = notifications?.length || 0;

  useEffect(() => {
    if (!isUserLoading && !user) {
        router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (isLoading) return;
    
    const openItems: string[] = [];
    if (hasAwaitingOffers) openItems.push('awaiting');
    if (hasConfirmedTrips) openItems.push('confirmed');
    setOpenAccordion(openItems);

  }, [hasAwaitingOffers, hasConfirmedTrips, isLoading]);


  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
    </div>
  );

  if (isUserLoading) return <AppLayout>{renderSkeleton()}</AppLayout>;


  return (
    <AppLayout>
      <div className="bg-[#130609] p-0 md:p-8 rounded-lg space-y-8">
        <Card style={{ backgroundColor: '#EDC17C' }} className="rounded-none md:rounded-lg">
          <CardHeader className="p-4">
            <div className="flex justify-between items-start">
              <div className="text-black">
                <CardTitle>إدارة الحجز</CardTitle>
                <CardDescription className="text-black/80">تابع العروض والحجوزات من هنا</CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative text-black hover:bg-black/10">
                    <Bell className="h-5 w-5" />
                    {notificationCount > 0 && <Badge className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 text-xs">{notificationCount}</Badge>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications?.length > 0 ? (
                    notifications.map((notif) => (
                      <DropdownMenuItem key={notif.id} className="flex flex-col items-start gap-1">
                        <p className="font-bold">{notif.title}</p>
                        <p className="text-xs text-muted-foreground">{notif.message}</p>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">لا توجد إشعارات جديدة.</div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
        </Card>

        <Accordion type="multiple" className="w-full space-y-6" value={openAccordion} onValueChange={setOpenAccordion}>
          
          {isLoading && renderSkeleton()}
          {hasAwaitingOffers && (
            <AccordionItem value="awaiting" className="border-none">
              <Card className="rounded-none md:rounded-lg">
                <AccordionTrigger className="p-6 text-lg hover:no-underline">
                  <div className='flex items-center gap-2'><PackageOpen className="h-6 w-6 text-primary" /><CardTitle>طلبات بانتظار العروض</CardTitle></div>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  <CardDescription className="mb-4 px-6">
                    هنا تظهر طلباتك التي أرسلتها. يمكنك استعراض العروض المقدمة من الناقلين لكل طلب.
                  </CardDescription>
                  <Accordion type="single" collapsible className="w-full">
                       {awaitingTrips.map(trip => {
                            return (
                                <AccordionItem value={trip.id} key={trip.id} className="border-none">
                                    <Card className="overflow-hidden rounded-none">
                                        <AccordionTrigger className="p-4 bg-card/80 hover:no-underline data-[state=closed]:rounded-b-none">
                                            <div className="flex justify-between items-center w-full">
                                                <div className="text-right">
                                                    <div className="flex items-center gap-3">
                                                        <p className="font-bold text-base">{cities[trip.origin as keyof typeof cities] || trip.origin} إلى {cities[trip.destination as keyof typeof cities] || trip.destination}</p>
                                                        <p className="text-sm text-muted-foreground">({new Date(trip.departureDate).toLocaleDateString('ar-SA')})</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-0">
                                            <BookingStatusManager trip={trip} />
                                        </AccordionContent>
                                    </Card>
                                </AccordionItem>
                            )
                       })}
                  </Accordion>
                </AccordionContent>
                </Card>
            </AccordionItem>
          )}
          
          {isLoading && renderSkeleton()}
          {hasConfirmedTrips && (
              <AccordionItem value="confirmed" className="border-none">
                <Card className="rounded-none md:rounded-lg">
                  <AccordionTrigger className="p-6 text-lg hover:no-underline">
                    <div className='flex items-center gap-2'><CheckCircle className="h-6 w-6 text-green-500" /><CardTitle>رحلاتي السابقة والمؤكدة</CardTitle></div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="space-y-6 p-4 md:p-6">
                      <CardDescription className="mb-4">سجل رحلاتك التي قمت بحجزها بالفعل.</CardDescription>
                      <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-right">الناقل</TableHead>
                                <TableHead className="text-right">من</TableHead>
                                <TableHead className="text-right">إلى</TableHead>
                                <TableHead className="text-right">تاريخ الرحلة</TableHead>
                                <TableHead className="text-right">الحالة</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {confirmedTrips.map(trip => (
                               <TableRow key={trip.id}>
                                  <TableCell>{trip.carrierName || 'غير محدد'}</TableCell>
                                  <TableCell>{cities[trip.origin as keyof typeof cities] || trip.origin}</TableCell>
                                  <TableCell>{cities[trip.destination as keyof typeof cities] || trip.destination}</TableCell>
                                  <TableCell>{new Date(trip.departureDate).toLocaleDateString('ar-SA')}</TableCell>
                                  <TableCell><Badge variant={statusVariantMap[trip.status]}>{statusMap[trip.status]}</Badge></TableCell>
                               </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            )
          }
        </Accordion>
        
        {!isLoading && !hasAwaitingOffers && !hasConfirmedTrips && (
            <div className="text-center text-muted-foreground py-12">
                <Ship className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg">لا يوجد لديك أي حجوزات أو طلبات حالياً.</p>
                <p className="text-sm mt-2">يمكنك البحث عن رحلة أو طلب حجز جديد من لوحة التحكم.</p>
                <Button onClick={() => router.push('/dashboard')} className="mt-4">الذهاب إلى لوحة التحكم</Button>
            </div>
        )}

      </div>
    </AppLayout>
  );
}

