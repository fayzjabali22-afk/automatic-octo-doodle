
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
import { useUser } from '@/firebase';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trip, Notification } from '@/lib/data';
import { Bell, CheckCircle, PackageOpen, X, Ship, Star, MessageSquare, AlertCircle, Phone, Pencil, SendHorizonal, Paperclip } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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
    { id: 'DUMMY01', userId: 'test-user', origin: 'الرياض', destination: 'عمّان', departureDate: new Date().toISOString(), status: 'Awaiting-Offers', carrierName: '', carrierPhoneNumber: '', cargoDetails: '', vehicleType: '', vehicleCategory: 'small', vehicleModelYear: 2022, availableSeats: 0, passengers: 2 },
];
const dummyConfirmedTrips: Trip[] = [
    { id: 'DUMMY02', userId: 'test-user', origin: 'جدة', destination: 'القاهرة', departureDate: '2024-08-10T20:00:00Z', status: 'Planned', carrierName: 'سفريات الأمان', carrierPhoneNumber: '+966555555555', cargoDetails: 'أمتعة شخصية', vehicleType: 'GMC Yukon', vehicleCategory: 'small', vehicleModelYear: 2023, availableSeats: 0, passengers: 1 },
    { id: 'DUMMY03', userId: 'test-user', origin: 'الدمام', destination: 'دبي', departureDate: '2024-07-25T09:15:00Z', status: 'Planned', carrierName: 'الناقل الدولي', carrierPhoneNumber: '+966588884444', cargoDetails: 'مواد بناء', vehicleType: 'Ford Transit', vehicleCategory: 'bus', vehicleModelYear: 2021, availableSeats: 0, passengers: 4 },
    { id: 'DUMMY04', userId: 'test-user', origin: 'عمان', destination: 'الرياض', departureDate: '2024-07-15T12:00:00Z', status: 'Completed', carrierName: 'شركة النقل السريع', carrierPhoneNumber: '+966501234567', cargoDetails: 'أغراض شخصية', vehicleType: 'Hyundai Staria', vehicleCategory: 'small', vehicleModelYear: 2024, availableSeats: 0, passengers: 3 },
];

const dummyOffers = [
    { id: 'OFFER01', tripId: 'DUMMY01', carrierName: 'شركة النقل السريع', price: 150, downPayment: 15, rating: 4.8, vehicle: 'GMC Yukon 2023', departureDate: '2024-08-01T10:00:00Z' },
    { id: 'OFFER02', tripId: 'DUMMY01', carrierName: 'سفريات الأمان', price: 140, downPayment: 10, rating: 4.5, vehicle: 'Mercedes Sprinter 2022', departureDate: '2024-08-01T11:00:00Z' },
];
// --- END: DUMMY DATA FOR TESTING ---


export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  
  const confirmedTrips: Trip[] | null = dummyConfirmedTrips;
  const isLoadingConfirmed = false;
  const hasConfirmedTrips = !isLoadingConfirmed && confirmedTrips && confirmedTrips.length > 0;
  
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);

  // State for Dialogs
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);

  // Use dummy data for now
  const awaitingTrips: Trip[] | null = dummyAwaitingTrips;
  const isLoadingAwaiting = false;
  
  const notifications: Notification[] = []; // Dummy notifications
  const notificationCount = notifications?.length || 0;

  const hasAwaitingOffers = !isLoadingAwaiting && dummyOffers && dummyOffers.length > 0;

  useEffect(() => {
    if (!isUserLoading && !user) {
        router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (isLoadingAwaiting || isLoadingConfirmed) return;
    
    if (hasConfirmedTrips) {
        setOpenAccordion('confirmed');
    } else if (hasAwaitingOffers) {
        setOpenAccordion('awaiting');
    } else {
        setOpenAccordion(undefined);
    }
  }, [hasAwaitingOffers, hasConfirmedTrips, isLoadingAwaiting, isLoadingConfirmed]);


  const handleOpenTicket = (trip: Trip) => {
    setSelectedTrip(trip);
    setIsTicketDialogOpen(true);
  };

  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
    </div>
  );
  
  const getConfirmedTripActionLabel = (trip: Trip): string => {
    if (trip.status === 'Completed') {
        return 'تقييم الرحلة';
    }
    return 'متابعة الرحلة';
};

  if (isUserLoading) return <AppLayout>{renderSkeleton()}</AppLayout>;


  return (
    <AppLayout>
      <div className="bg-[#130609] p-2 md:p-8 rounded-lg space-y-8">
        <Card style={{ backgroundColor: '#EDC17C' }}>
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

        <Accordion type="single" collapsible className="w-full space-y-6" value={openAccordion} onValueChange={setOpenAccordion}>
          {hasAwaitingOffers && (
            <AccordionItem value="awaiting" className="border-none">
              <Card>
                <AccordionTrigger className="p-6 text-lg hover:no-underline">
                  <div className='flex items-center gap-2'><PackageOpen className="h-6 w-6 text-primary" /><CardTitle>عروض الناقلين</CardTitle></div>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent>
                    <CardDescription className="mb-4">
                      هنا تظهر العروض التي أرسلها الناقلون لطلبك. قارن بينها واختر الأنسب لك.
                    </CardDescription>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dummyOffers.map(offer => (
                          <Card key={offer.id} className="w-full shadow-md hover:shadow-primary/20 transition-shadow">
                              <CardContent className="p-4 grid gap-3">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <p className="font-bold text-lg">{offer.carrierName}</p>
                                          <div className="flex items-center text-sm text-muted-foreground">
                                              <Star className="w-4 h-4 ml-1 text-yellow-400 fill-yellow-400" />
                                              {offer.rating}
                                          </div>
                                      </div>
                                      <div className="text-left">
                                          <p className="font-bold text-xl text-primary">{offer.price} ريال</p>
                                          <p className="text-xs text-muted-foreground">العربون: {offer.downPayment} ريال</p>
                                      </div>
                                  </div>
                                  <div className="border-t border-border/60 my-2"></div>
                                  <div>
                                      <p className="text-sm"><span className="font-semibold">المركبة:</span> {offer.vehicle}</p>
                                      <p className="text-sm"><span className="font-semibold">موعد الانطلاق:</span> {new Date(offer.departureDate).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}</p>
                                  </div>
                                  <Button className="w-full mt-2">قبول الحجز</Button>
                              </CardContent>
                          </Card>
                        ))}
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          )}
          
          {isLoadingConfirmed ? renderSkeleton() : (
            hasConfirmedTrips && (
              <AccordionItem value="confirmed" className="border-none">
                <Card>
                  <AccordionTrigger className="p-6 text-lg hover:no-underline">
                    <div className='flex items-center gap-2'><CheckCircle className="h-6 w-6 text-green-500" /><CardTitle>رحلاتي المؤكدة</CardTitle></div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="space-y-6">
                      <CardDescription className="mb-4">تابع رحلاتك التي قمت بحجزها بالفعل وأي تحديثات عليها.</CardDescription>
                      
                      {confirmedTrips.map((trip) => (
                        <Card key={trip.id} className="bg-card/50 border-border/50">
                           <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-base font-bold">رحلة {trip.origin} إلى {trip.destination}</CardTitle>
                                    <Badge variant={statusVariantMap[trip.status] || 'outline'}>{statusMap[trip.status] || trip.status}</Badge>
                                </div>
                           </CardHeader>
                           <CardContent className="grid md:grid-cols-2 gap-y-4 md:gap-6 p-0 md:p-6">
                                {/* Left Column: E-Ticket */}
                                <div className="p-4 md:border md:rounded-lg bg-background/30 space-y-3">
                                    <h3 className="font-bold border-b pb-2 mb-3">التذكرة الإلكترونية</h3>
                                    <div className="space-y-3">
                                        <p><strong>الناقل:</strong> {trip.carrierName}</p>
                                        <p><strong>وقت الحجز:</strong> {new Date().toLocaleDateString('ar-SA')}</p>
                                        <p><strong>القيمة الإجمالية:</strong> 250 ريال</p>
                                        <p><strong>العربون:</strong> 25 ريال (غير مسترد)</p>
                                        <p><strong>المتبقي:</strong> 225 ريال (يدفع عند الانطلاق)</p>
                                        <p><strong>الركاب:</strong> فايز الحربي (بالغ)</p>
                                        <p><strong>تاريخ الانطلاق:</strong> {new Date(trip.departureDate).toLocaleString('ar-SA', { dateStyle: 'full', timeStyle: 'short' })}</p>
                                        <p><strong>نقطة الانطلاق:</strong> محطة النقل الجماعي، الرياض</p>
                                        <p><strong>الوصول:</strong> محطة العبدلي، عمّان</p>
                                        <p><strong>الحقائب:</strong> 2 حقيبة كبيرة</p>
                                        <div className="border-t my-2"></div>
                                        <p className="text-xs text-amber-500"><strong>تعليمات:</strong> التواجد في موقع الانطلاق قبل ساعة ونصف من وقت الانطلاق.</p>
                                    </div>
                                </div>

                                {/* Right Column: Control & Communication Hub */}
                                <div className="p-4 pt-0 md:p-0 md:border md:rounded-lg bg-background/30 space-y-4 flex flex-col">
                                     <h3 className="font-bold border-b pb-2 mb-3 p-4">مركز التحكم والتواصل</h3>

                                    {/* Critical Updates */}
                                    <div className="p-3 mx-4 rounded-lg bg-yellow-900/50 border border-yellow-700">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="h-5 w-5 text-yellow-400" />
                                            <h4 className="font-bold text-yellow-300">تحديث على الموعد</h4>
                                        </div>
                                        <p className="text-sm mt-2">لا توجد تحديثات جديدة على موعد الرحلة.</p>
                                    </div>
                                    
                                     {/* Chat Section */}
                                    <div className="flex-grow flex flex-col space-y-2 h-96 px-4">
                                        <div className="flex-grow bg-muted/30 rounded-lg p-2 md:p-4 space-y-4 overflow-y-auto flex flex-col">
                                            {/* Incoming Message */}
                                            <div className="flex items-end gap-2 max-w-md">
                                                <div className="bg-gray-700 text-white p-3 rounded-lg rounded-bl-none">
                                                    <p className="text-sm">أهلاً بك، تم تأكيد حجزك. هل لديك أي استفسارات؟</p>
                                                    <p className="text-xs text-gray-400 mt-1 text-left">10:00 صباحًا</p>
                                                </div>
                                            </div>
                                            {/* Outgoing Message */}
                                            <div className="flex items-end gap-2 justify-end">
                                                <div className="bg-accent text-accent-foreground p-3 rounded-lg rounded-br-none">
                                                    <p className="text-sm">شكرًا لكم. كل شيء واضح حاليًا.</p>
                                                    <p className="text-xs text-accent-foreground/80 mt-1 text-left">10:01 صباحًا</p>
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

                                    <div className="border-t pt-4 space-y-2 px-4 pb-4">
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

      {/* E-Ticket Dialog (Legacy, can be removed if not used) */}
      <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>تذكرة إلكترونية - {selectedTrip?.id.substring(0, 7).toUpperCase()}</DialogTitle>
            <DialogDescription>تفاصيل رحلتك المؤكدة.</DialogDescription>
          </DialogHeader>
          {selectedTrip && (
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <p><strong>الحالة:</strong> <Badge variant={statusVariantMap[selectedTrip.status] || 'outline'}>{statusMap[selectedTrip.status] || selectedTrip.status}</Badge></p>
                    <p><strong>الناقل:</strong> {selectedTrip.carrierName}</p>
                    <p><strong>رقم التواصل:</strong> {selectedTrip.carrierPhoneNumber}</p>
                    <p><strong>المركبة:</strong> {selectedTrip.vehicleType} - موديل {selectedTrip.vehicleModelYear}</p>
                </div>
                {selectedTrip.status === 'Completed' && (
                    <div className="border-t pt-4 mt-2">
                         <Label htmlFor="rating-notes">تقييم الرحلة</Label>
                         <Textarea id="rating-notes" placeholder="أخبرنا عن تجربتك مع الناقل..." className="mt-2" />
                         <Button className="mt-2 w-full">إرسال التقييم</Button>
                    </div>
                )}
                 {selectedTrip.status === 'Planned' && (
                    <Button variant="destructive" className="w-full mt-4">إلغاء الحجز</Button>
                )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTicketDialogOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );