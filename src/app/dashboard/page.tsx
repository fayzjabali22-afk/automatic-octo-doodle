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
import { Users, Search, ShipWheel, CalendarIcon } from 'lucide-react';
import { useState } from 'react';
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
import { collection, query } from 'firebase/firestore';
import { LegalDisclaimerDialog } from '@/components/legal-disclaimer-dialog';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const [date, setDate] = useState<Date>();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const { toast } = useToast();

  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
  const [searchSeats, setSearchSeats] = useState('1');
  
  const [quickBookingOrigin, setQuickBookingOrigin] = useState('');
  const [quickBookingDestination, setQuickBookingDestination] = useState('');
  const [quickBookingSeats, setQuickBookingSeats] = useState(1);


  const tripsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'trips'));
  }, [firestore, user]);

  const { data: upcomingTrips, isLoading } = useCollection<Trip>(tripsQuery);
  
  const handleQuickBookingSubmit = () => {
    if (!user || !firestore) {
        toast({
            title: "يرجى تسجيل الدخول",
            description: "يجب عليك تسجيل الدخول أولاً لإرسال طلب حجز.",
            variant: "destructive",
        });
        return;
    }
    if (!quickBookingOrigin || !quickBookingDestination) {
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
        origin: quickBookingOrigin,
        destination: quickBookingDestination,
        passengers: quickBookingSeats,
        status: 'Awaiting-Offers',
        departureDate: new Date().toISOString(), // Placeholder date
    });

    toast({
        title: "تم إرسال طلبك بنجاح!",
        description: "سيقوم الناقلون بمراجعة طلبك وإرسال عروضهم.",
    });

    setQuickBookingOrigin('');
    setQuickBookingDestination('');
    setQuickBookingSeats(1);
  };
  
  const handleBookingRequest = () => {
    if (!user) {
        setIsDisclaimerOpen(true);
        return;
    }
    handleQuickBookingSubmit();
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-0 md:p-4 bg-[#130609] rounded-lg">
        <div className="flex flex-col lg:flex-row gap-8 p-4">

          {/* Main Content: Trip Search and Display */}
          <div className="flex-1 min-w-0">
            <header className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">أهلاً بك، أين وجهتك التالية؟</h1>
              <p className="text-muted-foreground mt-2">ابحث عن رحلتك القادمة أو استعرض الرحلات المجدولة بسهولة.</p>
            </header>

            {/* Search Form Card */}
            <Card className="w-full shadow-lg rounded-lg mb-8 border-border/60 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="grid gap-6">
                  {/* Origin and Destination */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="origin-city">من</Label>
                      <Select onValueChange={setSearchOrigin} value={searchOrigin}>
                        <SelectTrigger id="origin-city">
                          <SelectValue placeholder="اختر مدينة الانطلاق" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="damascus">دمشق</SelectItem>
                          <SelectItem value="amman">عمّان</SelectItem>
                          <SelectItem value="riyadh">الرياض</SelectItem>
                          <SelectItem value="cairo">القاهرة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="destination-city">إلى</Label>
                      <Select onValueChange={setSearchDestination} value={searchDestination}>
                        <SelectTrigger id="destination-city">
                          <SelectValue placeholder="اختر مدينة الوصول" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amman">عمّان</SelectItem>
                          <SelectItem value="damascus">دمشق</SelectItem>
                          <SelectItem value="dubai">دبي</SelectItem>
                          <SelectItem value="kuwait">الكويت</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Date and Seats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <CalendarIcon className="ml-2 h-4 w-4 text-green-400" />
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
                      <Select onValueChange={setSearchSeats} value={searchSeats}>
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
                  <Button size="lg" className="w-full md:w-auto md:col-start-2 justify-self-end mt-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Search className="ml-2 h-5 w-5" />
                    ابحث عن رحلة
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Upcoming Scheduled Trips */}
            <div>
              <h2 className="text-2xl font-bold mb-4">الرحلات المجدولة القادمة</h2>
              {isLoading && <p>Loading trips...</p>}
              {!isLoading && user && upcomingTrips && upcomingTrips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {upcomingTrips.map(trip => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <ShipWheel className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-lg">{user ? 'لا توجد رحلات مجدولة في الوقت الحالي.' : 'يرجى تسجيل الدخول لعرض الرحلات المجدولة.'}</p>
                  <p className="text-sm mt-2">{user ? 'جرّب البحث بتاريخ أو وجهة مختلفة.' : 'يمكنك البحث عن رحلة أو نشر طلب حجز.'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Side Panel: Quick Booking */}
          <div className="lg:w-[350px] lg:shrink-0">
            <Card className="w-full shadow-lg rounded-lg sticky top-8 border-2 border-red-700 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">
                  حجز سريع
                </CardTitle>
                <CardDescription>
                  أرسل طلبك مباشرة إلى أفضل الناقلين.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="quick-origin">من</Label>
                    <Select onValueChange={setQuickBookingOrigin} value={quickBookingOrigin}>
                        <SelectTrigger id="quick-origin">
                          <SelectValue placeholder="اختر مدينة الانطلاق" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="damascus">دمشق</SelectItem>
                          <SelectItem value="amman">عمّان</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="quick-destination">إلى</Label>
                      <Select onValueChange={setQuickBookingDestination} value={quickBookingDestination}>
                        <SelectTrigger id="quick-destination">
                          <SelectValue placeholder="اختر مدينة الوصول" />
                        </Trigger>
                        <SelectContent>
                          <SelectItem value="amman">عمّان</SelectItem>
                          <SelectItem value="damascus">دمشق</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="quick-seats">عدد المقاعد</Label>
                      <Select onValueChange={(val) => setQuickBookingSeats(parseInt(val))} value={String(quickBookingSeats)}>
                        <SelectTrigger id="quick-seats">
                          <SelectValue placeholder="اختر عدد المقاعد" />
                        </Trigger>
                        <SelectContent>
                          {Array.from({ length: 9 }, (_, i) => i + 1).map(num => (
                            <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input placeholder="ابحث عن ناقل محدد (اختياري)" className="pr-10 bg-background/50" />
                    </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end mt-4">
                      <Button size="lg" onClick={handleBookingRequest}>
                        إرسال طلب الحجز
                      </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
