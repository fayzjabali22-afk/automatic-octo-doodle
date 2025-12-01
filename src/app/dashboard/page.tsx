
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Users, Search, ShipWheel, CalendarIcon, UserSearch, Globe, Star } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import type { Trip } from '@/lib/data';
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useCollection, useFirestore, useUser, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, addDoc, writeBatch, getDocs, getDoc } from 'firebase/firestore';
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
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const { toast } = useToast();

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

  
  const handleBookingRequestSubmit = async () => {
      if (!firestore || !user) return;
      const tripsCollection = collection(firestore, 'trips');
      
      const newTripData: Omit<Trip, 'id'> = {
          userId: user.uid,
          origin: searchOriginCity,
          destination: searchDestinationCity,
          passengers: searchSeats,
          status: 'Awaiting-Offers',
          departureDate: date ? date.toISOString() : new Date().toISOString(),
          // if searchMode is specific-carrier, add the carrierId
          ...(searchMode === 'specific-carrier' && { privateCarrierId: 'carrier01' }), // Replace with actual selected carrier
      };
      
      addDocumentNonBlocking(tripsCollection, newTripData).then(() => {
          toast({
              title: "تم إرسال طلبك بنجاح!",
              description: "سيتم توجيهك الآن لصفحة حجوزاتك لمتابعة العروض.",
          });
          router.push('/history');
      });
  };
  
  const handleBookingRequest = () => {
      // Step 1: Check for user login
      if (!user) {
          setIsAuthDialogOpen(true);
          return;
      }
      
      if (searchMode === 'specific-carrier' ) {
          // Add validation for selecting a carrier if needed
      }


      // Step 3: Submit the request
      handleBookingRequestSubmit();
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
                  
                  {/* Action Button */}
                  <Button onClick={handleBookingRequest} size="lg" className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground">
                     {searchMode === 'all-carriers' ? (
                        <>
                            <Globe className="ml-2 h-4 w-4" />
                            إرسال طلب للحصول على عروض
                        </>
                    ) : (
                        <>
                            <UserSearch className="ml-2 h-4 w-4" />
                            إرسال طلب مباشر للناقل
                        </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <AuthRedirectDialog 
        isOpen={isAuthDialogOpen}
        onOpenChange={setIsAuthDialogOpen}
      />
    </AppLayout>
  );
}
