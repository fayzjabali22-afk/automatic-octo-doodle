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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Calendar, CalendarDays, Search } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { tripHistory } from '@/lib/data'; 
import { TripCard } from '@/components/trip-card';
import Link from 'next/link';
import { format } from 'date-fns';
import { arEG } from 'date-fns/locale';

export default function DashboardPage() {
  const [bookingType, setBookingType] = useState<'carrier' | 'scheduled' | 'date'>('scheduled');

  const scheduledTripsByDate = tripHistory.reduce((acc, trip) => {
    const tripDate = new Date(trip.departureDate);
    // Use date-fns for consistent date formatting
    const dateKey = format(tripDate, 'yyyy-MM-dd');
    
    if (!acc[dateKey]) {
      acc[dateKey] = {
        displayDate: format(tripDate, 'EEEE, d MMMM yyyy', { locale: arEG }),
        trips: []
      };
    }
    acc[dateKey].trips.push(trip);
    return acc;
  }, {} as Record<string, { displayDate: string, trips: typeof tripHistory }>);

  return (
    <AppLayout>
      <div className="container mx-auto p-0 md:p-4">
        <Card className="w-full shadow-lg rounded-none md:rounded-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              ابدأ رحلتك
            </CardTitle>
            <CardDescription>
              اختر وجهتك وحدد تفاصيل رحلتك بسهولة.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              {/* Origin and Destination */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="origin-country">من</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر دولة الانطلاق" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="syria">سوريا</SelectItem>
                      <SelectItem value="jordan">الأردن</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر مدينة الانطلاق" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="damascus">دمشق</SelectItem>
                      <SelectItem value="amman">عمّان</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="destination-country">إلى</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر دولة الوصول" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jordan">الأردن</SelectItem>
                      <SelectItem value="syria">سوريا</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر مدينة الوصول" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amman">عمّان</SelectItem>
                       <SelectItem value="damascus">دمشق</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seats */}
              <div className="grid gap-2">
                <Label htmlFor="seats">عدد المقاعد</Label>
                <Select>
                  <SelectTrigger id="seats">
                    <SelectValue placeholder="اختر عدد المقاعد" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 9 }, (_, i) => i + 1).map(num => (
                      <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Booking Philosophy */}
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-1">
                 <Button variant={bookingType === 'carrier' ? 'default' : 'ghost'} onClick={() => setBookingType('carrier')} className={cn("flex-col h-auto p-2 text-xs", bookingType === 'carrier' && "bg-primary text-primary-foreground")}>
                    <User className="w-5 h-5 mb-1" />
                    <span>ناقل محدد</span>
                </Button>
                <Button variant={bookingType === 'scheduled' ? 'default' : 'ghost'} onClick={() => setBookingType('scheduled')} className={cn("flex-col h-auto p-2 text-xs", bookingType === 'scheduled' && "bg-primary text-primary-foreground")}>
                    <CalendarDays className="w-5 h-5 mb-1" />
                    <span>رحلات مجدولة</span>
                </Button>
                 <Button variant={bookingType === 'date' ? 'default' : 'ghost'} onClick={() => setBookingType('date')} className={cn("flex-col h-auto p-2 text-xs", bookingType === 'date' && "bg-primary text-primary-foreground")}>
                    <Calendar className="w-5 h-5 mb-1" />
                    <span>بتاريخ محدد</span>
                </Button>
              </div>

              {/* Conditional UI */}
              <div className="mt-4">
                {bookingType === 'carrier' && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input placeholder="ابحث عن ناقل بالاسم أو رقم الهاتف..." className="pl-10" />
                  </div>
                )}
                
                {bookingType === 'date' && (
                   <div className="grid gap-2">
                    <Label htmlFor="specific-date">اختر تاريخ السفر</Label>
                    <Input id="specific-date" type="date" />
                  </div>
                )}

                {bookingType === 'scheduled' && (
                  <Accordion type="single" collapsible className="w-full">
                    {Object.keys(scheduledTripsByDate).length > 0 ? (
                      Object.entries(scheduledTripsByDate).map(([dateKey, { displayDate, trips }], index) => (
                        <AccordionItem value={`item-${index}`} key={dateKey}>
                          <AccordionTrigger>
                            <div className="flex items-center justify-between w-full">
                              <span>{displayDate}</span>
                              <Badge variant="secondary">{trips.length} رحلات</Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                             <div className="space-y-4 p-2">
                                {trips.map(trip => (
                                  <TripCard key={trip.id} trip={trip} />
                                ))}
                             </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))
                    ) : (
                       <div className="text-center text-muted-foreground py-8">
                          <p>لا توجد رحلات مجدولة في هذا التاريخ.</p>
                          <p className="text-sm mt-2">يمكنك إكمال الحجز لنشر طلبك للناقلين.</p>
                       </div>
                    )}
                  </Accordion>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between mt-4">
                  <Button variant="outline">إلغاء العملية</Button>
                  <Button asChild>
                    <Link href="/login">تكملة الحجز</Link>
                  </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
