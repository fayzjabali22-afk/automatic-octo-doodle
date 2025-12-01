
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
import { LegalDisclaimerDialog } from '@/components/legal-disclaimer-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { tripHistory, mockOffers } from '@/lib/data';


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

  // Seed mock data for testing purposes
  useEffect(() => {
    if (firestore && user) {
        const seedData = async () => {
            const awaitingTripId = 'TRIP-AWAITING-001';
            const tripRef = doc(firestore, 'trips', awaitingTripId);
            const tripSnap = await getDoc(tripRef);

            // Only seed if the specific "Awaiting-Offers" trip doesn't exist.
            if (!tripSnap.exists()) {
                const batch = writeBatch(firestore);

                // Add the main trip that is awaiting offers
                const tripAwaitingOffers = tripHistory.find(t => t.id === awaitingTripId);
                if (tripAwaitingOffers) {
                    const newTrip = { ...tripAwaitingOffers, userId: user.uid };
                    batch.set(tripRef, newTrip);
                }

                // Add the mock offers for that trip
                const offersForTrip = mockOffers.filter(o => o.tripId === awaitingTripId);
                offersForTrip.forEach(offer => {
                    const offerRef = doc(collection(firestore, `trips/${awaitingTripId}/offers`));
                    batch.set(offerRef, { ...offer, id: offerRef.id }); // Assign new ID
                });

                await batch.commit();
                console.log("Mock data seeded for user:", user.uid);
            }
        };
        seedData();
    }
  }, [firestore, user]);


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
      
      const newTripData: Trip = {
          userId: user.uid,
          origin: searchOriginCity,
          destination: searchDestinationCity,
          passengers: searchSeats,
          status: 'Awaiting-Offers',
          departureDate: date ? date.toISOString() : new Date().toISOString(),
          // In a real app, you'd generate a unique ID on the server,
          // but for this client-side mock, we'll let Firestore do it.
          id: '', 
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
          setIsDisclaimerOpen(true);
          return;
      }

      // Step 2: Check for email verification
      if (user && !user.emailVerified) {
          toast({
              variant: "destructive",
              title: "الحساب غير مفعل",
              description: "الرجاء التحقق من بريدك الإلكتروني أولاً لتتمكن من إرسال الطلبات.",
          });
          return;
      }

      // Step 3: Check for complete data
      if (!searchOriginCity || !searchDestinationCity) {
          toast({
              title: "بيانات غير مكتملة",
              description: "الرجاء اختيار مدينة الانطلاق والوصول.",
              variant: "destructive",
          });
          return;
      }

      // Step 4: Submit the request
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
              <p className="text-muted-foreground mt-2">املأ تفاصيل رحلتك واحصل على أفضل العروض من الناقلين.</p>
            </header>

            {/* Request Form Card */}
            <Card className="w-full shadow-lg rounded-lg border-border/60 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>إنشاء طلب رحلة جديد</CardTitle>
                <CardDescription>سيتم إرسال طلبك إلى الناقلين المسجلين لدينا.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-1 gap-4">

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
                    <Globe className="ml-2 h-4 w-4" />
                    إرسال طلب للحصول على عروض
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <LegalDisclaimerDialog 
        isOpen={isDisclaimerOpen}
        onOpenChange={setIsDisclaimerOpen}
        onContinue={handleBookingRequest}
      />
    </AppLayout>
  );
}
