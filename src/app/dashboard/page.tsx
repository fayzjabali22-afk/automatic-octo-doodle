
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

  const [searchOriginCountry, setSearchOriginCountry] = useState('');
  const [searchOriginCity, setSearchOriginCity] = useState('');
  const [searchDestinationCountry, setSearchDestinationCountry] = useState('');
  const [searchDestinationCity, setSearchDestinationCity] = useState('');
  const [searchSeats, setSearchSeats] = useState(1);
  const [searchMode, setSearchMode] = useState<'all-carriers' | 'specific-carrier'>('all-carriers');

  // State for scheduled trips filtering
  const [filterOrigin, setFilterOrigin] = useState('');
  const [filterDestination, setFilterDestination] = useState('');
  const [filterCarrier, setFilterCarrier] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('all');

  
  useEffect(() => {
    setSearchOriginCity('');
  }, [searchOriginCountry]);

  useEffect(() => {
    setSearchDestinationCity('');
  }, [searchDestinationCountry]);


  const handleCreateTripRequest = async () => {
    if (!user) {
        setIsAuthRedirectOpen(true);
        return;
    }
    
    if (!firestore || !searchOriginCity || !searchDestinationCity || !date) {
        toast({ title: "Incomplete Data", description: "Please fill all trip details.", variant: "destructive" });
        return;
    }

    const newTrip: Omit<Trip, 'id'> = {
        userId: user.uid,
        origin: searchOriginCity,
        destination: searchDestinationCity,
        departureDate: date.toISOString(),
        status: 'Awaiting-Offers',
        passengers: searchSeats,
    };
    
    try {
        const tripRef = await addDoc(collection(firestore, 'trips'), newTrip);
        toast({ title: "Request Sent!", description: "Your trip request has been sent to carriers." });
        router.push('/history'); // Redirect to history to see the new request
    } catch (error) {
        console.error("Error creating trip request:", error);
        toast({ title: "Error", description: "Could not create your trip request.", variant: "destructive" });
    }
  };

  const handleAuthSuccess = () => {
    // This function will be called after successful login/signup.
    // We can now proceed with the trip creation.
    handleCreateTripRequest();
  };

  const filteredScheduledTrips = useMemo(() => {
    return scheduledTrips.filter(trip => {
      const originMatch = !filterOrigin || trip.origin === filterOrigin;
      const destinationMatch = !filterDestination || trip.destination === filterDestination;
      const carrierMatch = !filterCarrier || (trip.carrierName && trip.carrierName.toLowerCase().includes(filterCarrier.toLowerCase()));
      // This part will need actual vehicle type data in the trip object later
      // const vehicleMatch = filterVehicle === 'all' || (trip.vehicleType === filterVehicle); 
      return originMatch && destinationMatch && carrierMatch;
    });
  }, [filterOrigin, filterDestination, filterCarrier, filterVehicle]);


  return (
    <AppLayout>
      <div className="container mx-auto p-0 md:p-4 bg-[#130609] rounded-lg space-y-12">
        
        {/* Section 1: Trip Request Form */}
        <div className="flex flex-col items-center gap-8 p-2 lg:p-4">
          <header className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">أين وجهتك التالية؟</h1>
            <p className="text-muted-foreground mt-2">املأ تفاصيل رحلتك واحصل على أفضل العروض أو ابحث عن رحلة مجدولة.</p>
          </header>

          <Card className="w-full max-w-2xl shadow-lg rounded-lg border-border/60 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>إنشاء طلب رحلة جديد</CardTitle>
              <CardDescription>اطلب عروض أسعار من الناقلين لرحلتك المخصصة.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-1 gap-6">

                <div className="grid gap-3">
                  <Label className="text-base">الخطوة الأولى: اختر طريقة الطلب</Label>
                  <RadioGroup
                      defaultValue="all-carriers"
                      className="grid grid-cols-2 gap-4"
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
                </div>

                {searchMode === 'specific-carrier' && (
                  <div className="grid gap-2 animate-in fade-in-50">
                    <Label htmlFor="carrier-search">ابحث عن ناقلك المفضل بالاسم أو رقم الهاتف</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="carrier-search" placeholder="مثال: شركة النقل السريع..." className="pl-10" />
                    </div>
                  </div>
                )}

                <div className="grid gap-3">
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
            </CardContent>
            <CardFooter className="p-4 md:p-6 border-t border-border/60 flex flex-col gap-2">
               <Button size="lg" className="w-full bg-[#B19C7D] hover:bg-[#a18c6d] text-white" onClick={handleCreateTripRequest}>
                  طلب أسعار
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Section 2: Scheduled Trips */}
        <div className="space-y-8 p-2 lg:p-4">
          <header className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">الرحلات المجدولة</h2>
            <p className="text-muted-foreground mt-2">ابحث عن الرحلات المجدولة من قبل الناقلين واحجز مقعدك مباشرة.</p>
          </header>

          <Card className="w-full shadow-lg rounded-lg border-border/60 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>تصفية الرحلات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select onValueChange={setFilterOrigin} value={filterOrigin}>
                  <SelectTrigger><SelectValue placeholder="أي نقطة انطلاق" /></SelectTrigger>
                  <SelectContent>
                     {Object.entries(cities).map(([key, city]) => <SelectItem key={key} value={key}>{city}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select onValueChange={setFilterDestination} value={filterDestination}>
                  <SelectTrigger><SelectValue placeholder="أي نقطة وصول" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(cities).map(([key, city]) => <SelectItem key={key} value={key}>{city}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="البحث عن ناقل..." className="pl-10" onChange={e => setFilterCarrier(e.target.value)} />
                </div>
              </div>
              <RadioGroup defaultValue="all" className="flex items-center gap-4" onValueChange={setFilterVehicle}>
                <Label>نوع المركبة:</Label>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="all" id="r-all" />
                  <Label htmlFor="r-all">الكل</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="small" id="r-car" />
                  <Label htmlFor="r-car" className="flex items-center gap-2"><Car/>سيارة</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="bus" id="r-bus" />
                  <Label htmlFor="r-bus" className="flex items-center gap-2"><Bus/>حافلة</Label>
                </div>
              </RadioGroup>
            </CardContent>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الناقل</TableHead>
                    <TableHead>الانطلاق</TableHead>
                    <TableHead>الوجهة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredScheduledTrips.map(trip => (
                    <TableRow key={trip.id}>
                      <TableCell>{trip.carrierName}</TableCell>
                      <TableCell>{cities[trip.origin]}</TableCell>
                      <TableCell>{cities[trip.destination]}</TableCell>
                      <TableCell>{new Date(trip.departureDate).toLocaleDateString('ar-EG')}</TableCell>
                      <TableCell><Badge variant="secondary">{trip.status}</Badge></TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          حجز
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredScheduledTrips.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            لا توجد رحلات مجدولة تطابق بحثك.
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

      </div>
      <AuthRedirectDialog isOpen={isAuthRedirectOpen} onOpenChange={setIsAuthRedirectOpen} onLoginSuccess={handleAuthSuccess} />
    </AppLayout>
  );
}
