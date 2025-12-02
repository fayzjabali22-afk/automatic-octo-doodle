'use client';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Users, Search, ShipWheel, CalendarIcon, UserSearch, Globe, Star, TestTube2, Bus, Car } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import type { Trip, Offer } from '@/lib/data';
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, addDoc, writeBatch, getDocs, getDoc, serverTimestamp } from 'firebase/firestore';
import { AuthRedirectDialog } from '@/components/auth-redirect-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { scheduledTrips } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { LegalDisclaimerDialog } from '@/components/legal-disclaimer-dialog';
import { ScheduledTripCard } from '@/components/scheduled-trip-card';


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
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isAuthRedirectOpen, setIsAuthRedirectOpen] = useState(false);
  const [isLegalDisclaimerOpen, setIsLegalDisclaimerOpen] = useState(false);
  const [tripRequestData, setTripRequestData] = useState<Omit<Trip, 'id' | 'userId' | 'status' | 'departureDate'> | null>(null);


  const [searchOriginCountry, setSearchOriginCountry] = useState('');
  const [searchOriginCity, setSearchOriginCity] = useState('');
  const [searchDestinationCountry, setSearchDestinationCountry] = useState('');
  const [searchDestinationCity, setSearchDestinationCity] = useState('');
  const [searchSeats, setSearchSeats] = useState(1);
  const [searchMode, setSearchMode] = useState<'all-carriers' | 'specific-carrier'>('all-carriers');
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [carrierSearch, setCarrierSearch] = useState('');
  
  useEffect(() => {
    setSearchOriginCity('');
  }, [searchOriginCountry]);

  useEffect(() => {
    setSearchDestinationCity('');
  }, [searchDestinationCountry]);

  const handleLegalConfirm = async () => {
    setIsLegalDisclaimerOpen(false);
    if (!user || !firestore || !tripRequestData || !date) return;

    const newTrip: Omit<Trip, 'id'> = {
        userId: user.uid,
        origin: tripRequestData.origin,
        destination: tripRequestData.destination,
        departureDate: date.toISOString(),
        status: 'Awaiting-Offers',
        passengers: tripRequestData.passengers,
    };
    
    try {
        const tripRef = await addDoc(collection(firestore, 'trips'), newTrip);
        toast({ title: "تم إرسال طلبك!", description: "تم إرسال طلب رحلتك إلى الناقلين." });
        router.push('/history'); // Redirect to history to see the new request
    } catch (error) {
        console.error("Error creating trip request:", error);
        toast({ title: "خطأ", description: "لم نتمكن من إنشاء طلب رحلتك.", variant: "destructive" });
    }
  };


  const handleCreateTripRequest = async () => {
    if (!user) {
        setIsAuthRedirectOpen(true);
        return;
    }
    
    if (!searchOriginCity || !searchDestinationCity || !date) {
        toast({ title: "بيانات غير مكتملة", description: "الرجاء ملء جميع تفاصيل الرحلة.", variant: "destructive" });
        return;
    }

    const currentTripData = {
        origin: searchOriginCity,
        destination: searchDestinationCity,
        passengers: searchSeats,
    };
    
    setTripRequestData(currentTripData);
    setIsLegalDisclaimerOpen(true);
  };

  const handleAuthSuccess = () => {
    handleCreateTripRequest();
  };

  const filteredScheduledTrips = useMemo(() => {
    return scheduledTrips.filter(trip => {
      const originMatch = !searchOriginCity || trip.origin === searchOriginCity;
      const destinationMatch = !searchDestinationCity || trip.destination === searchDestinationCity;
      const carrierMatch = !carrierSearch || (trip.carrierName && trip.carrierName.toLowerCase().includes(carrierSearch.toLowerCase()));
      // This part will need actual vehicle type data in the trip object later
      // const vehicleMatch = filterVehicle === 'all' || (trip.vehicleType === filterVehicle); 
      return originMatch && destinationMatch && carrierMatch;
    });
  }, [searchOriginCity, searchDestinationCity, carrierSearch, filterVehicle]);


  return (
    <AppLayout>
      <div className="container mx-auto p-0 md:p-4 bg-[#130609] rounded-lg space-y-8">
        
        <div className="flex flex-col items-center gap-8 p-2 lg:p-4">
          <header className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">أين وجهتك التالية؟</h1>
            <p className="text-muted-foreground mt-2">ابحث عن رحلة أو اطلب أسعارًا من أفضل شركات النقل.</p>
          </header>

          <Card className="w-full max-w-4xl shadow-lg rounded-lg border-border/60 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>ابحث عن رحلة أو أنشئ طلبًا</CardTitle>
              <CardDescription>استخدم النموذج التالي للبحث عن رحلات مجدولة أو لإنشاء طلب رحلة مخصصة.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="grid gap-3">
                  <Label className="text-base">الخطوة الأولى: اختر طريقة الطلب</Label>
                  <RadioGroup
                      defaultValue="all-carriers"
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                      onValueChange={(value) => setSearchMode(value as 'specific-carrier' | 'all-carriers')}
                  >
                    <div>
                      <RadioGroupItem value="all-carriers" id="all-carriers" className="peer sr-only" />
                      <Label
                        htmlFor="all-carriers"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        <Globe className="mb-3 h-6 w-6" />
                        طلب عروض من كل الناقلين
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="specific-carrier" id="specific-carrier" className="peer sr-only" />
                      <Label
                        htmlFor="specific-carrier"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        <UserSearch className="mb-3 h-6 w-6" />
                        طلب من ناقل محدد
                      </Label>
                    </div>
                  </RadioGroup>
                   <div className="flex flex-col gap-3 pt-4">
                    {searchMode === 'specific-carrier' && (
                      <div className="grid gap-2 animate-in fade-in-50">
                        <Label htmlFor="carrier-search">ابحث عن ناقلك المفضل بالاسم أو رقم الهاتف</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="carrier-search" placeholder="مثال: شركة النقل السريع..." className="pl-10" onChange={(e) => setCarrierSearch(e.target.value)} />
                        </div>
                      </div>
                    )}
                    <RadioGroup defaultValue="all" className="flex items-center gap-4 flex-wrap" onValueChange={setFilterVehicle}>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <RadioGroupItem value="all" id="r-all-req" />
                          <Label htmlFor="r-all-req">الكل</Label>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <RadioGroupItem value="small" id="r-car-req" />
                          <Label htmlFor="r-car-req" className="flex items-center gap-2"><Car/>سيارة</Label>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <RadioGroupItem value="bus" id="r-bus-req" />
                          <Label htmlFor="r-bus-req" className="flex items-center gap-2"><Bus/>حافلة</Label>
                        </div>
                    </RadioGroup>
                 </div>
                </div>
                
                 <div className="grid gap-3 md:col-span-1">
                  <Label className="text-base">الخطوة الثانية: أدخل تفاصيل رحلتك</Label>
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
                      <Label htmlFor="travel-date">تاريخ السفر (تقريبي)</Label>
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
                      <Select onValueChange={(val) => setSearchSeats(parseInt(val))} defaultValue={String(searchSeats)}>
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

              </div>
            </CardContent>
          </Card>
          
            <div className="w-full max-w-4xl space-y-4">
               <CardTitle className="text-cyan-400 text-center">يمكنك اختيار الرحلة المناسبة لك مباشرة</CardTitle>
              
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredScheduledTrips.map(trip => (
                  <ScheduledTripCard key={trip.id} trip={trip} />
                ))}
              </div>

              {filteredScheduledTrips.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                      <p>لا توجد رحلات مجدولة تطابق بحثك حالياً.</p>
                      <p className="text-sm">جرب تعديل فلاتر البحث أو قم بإنشاء طلب جديد بالأسفل.</p>
                  </div>
              )}

               <div className="pt-4">
                    <Button size="lg" className="w-full bg-[#B19C7D] hover:bg-[#a18c6d] text-white" onClick={handleCreateTripRequest}>
                        اطلب أسعار من الناقلين لرحلتك
                    </Button>
                </div>
            </div>
        </div>


      </div>
      <AuthRedirectDialog isOpen={isAuthRedirectOpen} onOpenChange={setIsAuthRedirectOpen} onLoginSuccess={handleAuthSuccess} />
      <LegalDisclaimerDialog isOpen={isLegalDisclaimerOpen} onOpenChange={setIsLegalDisclaimerOpen} onContinue={handleLegalConfirm} />
    </AppLayout>
  );
}
