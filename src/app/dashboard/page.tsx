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
import { Users, Search, ShipWheel, CalendarIcon, UserSearch, Globe, Star, ArrowRightLeft, Send } from 'lucide-react';
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
import { RequestDialog } from '@/components/requests/request-dialog';
import { logEvent } from '@/lib/analytics';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';


// --- MOCK DATA ---
const mockScheduledTrips: Trip[] = [
    {
        id: 'mock_scheduled_1',
        userId: 'carrier_user_1',
        carrierId: 'carrier_user_1',
        carrierName: 'النقل السريع',
        origin: 'amman',
        destination: 'riyadh',
        departureDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Planned',
        price: 80,
        currency: 'JOD',
        availableSeats: 3,
        depositPercentage: 15,
        vehicleType: 'GMC Yukon 2023',
        vehicleImageUrls: ['https://i.postimg.cc/kXqJ80b4/gmc-yukon.jpg']
    },
    {
        id: 'mock_scheduled_2',
        userId: 'carrier_user_2',
        carrierId: 'carrier_user_2',
        carrierName: 'راحة الطريق',
        origin: 'damascus',
        destination: 'amman',
        departureDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Planned',
        price: 55,
        currency: 'JOD',
        availableSeats: 4,
        depositPercentage: 10,
        vehicleType: 'Hyundai Staria 2024',
        vehicleImageUrls: ['https://i.postimg.cc/tJ095xJc/hyundai-staria.jpg']
    },
    {
        id: 'mock_scheduled_3',
        userId: 'carrier_user_1', // Belongs to "النقل السريع"
        carrierId: 'carrier_user_1',
        carrierName: 'النقل السريع',
        origin: 'amman',
        destination: 'jeddah', // Different destination
        departureDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Planned',
        price: 120,
        currency: 'JOD',
        availableSeats: 2,
        depositPercentage: 20,
        vehicleType: 'GMC Yukon 2023',
        vehicleImageUrls: ['https://i.postimg.cc/kXqJ80b4/gmc-yukon.jpg']
    },
];

const mockCarriers: CarrierProfile[] = [
    { id: "carrier_user_1", name: "النقل السريع", contactEmail: "a@b.c" },
    { id: "carrier_user_2", name: "راحة الطريق", contactEmail: "d@e.f" },
];

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

// ** NEW TYPE FOR SMART LOGIC **
type TripDisplayResult = {
  filtered: GroupedTrips;
  alternatives: GroupedTrips;
  hasFilteredResults: boolean;
  hasAlternativeResults: boolean;
  showNoResultsMessage: boolean;
};


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
  // Request Dialog State
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);

  // USE MOCK DATA INSTEAD OF FIREBASE
  const allTrips = mockScheduledTrips;
  const isLoading = false;


  const [searchOriginCountry, setSearchOriginCountry] = useState('');
  const [searchOriginCity, setSearchOriginCity] = useState('');
  const [searchDestinationCountry, setSearchDestinationCountry] = useState('');
  const [searchDestinationCity, setSearchDestinationCity] = useState('');
  const [searchSeats, setSearchSeats] = useState(1);
  const [selectedCarrier, setSelectedCarrier] = useState<CarrierProfile | null>(null);
  const [searchVehicleType, setSearchVehicleType] = useState('all');
  const [searchMode, setSearchMode] = useState<'all-carriers' | 'specific-carrier'>('all-carriers');

  const [openAccordion, setOpenAccordion] = useState<string[]>([]);
  
  useEffect(() => {
    setSearchOriginCity('');
  }, [searchOriginCountry]);

  useEffect(() => {
    setSearchDestinationCity('');
  }, [searchDestinationCountry]);


  const tripDisplayResult = useMemo((): TripDisplayResult => {
    const groupTrips = (trips: Trip[]): GroupedTrips => {
      const grouped = trips.reduce((acc: GroupedTrips, trip) => {
        const tripDate = new Date(trip.departureDate).toISOString().split('T')[0];
        if (!acc[tripDate]) acc[tripDate] = [];
        acc[tripDate].push(trip);
        return acc;
      }, {});
      
      const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      const sortedGroupedTrips: GroupedTrips = {};
      sortedDates.forEach(date => sortedGroupedTrips[date] = grouped[date]);
      return sortedGroupedTrips;
    };

    let baseTrips: Trip[] = allTrips || [];
    let isSearching = false;

    if (searchMode === 'specific-carrier') {
      if (!selectedCarrier) {
        return { filtered: {}, alternatives: {}, hasFilteredResults: false, hasAlternativeResults: false, showNoResultsMessage: false };
      }
      baseTrips = baseTrips.filter(trip => trip.carrierId === selectedCarrier.id);
      isSearching = true; // In this mode, we are always "searching" the carrier's schedule
    } else { // 'all-carriers' mode
      isSearching = !!(searchOriginCity || searchDestinationCity || date);
      if (!isSearching) {
         return { filtered: {}, alternatives: {}, hasFilteredResults: false, hasAlternativeResults: false, showNoResultsMessage: false };
      }
    }

    let filteredTrips = [...baseTrips];
    if (searchOriginCity) filteredTrips = filteredTrips.filter(trip => trip.origin === searchOriginCity);
    if (searchDestinationCity) filteredTrips = filteredTrips.filter(trip => trip.destination === searchDestinationCity);
    if (searchSeats > 0) filteredTrips = filteredTrips.filter(trip => (trip.availableSeats || 0) >= searchSeats);
    if (date) filteredTrips = filteredTrips.filter(trip => new Date(trip.departureDate).toDateString() === date.toDateString());
    if (searchMode === 'all-carriers' && searchVehicleType !== 'all') {
      filteredTrips = filteredTrips.filter(trip => (trip.vehicleCategory || 'small') === searchVehicleType);
    }
    
    const groupedFiltered = groupTrips(filteredTrips);
    const hasFilteredResults = filteredTrips.length > 0;

    let alternativeTrips: Trip[] = [];
    // ** OPPORTUNITY ALGORITHM: Show alternatives if a filter is applied and it returns no results **
    if (isSearching && !hasFilteredResults) {
      alternativeTrips = baseTrips.filter(trip => !filteredTrips.includes(trip));
    }
    
    const groupedAlternatives = groupTrips(alternativeTrips);
    const hasAlternativeResults = alternativeTrips.length > 0;

    const firstFilteredDate = Object.keys(groupedFiltered)[0];
    const firstAlternativeDate = Object.keys(groupedAlternatives)[0];
    if (firstFilteredDate) {
      setOpenAccordion([firstFilteredDate]);
    } else if (firstAlternativeDate) {
      setOpenAccordion([firstAlternativeDate]);
    } else {
      setOpenAccordion([]);
    }

    return {
      filtered: groupedFiltered,
      alternatives: groupedAlternatives,
      hasFilteredResults,
      hasAlternativeResults,
      showNoResultsMessage: isSearching && !hasFilteredResults && !hasAlternativeResults,
    };
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
        
        toast({
            title: 'محاكاة: تم إرسال طلب الحجز بنجاح!',
            description: 'سيتم إعلامك عند تأكيد الناقل للحجز. يمكنك المتابعة من صفحة إدارة الحجز.',
        });
        
        setIsBookingDialogOpen(false);
        setSelectedTripForBooking(null);
        router.push('/history');
    };
    
    const handleRequestAction = () => {
        if (!user) {
            setIsAuthRedirectOpen(true);
            return;
        }
        setIsRequestDialogOpen(true);
    }
    
    const handleRequestSent = () => {
        toast({
            title: "تم إرسال طلبك بنجاح!",
            description: "سيتم توجيهك الآن لصفحة حجوزاتك لمتابعة العروض.",
        });
        router.push('/history');
    }

  const isDevUser = user?.email === 'dev@safar.com';

  const renderTripGroup = (groupedTrips: GroupedTrips, isAlternative = false) => {
    return (
        <div>
            {isAlternative && <h3 className="text-xl font-bold mb-4 border-t pt-6">رحلات أخرى متاحة</h3>}
            <Accordion type="multiple" value={openAccordion} onValueChange={setOpenAccordion} className="space-y-4">
            {Object.keys(groupedTrips).map(tripDate => (
            <AccordionItem key={tripDate} value={tripDate} className="border-none">
                <Card>
                <AccordionTrigger className="p-4 text-md hover:no-underline font-bold">
                    <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-accent"/>
                    <span>{format(new Date(tripDate), "EEEE, d MMMM yyyy")}</span>
                    <Badge variant="outline">{groupedTrips[tripDate].length} رحلات</Badge>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 pt-0">
                    {groupedTrips[tripDate].map(trip => (
                        <ScheduledTripCard key={trip.id} trip={trip} onBookNow={handleBookNowClick} />
                    ))}
                    </div>
                </AccordionContent>
                </Card>
            </AccordionItem>
            ))}
        </Accordion>
      </div>
    )
  };


  return (
    <AppLayout>
      <div className="container mx-auto p-0 md:p-4 rounded-lg">
        {isDevUser && (
          <Card className="mb-4 border-accent">
            <CardHeader>
              <CardTitle className="text-accent text-base">Developer Quick Switch</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/carrier">
                  <ArrowRightLeft className="ml-2 h-4 w-4" />
                  Switch to Carrier Interface
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
        <div className="flex flex-col lg:flex-row gap-8 p-2 lg:p-4">

          <div className="flex-1 min-w-0">
            <header className="mb-8 text-center lg:text-right">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">أهلاً بك، أين وجهتك التالية؟</h1>
              <p className="text-muted-foreground mt-2">ابحث عن رحلتك القادمة أو استعرض الرحلات المجدولة بسهولة.</p>
            </header>

            <Card className="w-full shadow-lg rounded-lg mb-8 border-accent bg-card/80 backdrop-blur-sm">
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
                      <Label htmlFor="carrier-select">اختر ناقلاً لعرض جدول رحلاته</Label>
                       <Select onValueChange={(carrierId) => {
                            const carrier = mockCarriers.find(c => c.id === carrierId);
                            setSelectedCarrier(carrier || null);
                       }}>
                        <SelectTrigger id="carrier-select">
                            <SelectValue placeholder="اختر ناقلاً..." />
                        </SelectTrigger>
                        <SelectContent>
                          {mockCarriers.map(carrier => (
                            <SelectItem key={carrier.id} value={carrier.id}>{carrier.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <RadioGroupItem value="all" id="r-all" />
                            <Label htmlFor="r-all" className="mr-2">المتوفر</Label>
                          </div>
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <RadioGroupItem value="small" id="r-small" />
                            <Label htmlFor="r-small" className="mr-2">مركبة صغيرة</Label>
                          </div>
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <RadioGroupItem value="bus" id="r-bus" />
                            <Label htmlFor="r-bus" className="mr-2">حافلة</Label>
                          </div>
                        </RadioGroup>
                      </div>
                       <div className="border-t border-blue-500/30 my-2"></div>
                    </div>
                  )}
                
                  <h3 className="text-sm font-semibold text-muted-foreground pt-2">لتضييق النتائج (اختياري)</h3>
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
                              <SelectItem key={key} value={cityKey}>{cities[cityKey]}</SelectItem>
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
                </div>
              </CardContent>
            </Card>
            
            <div className="mt-12">
               {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_,i) => <Skeleton key={i} className="h-48 w-full" />)}
                    </div>
                ) : tripDisplayResult.showNoResultsMessage ? (
                    <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg bg-background/50">
                        <ShipWheel className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                        <p className="text-lg font-bold">لا توجد رحلات تطابق بحثك</p>
                        <p className="text-sm mt-2 mb-6">
                           هل ترغب بتحويل بحثك إلى طلب يراه الناقلون؟
                        </p>
                        <Button onClick={handleRequestAction}>
                            <Send className="ml-2 h-4 w-4" />
                            {searchMode === 'all-carriers' ? 'إرسال الطلب إلى السوق العام' : `إرسال طلب مباشر إلى ${selectedCarrier?.name || 'الناقل'}`}
                        </Button>
                    </div>
                ) : (
                  <div className="space-y-8">
                      {tripDisplayResult.hasFilteredResults && (
                        <div>
                          <h2 className="text-2xl font-bold mb-4">الرحلات المطابقة لبحثك</h2>
                          {renderTripGroup(tripDisplayResult.filtered)}
                        </div>
                      )}
                      
                       {tripDisplayResult.hasAlternativeResults && (
                          renderTripGroup(tripDisplayResult.alternatives, true)
                       )}
                      
                      {searchMode === 'specific-carrier' && selectedCarrier && !tripDisplayResult.hasFilteredResults && !tripDisplayResult.hasAlternativeResults && (
                          <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg bg-background/50">
                            <ShipWheel className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p className="text-lg font-bold">لا توجد رحلات مجدولة لهذا الناقل حالياً.</p>
                          </div>
                      )}
                  </div>
                )}
                 {searchMode === 'specific-carrier' && selectedCarrier && (
                    <div className="mt-8 text-center">
                        <Button onClick={handleRequestAction} variant="secondary">
                            <Send className="ml-2 h-4 w-4" />
                            لم تجد ما تبحث عنه؟ أرسل طلباً خاصاً إلى {selectedCarrier.name}
                        </Button>
                    </div>
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
      <RequestDialog
        isOpen={isRequestDialogOpen}
        onOpenChange={setIsRequestDialogOpen}
        searchParams={{
            origin: searchOriginCity,
            destination: searchDestinationCity,
            departureDate: date,
            passengers: searchSeats,
            requestType: searchMode === 'specific-carrier' ? 'Direct' : 'General',
            targetCarrierId: selectedCarrier?.id,
        }}
        onSuccess={handleRequestSent}
      />
    </AppLayout>
  );
}
