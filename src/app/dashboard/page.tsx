
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
import { Users, Search, ShipWheel, CalendarIcon, UserSearch, Globe, Star } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import type { Trip } from '@/lib/data';
import { tripHistory } from '@/lib/data'; // Import mock data
import { TripCard } from '@/components/trip-card';
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
import { useCollection, useFirestore, useUser, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { LegalDisclaimerDialog } from '@/components/legal-disclaimer-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

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
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const { toast } = useToast();

  const allTrips = tripHistory;
  const isLoading = false; 

  const [searchOriginCountry, setSearchOriginCountry] = useState('');
  const [searchOriginCity, setSearchOriginCity] = useState('');
  const [searchDestinationCountry, setSearchDestinationCountry] = useState('');
  const [searchDestinationCity, setSearchDestinationCity] = useState('');
  const [searchSeats, setSearchSeats] = useState(1);
  const [carrierSearchInput, setCarrierSearchInput] = useState('');
  const [selectedCarrierName, setSelectedCarrierName] = useState<string | null>(null);
  const [searchVehicleType, setSearchVehicleType] = useState('all');
  const [searchMode, setSearchMode] = useState<'specific-carrier' | 'all-carriers'>('all-carriers');

  const [groupedAndFilteredTrips, setGroupedAndFilteredTrips] = useState<GroupedTrips>({});
  const [openAccordion, setOpenAccordion] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    setSearchOriginCity('');
  }, [searchOriginCountry]);

  useEffect(() => {
    setSearchDestinationCity('');
  }, [searchDestinationCountry]);

  const handleCarrierSearch = () => {
    if (!carrierSearchInput) {
        toast({ title: 'الرجاء إدخال اسم الناقل أو رقم هاتفه', variant: 'destructive' });
        return;
    }
    
    const normalizePhoneNumber = (phone: string) => phone.replace(/[\s+()-]/g, '');
    const searchInputNormalized = normalizePhoneNumber(carrierSearchInput);

    const foundTrip = allTrips.find(trip => {
        const nameMatch = trip.carrierName.toLowerCase().includes(carrierSearchInput.toLowerCase());
        const phoneMatch = trip.carrierPhoneNumber && normalizePhoneNumber(trip.carrierPhoneNumber).includes(searchInputNormalized);
        return nameMatch || phoneMatch;
    });

    if (foundTrip) {
        setSelectedCarrierName(foundTrip.carrierName);
        setCarrierSearchInput(foundTrip.carrierName); 
        toast({ title: 'تم العثور على الناقل', description: `يتم الآن عرض رحلات: ${foundTrip.carrierName}` });
    } else {
        setSelectedCarrierName(null);
        toast({ title: 'الناقل غير موجود', description: 'لم يتم العثور على ناقل بهذا الاسم أو الرقم.', variant: 'destructive' });
    }
  };


  useEffect(() => {
    let baseTrips: Trip[] = [];
    let shouldShowTrips = false;

    // 1. Determine the base set of trips based on the search mode
    if (searchMode === 'specific-carrier') {
        if (selectedCarrierName) {
            baseTrips = allTrips.filter(trip => trip.carrierName === selectedCarrierName);
            shouldShowTrips = true; 
        }
    } else { // 'all-carriers' mode
        baseTrips = [...allTrips];
        shouldShowTrips = true; 
    }

    // 2. Apply filters if trips should be shown
    let filteredTrips = shouldShowTrips ? [...baseTrips] : [];
    
    if (shouldShowTrips) {
        // Accordion filters: destination and seats
        if (searchDestinationCity) {
            filteredTrips = filteredTrips.filter(trip => trip.destination === searchDestinationCity);
        }
        if (searchSeats > 0) {
            filteredTrips = filteredTrips.filter(trip => trip.availableSeats >= searchSeats);
        }
        
        // General filters 
        if (searchOriginCity) {
            filteredTrips = filteredTrips.filter(trip => trip.origin === searchOriginCity);
        }
        if (date) {
            filteredTrips = filteredTrips.filter(trip => new Date(trip.departureDate).toDateString() === date.toDateString());
        }
        if (searchMode === 'all-carriers' && searchVehicleType !== 'all') {
          filteredTrips = filteredTrips.filter(trip => trip.vehicleCategory === searchVehicleType);
        }
    }
    
    // Do not show any trips if the main filter condition is not met
    const primaryFilterMet = searchMode === 'all-carriers' 
      || (searchMode === 'specific-carrier' && !!selectedCarrierName);

    if (!primaryFilterMet) {
      filteredTrips = [];
    }
    
    // 3. Group the final filtered trips by date
    const grouped = filteredTrips.reduce((acc: GroupedTrips, trip) => {
        const tripDate = new Date(trip.departureDate).toISOString().split('T')[0]; // YYYY-MM-DD
        if (!acc[tripDate]) {
            acc[tripDate] = [];
        }
        acc[tripDate].push(trip);
        return acc;
    }, {});
    
    // 4. Sort dates and set state
    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const sortedGroupedTrips: GroupedTrips = {};
    sortedDates.forEach(date => {
        sortedGroupedTrips[date] = grouped[date];
    });

    setGroupedAndFilteredTrips(sortedGroupedTrips);
    
    // 5. Determine which accordion item should be open
    if (sortedDates.length > 0) {
        setOpenAccordion(sortedDates[0]); // Open the first date by default
    } else {
        setOpenAccordion(undefined);
    }

  }, [searchOriginCity, searchDestinationCity, searchSeats, date, allTrips, searchMode, selectedCarrierName, searchVehicleType]);


  const handleMainActionButtonClick = () => {
    if (searchMode === 'all-carriers') {
      handleBookingRequest();
    } else {
      if (!selectedCarrierName) {
        toast({
          title: "الرجاء تحديد ناقل أولاً",
          description: "ابحث عن ناقل لتتمكن من إرسال طلب له.",
          variant: "destructive",
        });
        return;
      }
      toast({
          title: "جاري إرسال الطلب...",
          description: `سيتم إرسال طلبك إلى ${selectedCarrierName}.`,
      });
    }
  };

  const handleBookingRequestSubmit = async () => {
    if (!user || !firestore) {
        toast({
            title: "يرجى تسجيل الدخول",
            description: "يجب عليك تسجيل الدخول أولاً لإرسال طلب حجز.",
            variant: "destructive",
        });
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

    const tripsCollection = collection(firestore, 'trips');
    addDocumentNonBlocking(tripsCollection, {
        userId: user.uid,
        origin: searchOriginCity,
        destination: searchDestinationCity,
        passengers: searchSeats,
        status: 'Awaiting-Offers',
        departureDate: date ? date.toISOString() : new Date().toISOString(),
    }).then(() => {
        toast({
            title: "تم إرسال طلبك بنجاح!",
            description: "سيتم توجيهك الآن لصفحة حجوزاتك لمتابعة طلبك.",
        });
        router.push('/history');
    });
  };
  
  const handleBookingRequest = () => {
    if (!user) {
        setIsDisclaimerOpen(true);
        return;
    }
    handleBookingRequestSubmit();
  };

  const showFilterMessage = searchMode === 'specific-carrier' && selectedCarrierName && Object.keys(groupedAndFilteredTrips).length > 0;
  const showAllCarriersMessage = searchMode === 'all-carriers' && Object.keys(groupedAndFilteredTrips).length > 0;

  const sortedTripDates = Object.keys(groupedAndFilteredTrips);


  return (
    <AppLayout>
      <div className="container mx-auto p-0 md:p-4 bg-[#130609] rounded-lg">
        <div className="flex flex-col lg:flex-row gap-8 p-4">

          {/* Main Content: Trip Search and Display */}
          <div className="flex-1 min-w-0">
            <header className="mb-8 text-center lg:text-right">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">أهلاً بك، أين وجهتك التالية؟</h1>
              <p className="text-muted-foreground mt-2">ابحث عن رحلتك القادمة أو استعرض الرحلات المجدولة بسهولة.</p>
            </header>

            {/* Search Form Card */}
            <Card className="w-full shadow-lg rounded-lg mb-8 border-border/60 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-1 gap-4">

                  {/* Search Philosophy Buttons */}
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                     <Button variant={searchMode === 'specific-carrier' ? 'default' : 'outline'} onClick={() => setSearchMode('specific-carrier')} className="w-full text-xs sm:text-sm">
                        <UserSearch className="ml-2 h-4 w-4" /> ناقل محدد
                     </Button>
                     <Button variant={searchMode === 'all-carriers' ? 'default' : 'outline'} onClick={() => setSearchMode('all-carriers')} className="w-full text-xs sm:text-sm">
                        <Globe className="ml-2 h-4 w-4" /> كل الناقلين
                     </Button>
                  </div>
                  
                  <div className="border-t border-border/60 my-2"></div>

                  {/* Specific Carrier Search Input */}
                  {searchMode === 'specific-carrier' && (
                    <div className="grid gap-2">
                      <Label htmlFor="carrier-search">البحث عن ناقل (بالاسم او رقم الهاتف)</Label>
                      <div className="flex gap-2">
                        <Input 
                            id="carrier-search" 
                            placeholder="مثال: شركة النقل السريع أو 966501234567+" 
                            value={carrierSearchInput} 
                            onChange={(e) => {
                                setCarrierSearchInput(e.target.value);
                                if (selectedCarrierName) {
                                    setSelectedCarrierName(null); 
                                }
                            }}
                            className={cn(selectedCarrierName ? 'bg-green-100/10 border-green-500' : '')}
                        />
                        <Button onClick={handleCarrierSearch} variant="secondary">
                            <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Vehicle Type Radio Group (Only for all-carriers mode) */}
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


                  {/* Origin and Destination */}
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

                  {/* Date and Seats */}
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
                        {`هناك رحلات مجدولة لـ ${selectedCarrierName} معروضة أدناه. يمكنك الآن تصفية النتائج أو تكملة إدخال بياناتك ثم إرسال طلب جديد.`}
                    </div>
                  )}

                  {showAllCarriersMessage && (
                     <div className="mt-2 text-center text-sm text-accent bg-accent/10 p-2 rounded-md border border-accent/30">
                        هناك رحلات مجدولة معروضة أدناه. يمكنك الآن تصفية النتائج أو تكملة إدخال بياناتك ثم إرسال طلب جديد.
                    </div>
                  )}


                  {/* Action Button */}
                  <Button onClick={handleMainActionButtonClick} size="lg" className="w-full justify-self-stretch sm:justify-self-end mt-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                    {searchMode === 'all-carriers' ? 'البحث عن مناقص ناقلين' : 'ارسال طلب للناقل المحدد'}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Upcoming Scheduled Trips - Accordion View */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-4">الرحلات المجدولة القادمة</h2>
              {isLoading && <p>جاري تحميل الرحلات...</p>}
              
              {!isLoading && sortedTripDates.length > 0 ? (
                <Accordion type="single" collapsible defaultValue={openAccordion} value={openAccordion} onValueChange={setOpenAccordion}>
                    {sortedTripDates.map(dateKey => {
                        const tripsForDate = groupedAndFilteredTrips[dateKey];
                        const dateObj = new Date(dateKey);
                        const dayName = dateObj.toLocaleDateString('ar-SA', { weekday: 'long' });
                        const formattedDate = dateObj.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

                        return (
                            <AccordionItem value={dateKey} key={dateKey}>
                                <AccordionTrigger>
                                    <div className="flex justify-between w-full">
                                        <span>{`${dayName}، ${formattedDate}`}</span>
                                        <Badge variant="outline">{`${tripsForDate.length} رحلات`}</Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                        {tripsForDate.map(trip => (
                                            <TripCard key={trip.id} trip={trip} />
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <ShipWheel className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                   {searchMode === 'specific-carrier' && (
                    <>
                        <p className="text-lg">
                            {isLoading ? 'جاري التحميل...' : (selectedCarrierName ? 'لا توجد رحلات مجدولة تطابق بحثك لهذا الناقل.' : 'الرجاء البحث عن ناقل لعرض رحلاته المجدولة.')}
                        </p>
                        <p className="text-sm mt-2">
                           {selectedCarrierName ? 'جرّب تغيير فلاتر البحث أو أرسل طلبًا جديدًا لهذا الناقل.' : 'يمكنك أيضًا التبديل إلى وضع "كل الناقلين" لإرسال طلب للجميع.'}
                        </p>
                    </>
                   )}
                   {searchMode === 'all-carriers' && (
                       <p className="text-lg">{isLoading ? 'جاري التحميل...' : 'لا توجد رحلات مجدولة تطابق بحثك. جرّب تغيير فلاتر البحث.'}</p>
                   )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <LegalDisclaimerDialog 
        isOpen={isDisclaimerOpen}
        onOpenChange={setIsDisclaimerOpen}
      />
    </AppLayout>
  );
}
