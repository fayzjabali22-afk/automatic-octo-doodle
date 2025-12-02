'use client';

import type { CarrierProfile, Trip } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from '@/components/ui/card';
import {
  Car,
  Star,
  Users,
  Percent,
  HandCoins,
  Info,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Skeleton } from './ui/skeleton';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Badge } from './ui/badge';
import Image from 'next/image';


const cities: { [key: string]: string } = {
    damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص',
    amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
    riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام',
    cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة',
    dubai: 'دبي', kuwait: 'الكويت'
};

const CarrierInfo = ({ carrierId, carrierName }: { carrierId: string; carrierName?: string; }) => {
  const firestore = useFirestore();
  const carrierRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'carriers', carrierId);
  }, [firestore, carrierId]);

  const { data: carrier, isLoading } = useDoc<CarrierProfile>(carrierRef);
  const carrierImage = PlaceHolderImages.find(
    (img) => img.id === 'user-avatar'
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-3 w-[80px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-10 w-10 border-2 border-accent">
        {carrierImage && (
          <AvatarImage src={carrierImage.imageUrl} alt={carrier?.name} />
        )}
        <AvatarFallback>{carrier?.name?.charAt(0) || 'C'}</AvatarFallback>
      </Avatar>
      <div>
        <p className="font-bold text-sm text-white">{carrier?.name || carrierName}</p>
        <div className="flex items-center text-xs text-muted-foreground gap-1">
          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
          <span>{carrier?.averageRating || 'جديد'}</span>
        </div>
      </div>
    </div>
  );
};

export function ScheduledTripCard({ trip }: { trip: Trip }) {
  const depositAmount = (trip.price || 0) * ((trip.depositPercentage || 0) / 100);
  const vehicleImage = PlaceHolderImages.find((img) => img.id === 'car-placeholder');

  return (
    <Card className="w-full overflow-hidden shadow-lg transition-all hover:shadow-primary/20 border-2 border-border/60 flex flex-col justify-between" style={{ backgroundColor: '#13060A' }}>
      <CardHeader>
        {trip.carrierId && <CarrierInfo carrierId={trip.carrierId} carrierName={trip.carrierName} />}
        <div className="flex justify-between items-center pt-2">
            <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(trip.departureDate).toLocaleDateString('ar-SA')}
            </Badge>
            <div className="flex items-center gap-2 text-sm font-bold">
               <span>{cities[trip.origin]}</span>
               <ArrowRight className="h-4 w-4 text-primary"/>
               <span>{cities[trip.destination]}</span>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {vehicleImage && (
            <div className="relative aspect-video w-full overflow-hidden rounded-md">
                <Image 
                    src={vehicleImage.imageUrl}
                    alt="صورة المركبة" 
                    fill
                    className="object-cover"
                />
            </div>
        )}
        <div className="text-sm text-foreground p-3 bg-background/50 rounded-md border border-dashed border-border space-y-2">
            <p className='flex items-center gap-2 font-bold'><Car className="h-4 w-4 text-accent" /> بيانات المركبة:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pl-6">
                <p><strong>النوع:</strong> {trip.vehicleType || 'غير محدد'}</p>
                <p><strong>المقاعد المتاحة:</strong> {trip.availableSeats || 'غير محدد'}</p>
            </div>
        </div>
        <div className="text-sm text-foreground p-3 bg-background/50 rounded-md border border-dashed border-border space-y-2">
            <p className='flex items-center gap-2 font-bold'><HandCoins className="h-4 w-4 text-accent" /> تفاصيل السعر:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pl-6">
                <p><strong>السعر الإجمالي:</strong> {trip.price} JOD</p>
                <p><strong>العربون ({trip.depositPercentage || 0}%):</strong> {depositAmount.toFixed(2)} JOD</p>
            </div>
        </div>
      </CardContent>
      <CardFooter className="flex p-2 bg-background/30 gap-2">
        <Button size="sm" className="w-full">
            حجز الآن
        </Button>
      </CardFooter>
    </Card>
  );
}
