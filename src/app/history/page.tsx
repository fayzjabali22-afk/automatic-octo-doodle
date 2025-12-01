
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
import { useUser, useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trip, Notification, Offer, CarrierProfile } from '@/lib/data';
import { mockOffers, tripHistory, mockCarriers } from '@/lib/data';
import { collection, query, where, doc, getDocs } from 'firebase/firestore';
import { Bell, CheckCircle, PackageOpen, Ship } from 'lucide-react';
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


const TripOffers = ({ trip }: { trip: Trip; }) => {
    const { toast } = useToast();
    const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
    const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
    
    // MOCK DATA USAGE: Using mockOffers instead of fetching from Firestore
    const offers = mockOffers.filter(offer => offer.tripId === trip.id && offer.status === 'Pending');
    const isLoading = false; // Mock data is never loading

    const handleAcceptClick = (offer: Offer) => {
        setSelectedOffer(offer);
        setIsDisclaimerOpen(true);
    };

    const handleDisclaimerContinue = () => {
        setIsDisclaimerOpen(false);
        // This is the final step in this flow for now.
        // It confirms the whole path is working.
        toast({
            title: "تم الإقرار.",
            description: "سيتم الآن فتح بطاقة الحجز...",
        });
        // In a future step, we will navigate to the unified booking screen from here.
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }
    
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
  
  const [displayedTrips, setDisplayedTrips] = useState(tripHistory);

  const awaitingTrips = displayedTrips.filter(t => t.status === 'Awaiting-Offers');
  const confirmedTrips = displayedTrips.filter(t => ['Planned', 'Completed', 'Cancelled'].includes(t.status));
  const isLoadingAwaiting = false;
  const isLoadingConfirmed = false;

  const hasAwaitingOffers = !isLoadingAwaiting && awaitingTrips && awaitingTrips.length > 0;
  const hasConfirmedTrips = !isLoadingConfirmed && confirmedTrips && confirmedTrips.length > 0;
  
  const notifications: Notification[] = []; // This will be connected to Firestore later
  const notificationCount = notifications?.length || 0;

  useEffect(() => {
    if (!isUserLoading && !user) {
        // router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (isLoadingAwaiting || isLoadingConfirmed) return;
    
    const openItems: string[] = [];
    if (hasAwaitingOffers) openItems.push('awaiting');
    if (hasConfirmedTrips) openItems.push('confirmed');
    setOpenAccordion(openItems);

  }, [hasAwaitingOffers, hasConfirmedTrips, isLoadingAwaiting, isLoadingConfirmed]);


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
          
          {isLoadingAwaiting && renderSkeleton()}
          {hasAwaitingOffers && (
            <AccordionItem value="awaiting" className="border-none">
              <Card className="rounded-none md:rounded-lg">
                <AccordionTrigger className="p-6 text-lg hover:no-underline">
                  <div className='flex items-center gap-2'><PackageOpen className="h-6 w-6 text-primary" /><CardTitle>طلبات بانتظار العروض</CardTitle></div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="p-0">
                    <CardDescription className="mb-4 px-6">
                      هنا تظهر طلباتك التي أرسلتها. يمكنك استعراض العروض المقدمة من الناقلين لكل طلب.
                    </CardDescription>
                    <Accordion type="single" collapsible className="w-full space-y-4 px-0 md:px-6">
                       {awaitingTrips.map(trip => {
                            return (
                                <AccordionItem value={trip.id} key={trip.id} className="border-none">
                                    <Card className="overflow-hidden rounded-none md:rounded-lg">
                                        <AccordionTrigger className="p-4 bg-card/80 hover:no-underline data-[state=closed]:rounded-b-lg">
                                            <div className="flex justify-between items-center w-full">
                                                <div className="text-right">
                                                    <div className="flex items-center gap-3">
                                                        <p className="font-bold text-base">{cities[trip.origin as keyof typeof cities] || trip.origin} إلى {cities[trip.destination as keyof typeof cities] || trip.destination}</p>
                                                        <p className="text-sm text-muted-foreground">({new Date(trip.departureDate).toLocaleDateString('ar-SA')})</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <TripOffers trip={trip} />
                                        </AccordionContent>
                                    </Card>
                                </AccordionItem>
                            )
                       })}
                    </Accordion>
                  </CardContent>
                </AccordionContent>
                </Card>
            </AccordionItem>
          )}
          
          {isLoadingConfirmed && renderSkeleton()}
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
                                  <TableCell>{trip.origin}</TableCell>
                                  <TableCell>{trip.destination}</TableCell>
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
        
        {!isLoadingAwaiting && !isLoadingConfirmed && !hasAwaitingOffers && !hasConfirmedTrips && (
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
