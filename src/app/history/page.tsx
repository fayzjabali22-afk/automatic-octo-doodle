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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trip, Notification, Offer } from '@/lib/data';
import { Bell, CheckCircle, PackageOpen, Ship, Star, AlertCircle, Phone, Pencil, SendHorizonal, Paperclip } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TripOffers } from '@/components/trip-offers';
import { useToast } from '@/hooks/use-toast';


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

// --- START: DUMMY DATA FOR TESTING ---
const dummyAwaitingTrips: Trip[] = [
    { id: 'DUMMY01', userId: 'test-user', origin: 'الرياض', destination: 'عمّان', departureDate: new Date().toISOString(), status: 'Awaiting-Offers', carrierName: '', passengers: 2 },
];
const dummyConfirmedTrips: Trip[] = [
    { id: 'DUMMY02', userId: 'test-user', origin: 'جدة', destination: 'القاهرة', departureDate: '2024-08-10T20:00:00Z', status: 'Planned', carrierId: 'carrier01', carrierName: 'سفريات الأمان', cargoDetails: 'أمتعة شخصية', vehicleType: 'GMC Yukon', passengers: 1, price: 250 },
    { id: 'DUMMY03', userId: 'test-user', origin: 'الدمام', destination: 'دبي', departureDate: '2024-07-25T09:15:00Z', status: 'Planned', carrierId: 'carrier02', carrierName: 'الناقل الدولي', cargoDetails: 'مواد بناء', vehicleType: 'Ford Transit', passengers: 4, price: 400 },
    { id: 'DUMMY04', userId: 'test-user', origin: 'عمان', destination: 'الرياض', departureDate: '2024-07-15T12:00:00Z', status: 'Completed', carrierId: 'carrier03', carrierName: 'شركة النقل السريع', cargoDetails: 'أغراض شخصية', vehicleType: 'Hyundai Staria', passengers: 3, price: 100 },
];
// --- END: DUMMY DATA FOR TESTING ---


export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  
  // --- REAL DATA FETCHING ---
  const awaitingTripsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'trips'), 
      where('userId', '==', user.uid),
      where('status', '==', 'Awaiting-Offers')
    );
  }, [firestore, user]);
  const { data: realAwaitingTrips, isLoading: isLoadingAwaiting } = useCollection<Trip>(awaitingTripsQuery);

  // For now, confirmed trips still use dummy data
  const confirmedTrips: Trip[] | null = dummyConfirmedTrips;
  const isLoadingConfirmed = false;
  const hasConfirmedTrips = !isLoadingConfirmed && confirmedTrips && confirmedTrips.length > 0;
  // --- END REAL DATA ---
  
  // --- FALLBACK LOGIC ---
  const awaitingTrips = (realAwaitingTrips && realAwaitingTrips.length > 0) ? realAwaitingTrips : dummyAwaitingTrips;
  const useDummyOffers = !realAwaitingTrips || realAwaitingTrips.length === 0;
  const hasAwaitingSection = !isLoadingAwaiting && awaitingTrips && awaitingTrips.length > 0;
  // --- END FALLBACK LOGIC ---

  const notifications: Notification[] = []; // Dummy notifications
  const notificationCount = notifications?.length || 0;


  useEffect(() => {
    if (!isUserLoading && !user) {
        router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (isLoadingAwaiting || isLoadingConfirmed) return;
    
    if (hasConfirmedTrips) {
        setOpenAccordion('confirmed');
    } else if (hasAwaitingSection) {
        setOpenAccordion('awaiting');
    } else {
        setOpenAccordion(undefined);
    }
  }, [hasAwaitingSection, hasConfirmedTrips, isLoadingAwaiting, isLoadingConfirmed]);

  const handleAcceptOffer = (offer: Offer) => {
    // Placeholder for Phase 3
    toast({
      title: "قيد الإنشاء (المرحلة 3)",
      description: `سيتم تفعيل قبول العرض ${offer.id} في المرحلة القادمة.`,
    });
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
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

        <Accordion type="single" collapsible className="w-full space-y-6" value={openAccordion} onValueChange={setOpenAccordion}>
          {isLoadingAwaiting ? renderSkeleton() : (
            hasAwaitingSection && (
            <AccordionItem value="awaiting" className="border-none">
              <Card className="bg-card/90 border-border/50">
                <AccordionTrigger className="p-6 text-lg hover:no-underline">
                  <div className='flex items-center gap-2'><PackageOpen className="h-6 w-6 text-primary" /><CardTitle>عروض الناقلين</CardTitle></div>
                </AccordionTrigger>
                <AccordionContent>
                    {awaitingTrips.map(trip => (
                         <CardContent key={trip.id} className="border-t pt-6">
                            <div className="mb-4">
                                <CardTitle className="text-md">طلب رحلة: {trip.origin} إلى {trip.destination}</CardTitle>
                                <CardDescription className="text-xs">
                                    تاريخ الطلب: {new Date(trip.departureDate).toLocaleDateString('ar-SA')} | عدد الركاب: {trip.passengers || 'غير محدد'}
                                </CardDescription>
                            </div>
                            <TripOffers trip={trip} onAcceptOffer={handleAcceptOffer} />
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
                    <div className='flex items-center gap-2'><CheckCircle className="h-6 w-6 text-green-500" /><CardTitle>رحلاتي المؤكدة</CardTitle></div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="space-y-6">
                      <CardDescription className="mb-4">تابع رحلاتك التي قمت بحجزها بالفعل وأي تحديثات عليها.</CardDescription>
                      
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
                                        <p><strong>وقت الحجز:</strong> {new Date().toLocaleDateString('ar-SA')}</p>
                                        <p><strong>القيمة الإجمالية:</strong> {trip.price} ريال</p>
                                        <p><strong>الركاب:</strong> {trip.passengers} راكب</p>
                                        <p><strong>تاريخ الانطلاق:</strong> {new Date(trip.departureDate).toLocaleString('ar-SA', { dateStyle: 'full', timeStyle: 'short' })}</p>
                                        <div className="border-t my-2"></div>
                                        <p className="text-xs text-amber-500"><strong>تعليمات:</strong> التواجد في موقع الانطلاق قبل ساعة ونصف من وقت الانطلاق.</p>
                                    </div>
                                </div>

                                {/* Right Column: Control & Communication Hub */}
                                <div className="p-4 border rounded-lg bg-card/50 space-y-4 flex flex-col">
                                     <h3 className="font-bold border-b pb-2 mb-3">مركز التحكم والتواصل</h3>

                                    <div className="p-3 rounded-lg bg-yellow-900/50 border border-yellow-700">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="h-5 w-5 text-yellow-400" />
                                            <h4 className="font-bold text-yellow-300">تحديث على الموعد</h4>
                                        </div>
                                        <p className="text-sm mt-2">لا توجد تحديثات جديدة على موعد الرحلة.</p>
                                    </div>
                                    
                                    <div className="flex-grow flex flex-col space-y-2 h-72">
                                        <div className="flex-grow bg-muted/30 rounded-lg p-2 md:p-4 space-y-4 overflow-y-auto flex flex-col">
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
                                            <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0">
                                                <Paperclip className="h-5 w-5" />
                                            </Button>
                                            <Textarea placeholder="اكتب رسالتك هنا..." className="flex-grow bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none h-10 p-2" rows={1} />
                                            <Button size="icon" variant="default" className="h-10 w-10 shrink-0 bg-accent hover:bg-accent/90">
                                                <SendHorizonal className="h-5 w-5" />
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

    </AppLayout>
  );
}
