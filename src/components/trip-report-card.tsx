
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  ArrowLeftRight,
  Bus,
  Calendar,
  Car,
  CreditCard,
  Hash,
  Mail,
  Percent,
  Phone,
  Star,
  User,
  Users,
} from 'lucide-react';
import type { Trip, Booking, Offer, CarrierProfile } from '@/lib/data';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const cities: { [key: string]: string } = {
    damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص',
    amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
    riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام',
    cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة',
    dubai: 'دبي', kuwait: 'الكويت'
};

const bookingStatusMap: { [key: string]: { text: string; icon: React.ReactNode; color: string } } = {
  'Pending-Payment': {
    text: 'بانتظار الدفع',
    icon: <CreditCard className="h-4 w-4" />,
    color: 'text-yellow-500',
  },
  'Confirmed': {
    text: 'مؤكد',
    icon: <CreditCard className="h-4 w-4" />,
    color: 'text-green-500',
  },
  // Add other statuses as needed
};

const CarrierInfo = ({ carrierId }: { carrierId: string }) => {
  const firestore = useFirestore();
  const carrierRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'carriers', carrierId);
  }, [firestore, carrierId]);

  const { data: carrier, isLoading } = useDoc<CarrierProfile>(carrierRef);
  const carrierImage = PlaceHolderImages.find((img) => img.id === 'user-avatar');

  if (isLoading) {
    return <Skeleton className="h-8 w-32" />;
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-10 w-10 border">
        {carrierImage && <AvatarImage src={carrierImage.imageUrl} alt={carrier?.name} />}
        <AvatarFallback>{carrier?.name?.charAt(0) || 'C'}</AvatarFallback>
      </Avatar>
      <div className="grid gap-0.5">
        <div className="font-semibold">{carrier?.name || 'ناقل غير معروف'}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span>{carrier?.contactEmail}</span>
            </div>
            <div className="flex items-center gap-1">
                 <Star className="h-3 w-3" />
                <span>{carrier?.averageRating || 'جديد'}</span>
            </div>
        </div>
      </div>
    </div>
  );
};

interface TripReportCardProps {
  trip: Trip;
  booking: Booking;
  offer: Offer;
}

export function TripReportCard({ trip, booking, offer }: TripReportCardProps) {

  const statusInfo = bookingStatusMap[booking.status] || { text: booking.status, icon: <AlertTriangle />, color: 'text-gray-500' };
  const depositAmount = offer.price * (offer.depositPercentage / 100);

  return (
    <div className="p-4 md:p-6">
    <Card className="overflow-hidden shadow-lg w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-start bg-muted/50 gap-4 p-4">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-primary/10 rounded-lg text-primary">
            <Bus className="h-6 w-6" />
           </div>
          <div className="grid gap-0.5">
            <CardTitle className="group flex items-center gap-2 text-lg">
              تقرير الحجز
            </CardTitle>
            <CardDescription>ملخص رحلتك المؤكدة. يرجى المتابعة للدفع.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 text-sm">
        <div className="grid gap-4">
          
          <div className={`flex items-center justify-center p-3 rounded-md bg-yellow-500/10 ${statusInfo.color}`}>
            {statusInfo.icon}
            <span className="font-semibold ml-2">{statusInfo.text}</span>
          </div>

          <Separator />
          
          <div className="font-semibold">تفاصيل الرحلة</div>
          <ul className="grid gap-3">
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2"><ArrowLeftRight className="h-4 w-4" /> المسار</span>
              <span>{cities[trip.origin] || trip.origin} → {cities[trip.destination] || trip.destination}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> تاريخ السفر</span>
              <span>{new Date(trip.departureDate).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> عدد الركاب</span>
              <span>{booking.seats}</span>
            </li>
             <li className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2"><Hash className="h-4 w-4" /> رقم الحجز</span>
              <span className="font-mono text-xs">{booking.id.substring(0, 8).toUpperCase()}</span>
            </li>
          </ul>

          <Separator />

          <div className="font-semibold">بيانات الناقل والمركبة</div>
          <div className="grid gap-3">
             <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2"><User className="h-4 w-4" /> الناقل</span>
                <CarrierInfo carrierId={offer.carrierId} />
             </div>
             <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2"><Car className="h-4 w-4" /> نوع المركبة</span>
                <span>{offer.vehicleType} ({offer.vehicleModelYear})</span>
             </div>
          </div>
          
          <Separator />

          <div className="font-semibold">التفاصيل المالية</div>
          <ul className="grid gap-3">
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">السعر الإجمالي</span>
              <span>{offer.price.toFixed(2)} JOD</span>
            </li>
             <li className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2"><Percent className="h-4 w-4" /> نسبة العربون</span>
              <span>{offer.depositPercentage}%</span>
            </li>
            <li className="flex items-center justify-between font-semibold">
              <span className="text-muted-foreground">المبلغ المطلوب للدفع</span>
              <span className="text-lg text-primary">{depositAmount.toFixed(2)} JOD</span>
            </li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 border-t bg-muted/50 px-6 py-4">
        <Button className="w-full">
            <CreditCard className="ml-2 h-4 w-4" />
            الانتقال إلى الدفع
        </Button>
         <Button variant="link" className="text-xs text-muted-foreground">إلغاء الحجز</Button>
      </CardFooter>
    </Card>
    </div>
  );
}
