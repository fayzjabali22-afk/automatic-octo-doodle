'use client';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Search, ShipWheel, CalendarIcon, UserSearch, Globe, Star, ArrowRightLeft } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import type { Trip, CarrierProfile } from '@/lib/data';
import { ScheduledTripCard } from '@/components/scheduled-trip-card';
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useCollection, useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { AuthRedirectDialog } from '@/components/auth-redirect-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { BookingDialog, type PassengerDetails } from '@/components/booking-dialog';
import { logEvent } from '@/lib/analytics';


// Mock data for countries and cities
const countries: { [key: string]: { name: string; cities: string[] } } = {
  syria: { name: 'سوريا', cities: ['damascus', 'aleppo', 'homs'] },
  jordan: { name: 'الأردن', cities: ['amman', 'irbid', 'zarqa'] },
  ksa: { name: 'السعودية', cities: ['riyadh', 'jeddah', 'dammam'] },
  egypt: { name: 'مصر', cities: ['cairo', 'alexandria', 'giza'] },
};

const cities: { [key: string]: string } = {
    damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص',
    amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
    riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام',
    cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة',
    dubai: 'دبي', kuwait: 'الكويت'
};

type GroupedTrips = { [date: string]: Trip[] };

export default function DashboardPage() {
  const [date, setDate] = useState<Date>();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isAuthRedirectOpen, setIsAuthRedirectOpen] = useState(false);
  const { toast } = useToast();

  // Booking Dialog State
  const [selectedTripForBooking, setSelectedTripForBooking] = useState<Trip | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);

  const scheduledTripsQuery = useMemo(() => {
    if (!firestore) return null;
    // DEV MODE: Bypassing auth check for now.
    // This query is intentionally left open for demonstration.
    // In a real app, you'd likely filter by date, e.g., where('departureDate', '>=', new Date())
    return query(
      collection(firestore, 'trips'),
      where('status', '==', 'Planned')
    );
  }, [firestore]);
  const { data: allTrips, isLoading } = useCollection<Trip>(scheduledTripsQuery);

  const [searchOriginCountry, setSearchOriginCountry] = useState('');
  const [searchOriginCity, setSearchOriginCity] = useState('');
  const [searchDestinationCountry, setSearchDestinationCountry] = useState('');
  const [searchDestinationCity, setSearchDestinationCity] = useState('');
  const [searchSeats, setSearchSeats] = useState(1);
  const [carrierSearchInput, setCarrierSearchInput] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState<CarrierProfile | null>(null);
  const [searchVehicleType, setSearchVehicleType] = useState('all');
  const [searchMode, setSearchMode] = useState<'specific-carrier' | 'all-carriers'>('all-carriers');

  const [groupedAndFilteredTrips, setGroupedAndFilteredTrips] = useState<GroupedTrips>({});
  const [openAccordion, setOpenAccordion] = useState<string[]>([]);
  
  useEffect(() => {
    setSearchOriginCity('');
  }, [searchOriginCountry]);

  useEffect(() => {
    setSearchDestinationCity('');
  }, [searchDestinationCountry]);

  const handleCarrierSearch = async () => {
    if (!carrierSearchInput) {
        toast({ title: 'الرجاء إدخال اسم الناقل', variant: 'destructive' });
        return;
    }
    if (!firestore) {
        toast({ title: 'خطأ', description: 'خدمة قاعدة البيانات غير متوفرة', variant: 'destructive' });
        return;
    }

    let foundCarrier: CarrierProfile | null = null;

    const carriersRef = collection(firestore, 'carriers');
    const q = query(carriersRef, where("name", "==", carrierSearchInput));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
        const carrierDoc = querySnapshot.docs[0];
        foundCarrier = { id: carrierDoc.id, ...carrierDoc.data() } as CarrierProfile;
    }

    if (foundCarrier) {
        setSelectedCarrier(foundCarrier);
        setCarrierSearchInput(foundCarrier.name); // Normalize input field
        toast({ title: 'تم العثور على الناقل', description: `يتم الآن عرض رحلات: ${foundCarrier.name}` });
    } else {
        setSelectedCarrier(null);
        toast({ title: 'الناقل غير موجود', description: 'لم يتم العثور على ناقل بهذا الاسم.', variant: 'destructive' });
    }
  };


  useEffect(() => {
    let baseTrips: Trip[] = allTrips || [];
    
    if (searchMode === 'specific-carrier') {
        if (selectedCarrier) {
            baseTrips = allTrips?.filter(trip => trip.carrierId === selectedCarrier.id) || [];
        } else {
            baseTrips = [];
        }
    } else {
        baseTrips = allTrips || [];
    }

    let filteredTrips = [...baseTrips];
    
    if (searchOriginCity) {
        filteredTrips = filteredTrips.filter(trip => trip.origin === searchOriginCity);
    }
    if (searchDestinationCity) {
        filteredTrips = filteredTrips.filter(trip => trip.destination === searchDestinationCity);
    }
    if (searchSeats > 0) {
        filteredTrips = filteredTrips.filter(trip => (trip.availableSeats || 0) >= searchSeats);
    }
    if (date) {
        filteredTrips = filteredTrips.filter(trip => new Date(trip.departureDate).toDateString() === date.toDateString());
    }
    if (searchMode === 'all-carriers' && searchVehicleType !== 'all') {
      filteredTrips = filteredTrips.filter(trip => trip.vehicleType?.toLowerCase().includes(searchVehicleType));
    }
    
    const grouped = filteredTrips.reduce((acc: GroupedTrips, trip) => {
        const tripDate = new Date(trip.departureDate).toISOString().split('T')[0];
        if (!acc[tripDate]) {
            acc[tripDate] = [];
        }
        acc[tripDate].push(trip);
        return acc;
    }, {});
    
    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const sortedGroupedTrips: GroupedTrips = {};
    sortedDates.forEach(date => {
        sortedGroupedTrips[date] = grouped[date];
    });

    setGroupedAndFilteredTrips(sortedGroupedTrips);
    
    if (sortedDates.length > 0) {
        setOpenAccordion([sortedDates[0]]);
    } else {
        setOpenAccordion([]);
    }

  }, [searchOriginCity, searchDestinationCity, searchSeats, date, allTrips, searchMode, selectedCarrier, searchVehicleType]);


    const handleBookNowClick = (trip: Trip) => {
        if (!user) {
            setIsAuthRedirectOpen(true);
            return;
        }
        setSelectedTripForBooking(trip);
        setIsBookingDialogOpen(true);
    };

    const handleConfirmBooking = (passengers: PassengerDetails[]) => {
        if (!firestore || !user || !selectedTripForBooking) return;
        
        const bookingsCollection = collection(firestore, 'bookings');
        const newBooking = {
            tripId: selectedTripForBooking.id,
            userId: user.uid,
            carrierId: selectedTripForBooking.carrierId!,
            seats: passengers.length,
            passengersDetails: passengers,
            status: 'Pending-Carrier-Confirmation',
            totalPrice: (selectedTripForBooking.price || 0) * passengers.length,
            createdAt: new Date().toISOString(),
        };

        addDocumentNonBlocking(bookingsCollection, newBooking);

        if (selectedTripForBooking.carrierId) {
            // ✅ Use root collection for notifications
            const notificationsCollection = collection(firestore, 'notifications');
            addDocumentNonBlocking(notificationsCollection, {
                userId: selectedTripForBooking.carrierId,
                title: 'طلب حجز جديد',
                message: `لديك طلب حجز جديد لرحلة ${cities[selectedTripForBooking.origin]} - ${cities[selectedTripForBooking.destination]}.`,
                type: 'new_booking_request',
                isRead: false,
                createdAt: new Date().toISOString(),
                link: `/carrier/bookings` // Assuming a future carrier dashboard
            });
        }
        
        toast({
            title: 'تم إرسال طلب الحجز بنجاح!',
            description: 'سيتم إعلامك عند تأكيد الناقل للحجز. يمكنك المتابعة من صفحة إدارة الحجز.',
        });
        
        setIsBookingDialogOpen(false);
        setSelectedTripForBooking(null);
        router.push('/history');
    };


  const handleMainActionButtonClick = () => {
    // Shared validation for all modes
     if (!user) {
        setIsAuthRedirectOpen(true);
        return;
      }
       if (!searchOriginCity || !searchDestinationCity) {
          toast({
              title: "بيانات غير مكتملة",
              description: "الرجاء اختيار مدينة الانطلاق والوصول.",
              variant: "destructive",
          });
          return;
      }

      logEvent('TRIP_SEARCH', {
        userId: user.uid,
        origin: searchOriginCity,
        destination: searchDestinationCity,
        date: date ? date.toISOString().split('T')[0] : null,
        seats: searchSeats,
        searchMode: searchMode,
        carrierId: searchMode === 'specific-carrier' ? selectedCarrier?.id : null,
      });

    // Mode-specific logic
    if (searchMode === 'all-carriers') {
      handleGeneralBookingRequestSubmit();
    } else { // 'specific-carrier' mode
      if (!selectedCarrier) {
        toast({
          title: "الرجاء تحديد ناقل أولاً",
          description: "ابحث عن ناقل لتتمكن من إرسال طلب له.",
          variant: "destructive",
        });
        return;
      }
      handleSpecificCarrierRequestSubmit();
    }
  };
  
  const handleGeneralBookingRequestSubmit = async () => {
      if (!firestore || !user) return;
      const tripsCollection = collection(firestore, 'trips');
      try {
        await addDoc(tripsCollection, {
            userId: user.uid,
            origin: searchOriginCity,
            destination: searchDestinationCity,
            passengers: searchSeats,
            status: 'Awaiting-Offers',
            departureDate: date ? date.toISOString() : new Date().toISOString(),
        });
        toast({
            title: "تم إرسال طلبك بنجاح!",
            description: "سيتم توجيهك الآن لصفحة حجوزاتك لمتابعة طلبك.",
        });
        router.push('/history');
      } catch (e) {
          toast({ title: 'Error', description: 'Could not send request.', variant: 'destructive'});
      }
  };
  
  const handleSpecificCarrierRequestSubmit = async () => {
    if (!firestore || !user || !selectedCarrier) return;

    try {
        // 1. Create a new trip document directed at the specific carrier
        const tripsCollection = collection(firestore, 'trips');
        const newTripRef = await addDoc(tripsCollection, {
            userId: user.uid,
            carrierId: selectedCarrier.id, // Direct the request to this carrier
            origin: searchOriginCity,
            destination: searchDestinationCity,
            passengers: searchSeats,
            status: 'Awaiting-Offers',
            departureDate: date ? date.toISOString() : new Date().toISOString(),
        });

        // 2. Send a notification ONLY to that carrier
        // ✅ Use root collection for notifications
        const notificationsCollection = collection(firestore, 'notifications');
        await addDoc(notificationsCollection, {
            userId: selectedCarrier.id,
            title: 'لديك طلب رحلة خاص',
            message: `المستخدم ${user.displayName || user.email} أرسل لك طلبًا مباشرًا لرحلة من ${cities[searchOriginCity]} إلى ${cities[searchDestinationCity]}.`,
            type: 'new_booking_request', // Can be a more specific type later
            isRead: false,
            createdAt: new Date().toISOString(),
            link: `/history#${newTripRef.id}` // Link to the specific offer
        });

        toast({
            title: `تم إرسال طلبك إلى ${selectedCarrier.name}`,
            description: "سيتم توجيهك الآن لصفحة حجوزاتك لمتابعة العرض.",
        });
        router.push('/history');

    } catch (e) {
        toast({ title: 'خطأ', description: 'لم نتمكن من إرسال الطلب.', variant: 'destructive'});
    }
  };
  

  const showFilterMessage = searchMode === 'specific-carrier' && selectedCarrier && Object.keys(groupedAndFilteredTrips).length > 0;
  const showAllCarriersMessage = searchMode === 'all-carriers' && Object.keys(groupedAndFilteredTrips).length > 0;
  const showNoResultsMessage = Object.keys(groupedAndFilteredTrips).length === 0;

  const sortedTripDates = Object.keys(groupedAndFilteredTrips);


  return (
    <AppLayout>
      <div className="container mx-auto p-0 md:p-4 rounded-lg">

        <div className="flex flex-col lg:flex-row gap-8 p-2 lg:p-4">

          <div className="flex-1 min-w-0">
            <header className="mb-8 text-center lg:text-right">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">أهلاً بك، أين وجهتك التالية؟</h1>
              <p className="text-muted-foreground mt-2">ابحث عن رحلتك القادمة أو استعرض الرحلات المجدولة بسهولة.</p>
            </header>

            <Card className="w-full shadow-lg rounded-lg mb-8 border-border/60 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-1 gap-4">

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                     <Button variant={searchMode === 'specific-carrier' ? 'default' : 'outline'} onClick={() => setSearchMode('specific-carrier')} className="w-full text-xs sm:text-sm">
                        <UserSearch className="ml-2 h-4 w-4" /> ناقل محدد
                     </Button>
                     <Button variant={searchMode === 'all-carriers' ? 'default' : 'outline'} onClick={() => setSearchMode('all-carriers')} className="w-full text-xs sm:text-sm">
                        <Globe className="ml-2 h-4 w-4" /> كل الناقلين
                     </Button>
                  </div>
                  
                  <div className="border-t border-border/60 my-2"></div>

                  {searchMode === 'specific-carrier' && (
                    <div className="grid gap-2">
                      <Label htmlFor="carrier-search">البحث عن ناقل (بالاسم)</Label>
                      <div className="flex gap-2">
                        <Input 
                            id="carrier-search" 
                            placeholder="مثال: شركة النقل السريع" 
                            value={carrierSearchInput} 
                            onChange={(e) => {
                                setCarrierSearchInput(e.target.value);
                                if (selectedCarrier) {
                                    setSelectedCarrier(null); 
                                }
                            }}
                            className={cn(selectedCarrier ? 'bg-green-100/10 border-green-500' : '')}
                        />
                        <Button onClick={handleCarrierSearch} variant="secondary">
                            <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {searchMode === 'all-carriers' && (
                    <div className='grid gap-4'>
                      <div className="flex items-center justify-center gap-x-6 gap-y-2 flex-wrap">
                        <Label className="font-semibold">نوع وسيلة النقل:</Label>
                        <RadioGroup
                          defaultValue="all"
                          className="flex items-center gap-4"
                          onValueChange={setSearchVehicleType}
                        >
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="all" id="r-all" />
                            <Label htmlFor="r-all" className="mr-2">المتوفر</Label>
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="small" id="r-small" />
                            <Label htmlFor="r-small" className="mr-2">مركبة صغيرة</Label>
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="bus" id="r-bus" />
                            <Label htmlFor="r-bus" className="mr-2">حافلة</Label>
                          </div>
                        </RadioGroup>
                      </div>
                       <div className="border-t border-blue-500/30 my-2"></div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="origin-country">دولة الانطلاق</Label>
                      <Select onValueChange={setSearchOriginCountry} value={searchOriginCountry}>
                        <SelectTrigger id="origin-country"><SelectValue placeholder="اختر دولة الانطلاق" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(countries).map(([key, {name}]) => (
                            <SelectItem key={key} value={key}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="origin-city">مدينة الانطلاق</Label>
                      <Select onValueChange={setSearchOriginCity} value={searchOriginCity} disabled={!searchOriginCountry}>
                        <SelectTrigger id="origin-city"><SelectValue placeholder="اختر مدينة الانطلاق" /></SelectTrigger>
                        <SelectContent>
                          {searchOriginCountry && countries[searchOriginCountry as keyof typeof countries]?.cities.map(cityKey => (
                            <SelectItem key={cityKey} value={cityKey}>{cities[cityKey]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="grid gap-2">
                        <Label htmlFor="destination-country">دولة الوصول</Label>
                        <Select onValueChange={setSearchDestinationCountry} value={searchDestinationCountry}>
                          <SelectTrigger id="destination-country"><SelectValue placeholder="اختر دولة الوصول" /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(countries)
                                .filter(([key]) => key !== searchOriginCountry)
                                .map(([key, {name}]) => (
                                  <SelectItem key={key} value={key}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="destination-city">مدينة الوصول</Label>
                        <Select onValueChange={setSearchDestinationCity} value={searchDestinationCity} disabled={!searchDestinationCountry}>
                          <SelectTrigger id="destination-city"><SelectValue placeholder="اختر مدينة الوصول" /></SelectTrigger>
                          <SelectContent>
                            {searchDestinationCountry && countries[searchDestinationCountry as keyof typeof countries]?.cities.map(cityKey => (
                              <SelectItem key={cityKey} value={cityKey}>{cities[cityKey]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="travel-date">تاريخ السفر</Label>
                       <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal bg-background/50",
                              !date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="ml-2 h-4 w-4 text-accent" />
                            {date ? format(date, "PPP") : <span>اختر تاريخاً</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="seats">عدد المقاعد</Label>
                      <Select onValueChange={(val) => setSearchSeats(parseInt(val))} value={String(searchSeats)}>
                        <SelectTrigger id="seats">
                          <SelectValue placeholder="1" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 9 }, (_, i) => i + 1).map(num => (
                            <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {showFilterMessage && (
                    <div className="mt-2 text-center text-sm text-accent bg-accent/10 p-2 rounded-md border border-accent/30">
                        {`هناك رحلات مجدولة لـ ${selectedCarrier?.name} معروضة أدناه. يمكنك الآن تصفية النتائج أو تكملة إدخال بياناتك ثم إرسال طلب جديد.`}
                    </div>
                  )}

                  {showAllCarriersMessage && (
                     <div className="mt-2 text-center text-sm text-accent bg-accent/10 p-2 rounded-md border border-accent/30">
                        هناك رحلات مجدولة معروضة أدناه. يمكنك الآن تصفية النتائج أو تكملة إدخال بياناتك ثم إرسال طلب جديد.
                    </div>
                  )}


                  <Button onClick={handleMainActionButtonClick} size="lg" className="w-full justify-self-stretch sm:justify-self-end mt-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                    {searchMode === 'all-carriers' ? 'البحث عن مناقص ناقلين' : 'ارسال طلب للناقل المحدد'}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-4">الرحلات المجدولة القادمة</h2>
              
               {isLoading ? (
                    <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                       <p>جاري تحميل الرحلات...</p>
                    </div>
                ) : showNoResultsMessage ? (
                    <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                        <ShipWheel className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                        <p className="text-lg font-bold">لا توجد رحلات تطابق بحثك</p>
                        <p className="text-sm mt-2">
                           {searchMode === 'all-carriers' ? 'جرب تغيير معايير البحث أو أرسل طلباً عاماً.' : `لا توجد رحلات مجدولة لهذا الناقل. يمكنك إرسال طلب مباشر له.`}
                        </p>
                    </div>
                ) : (
                    <Accordion type="multiple" value={openAccordion} onValueChange={setOpenAccordion} className="space-y-4">
                        {sortedTripDates.map(tripDate => (
                            <AccordionItem key={tripDate} value={tripDate} className="border-none">
                                <Card>
                                <AccordionTrigger className="p-4 text-md hover:no-underline font-bold">
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon className="h-5 w-5 text-accent"/>
                                        <span>{format(new Date(tripDate), "EEEE, d MMMM yyyy")}</span>
                                        <Badge variant="outline">{groupedAndFilteredTrips[tripDate].length} رحلات</Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 pt-0">
                                    {groupedAndFilteredTrips[tripDate].map(trip => (
                                        <ScheduledTripCard key={trip.id} trip={trip} onBookNow={handleBookNowClick} />
                                    ))}
                                    </div>
                                </AccordionContent>
                                </Card>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </div>
          </div>
        </div>
      </div>
      <AuthRedirectDialog 
        isOpen={isAuthRedirectOpen}
        onOpenChange={setIsAuthRedirectOpen}
      />
      {selectedTripForBooking && (
        <BookingDialog
            isOpen={isBookingDialogOpen}
            onOpenChange={setIsBookingDialogOpen}
            trip={selectedTripForBooking}
            seatCount={searchSeats}
            onConfirm={handleConfirmBooking}
        />
      )}
    </AppLayout>
  );
}
