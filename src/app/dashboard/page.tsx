
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
import { Users, Search, ShipWheel, CalendarIcon, UserSearch, Globe, Star, TestTube2 } from 'lucide-react';
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
import { useCollection, useFirestore, useUser, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, addDoc, writeBatch, getDocs, getDoc, serverTimestamp } from 'firebase/firestore';
import { AuthRedirectDialog } from '@/components/auth-redirect-dialog';
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
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [searchOriginCountry, setSearchOriginCountry] = useState('');
  const [searchOriginCity, setSearchOriginCity] = useState('');
  const [searchDestinationCountry, setSearchDestinationCountry] = useState('');
  const [searchDestinationCity, setSearchDestinationCity] = useState('');
  const [searchSeats, setSearchSeats] = useState(1);
  const [searchMode, setSearchMode] = useState<'specific-carrier' | 'all-carriers'>('all-carriers');

  
  useEffect(() => {
    setSearchOriginCity('');
  }, [searchOriginCountry]);

  useEffect(() => {
    setSearchDestinationCity('');
  }, [searchDestinationCountry]);

  
  const handlePriceRequest = () => {
    if (!searchOriginCity) {
      toast({
        variant: "destructive",
        title: "بيانات غير مكتملة",
        description: "الرجاء اختيار مدينة الانطلاق.",
      });
      return;
    }
    if (!searchDestinationCity) {
      toast({
        variant: "destructive",
        title: "بيانات غير مكتملة",
        description: "الرجاء اختيار مدينة الوصول.",
      });
      return;
    }

    // If all fields are valid, navigate to the signup page
    router.push('/signup');
  };

  const handleCreateMockRequest = async () => {
    if (!firestore || !user) {
        toast({ title: "Error", description: "You must be logged in as a guest to create a mock request.", variant: "destructive" });
        return;
    }

    toast({ title: "Creating Mock Request...", description: "Please wait..." });

    try {
        const batch = writeBatch(firestore);

        // 1. Create a mock trip
        const newTripRef = doc(collection(firestore, "trips"));
        const mockTrip: Trip = {
            id: newTripRef.id,
            userId: user.uid,
            origin: 'riyadh',
            destination: 'amman',
            departureDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
            status: 'Awaiting-Offers',
            passengers: 2,
        };
        batch.set(newTripRef, mockTrip);

        // 2. Create 3 mock offers for the trip
        const mockCarriers = ['carrier01', 'carrier02', 'carrier03'];
        const mockPrices = [100, 95, 110];
        
        for (let i = 0; i < mockCarriers.length; i++) {
            const newOfferRef = doc(collection(firestore, `trips/${newTripRef.id}/offers`));
            const mockOffer: Offer = {
                id: newOfferRef.id,
                tripId: newTripRef.id,
                carrierId: mockCarriers[i],
                price: mockPrices[i],
                status: 'Pending',
                notes: `عرض وهمي ${i + 1} من ناقل وهمي.`,
                createdAt: serverTimestamp() as unknown as string,
            };
            batch.set(newOfferRef, mockOffer);
        }
        
        await batch.commit();

        toast({ title: "Success!", description: "Mock request and offers created. Redirecting..." });

        // 3. Redirect to the history page
        router.push('/history');

    } catch (error) {
        console.error("Error creating mock request:", error);
        toast({ title: "Error", description: "Failed to create mock data.", variant: "destructive" });
    }
};


  return (
    <AppLayout>
      <div className="container mx-auto p-0 md:p-4 bg-[#130609] rounded-lg">
        <div className="flex flex-col lg:flex-row gap-8 p-2 lg:p-4 justify-center">

          {/* Main Content: Trip Request Form */}
          <div className="w-full max-w-2xl">
            <header className="mb-8 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">أين وجهتك التالية؟</h1>
              <p className="text-muted-foreground mt-2">املأ تفاصيل رحلتك واحصل على أفضل العروض أو أرسل طلبًا مباشرًا لناقلك المفضل.</p>
            </header>

            {/* Request Form Card */}
            <Card className="w-full shadow-lg rounded-lg border-border/60 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>إنشاء طلب رحلة جديد</CardTitle>
                <CardDescription>ابدأ باختيار طريقة البحث عن رحلتك.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-1 gap-6">

                  {/* Step 1: Search Mode Selection */}
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


                  {/* Step 2: Trip Details */}
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

                  {/* Date and Seats */}
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
              <CardFooter className="p-4 md:p-6 border-t border-border/60 flex flex-col gap-2">
                 <Button size="lg" className="w-full bg-[#B19C7D] hover:bg-[#a18c6d] text-white" onClick={handlePriceRequest}>
                    طلب أسعار
                </Button>
                <Button size="lg" variant="destructive" className="w-full" onClick={handleCreateMockRequest}>
                    <TestTube2 className="ml-2 h-5 w-5" />
                    إنشاء طلب وهمي ومتابعة
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

    