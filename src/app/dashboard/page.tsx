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
import { TripCard } from '@/components/trip-card';
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useCollection, useFirestore, useUser, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { LegalDisclaimerDialog } from '@/components/legal-disclaimer-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

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


export default function DashboardPage() {
  const [date, setDate] = useState<Date>();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const { toast } = useToast();

  // Search States
  const [searchOriginCountry, setSearchOriginCountry] = useState('');
  const [searchOriginCity, setSearchOriginCity] = useState('');
  const [searchDestinationCountry, setSearchDestinationCountry] = useState('');
  const [searchDestinationCity, setSearchDestinationCity] = useState('');
  const [searchSeats, setSearchSeats] = useState(1);
  const [searchCarrier, setSearchCarrier] = useState('');

  const [searchMode, setSearchMode] = useState<'specific-carrier' | 'all-carriers'>('specific-carrier');

  const [filteredTrips, setFilteredTrips] = useState<Trip[] | null>(null);
  
  // Reset city when country changes
  useEffect(() => {
    setSearchOriginCity('');
  }, [searchOriginCountry]);

  useEffect(() => {
    setSearchDestinationCity('');
  }, [searchDestinationCountry]);


  const tripsQuery = useMemoFirebase(() => {
    if (!firestore || !user || searchMode !== 'specific-carrier' || !searchCarrier) return null;

    return query(
        collection(firestore, 'trips'),
        where('carrierName', '==', searchCarrier),
        where('status', '!=', 'Awaiting-Offers')
    );
  }, [firestore, user, searchMode, searchCarrier]);

  const { data: upcomingTrips, isLoading } = useCollection<Trip>(tripsQuery);

  useEffect(() => {
    if (searchMode !== 'specific-carrier' || !upcomingTrips) {
        setFilteredTrips(null); // Clear filtered trips if not in specific carrier mode or no data
        return;
    }

    let trips = [...upcomingTrips];

    // Filter by origin
    if (searchOriginCity) {
        trips = trips.filter(trip => trip.origin === searchOriginCity);
    }
    // Filter by destination
    if (searchDestinationCity) {
        trips = trips.filter(trip => trip.destination === searchDestinationCity);
    }
    // Filter by available seats
    if (searchSeats > 0) {
        trips = trips.filter(trip => trip.availableSeats >= searchSeats);
    }
    // Filter and sort by date
    if (date) {
        const selectedDate = new Date(date.setHours(0,0,0,0));
        trips = trips.filter(trip => {
            const tripDate = new Date(new Date(trip.departureDate).setHours(0,0,0,0));
            return tripDate.getTime() === selectedDate.getTime();
        });
    }

    // Sort to bring more relevant trips to the top
    trips.sort((a, b) => {
        // Prioritize trips with enough seats
        const aHasSeats = a.availableSeats >= searchSeats;
        const bHasSeats = b.availableSeats >= searchSeats;
        if (aHasSeats !== bHasSeats) return aHasSeats ? -1 : 1;

        // Prioritize by date if selected
        if (date) {
            const aDateMatch = new Date(new Date(a.departureDate).setHours(0,0,0,0)).getTime() === new Date(date.setHours(0,0,0,0)).getTime();
            const bDateMatch = new Date(new Date(b.departureDate).setHours(0,0,0,0)).getTime() === new Date(date.setHours(0,0,0,0)).getTime();
            if (aDateMatch !== bDateMatch) return aDateMatch ? -1 : 1;
        }

        // Default sort by departure date
        return new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime();
    });

    setFilteredTrips(trips);

  }, [searchOriginCity, searchDestinationCity, searchSeats, date, upcomingTrips, searchMode]);

  const tripsToDisplay = searchMode === 'specific-carrier' ? filteredTrips : [];
  
  const handleSearchClick = () => {
    if (searchMode === 'all-carriers') {
      handleBookingRequest();
    } else {
      // This button is now for submitting a NEW trip request to a SPECIFIC carrier
      // if no suitable trips are found.
      toast({
          title: "جاري إرسال الطلب...",
          description: `سيتم إرسال طلبك إلى ${searchCarrier}.`,
      });
      // Placeholder for sending a direct request to a carrier
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
        // Redirect user to their bookings page to see the new request
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

  const showFilterMessage = searchMode === 'specific-carrier' && searchCarrier && upcomingTrips && upcomingTrips.length > 0;

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
                      <Input id="carrier-search" placeholder="مثال: شركة النقل السريع" value={searchCarrier} onChange={(e) => setSearchCarrier(e.target.value)} />
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
                        تم عرض رحلات الناقل المجدولة. يمكنك استخدام الحقول أعلاه لتصفية النتائج أو إرسال طلب جديد.
                    </div>
                  )}


                  {/* Action Button */}
                  <Button onClick={handleSearchClick} size="lg" className="w-full justify-self-stretch sm:justify-self-end mt-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                    {searchMode === 'all-carriers' ? (
                        <>البحث عن مناقص ناقلين</>
                    ) : (
                        <>ارسال</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Upcoming Scheduled Trips */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-4">الرحلات المجدولة القادمة</h2>
              {(isLoading && searchMode === 'specific-carrier') && <p>جاري تحميل رحلات الناقل...</p>}
              
              {!isLoading && user && tripsToDisplay && tripsToDisplay.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {tripsToDisplay.map(trip => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <ShipWheel className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                   {searchMode === 'specific-carrier' && (
                    <>
                        <p className="text-lg">
                            {isLoading ? 'جاري التحميل...' : (searchCarrier ? 'لا توجد رحلات مجدولة تطابق بحثك لهذا الناقل.' : 'الرجاء إدخال اسم الناقل لعرض رحلاته.')}
                        </p>
                        <p className="text-sm mt-2">
                           {searchCarrier ? 'جرّب تغيير فلاتر البحث أو أرسل طلبًا جديدًا لهذا الناقل.' : 'يمكنك أيضًا التبديل إلى وضع "كل الناقلين" لإرسال طلب للجميع.'}
                        </p>
                    </>
                   )}
                   {searchMode === 'all-carriers' && (
                       <p className="text-lg">املأ بيانات رحلتك ثم اضغط "البحث عن مناقص ناقلين" ليصل طلبك لجميع الناقلين.</p>
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

    