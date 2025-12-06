'use client';

import type { UserProfile, Trip, Booking } from '@/lib/data';
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
  Calendar,
  ArrowRight,
  HandCoins,
  CheckCircle,
  Clock,
  XCircle,
  Flag,
  Ban,
  ListChecks,
  MessageSquare,
  Search,
  MapPin,
  Link as LinkIcon
} from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Skeleton } from './ui/skeleton';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Badge } from './ui/badge';
import Image from 'next/image';
import { format, isFuture } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';

// Helper to safely format dates and time
const safeDateTimeFormat = (dateInput: any): string => {
  if (!dateInput) return 'N/A';
  try {
    const dateObj = typeof dateInput.toDate === 'function' ? dateInput.toDate() : new Date(dateInput);
    return format(dateObj, "d MMM, h:mm a");
  } catch (error) {
    console.error("Date formatting error:", error);
    return 'Invalid Date';
  }
};

const cities: { [key: string]: string } = {
  damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص',
  amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
  riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام',
  cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة',
  dubai: 'دبي', kuwait: 'الكويت'
};

const getCityName = (key: string) => {
    if (!key) return 'Unknown';
    const lowerKey = key.toLowerCase();
    return cities[lowerKey] || key; // Return mapped name or original if not found
};

const statusMap: Record<string, { text: string; icon: React.ElementType; color: string }> = {
  'Confirmed': { text: 'مؤكدة', icon: CheckCircle, color: 'text-green-500' },
  'Completed': { text: 'مكتملة', icon: CheckCircle, color: 'text-blue-500' },
  'Cancelled': { text: 'ملغاة', icon: XCircle, color: 'text-red-500' },
  'In-Transit': { text: 'قيد التنفيذ', icon: Clock, color: 'text-yellow-500' },
};

const CarrierInfo = ({ carrierId, carrierName }: { carrierId?: string; carrierName?: string; }) => {
  const firestore = useFirestore();
  const carrierRef = useMemo(() => {
    if (!firestore || !carrierId) return null;
    return doc(firestore, 'users', carrierId);
  }, [firestore, carrierId]);

  const { data: carrier, isLoading } = useDoc<UserProfile>(carrierRef);
  
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
  
  const name = carrier?.firstName || carrierName || "ناقل غير معروف";
  const displayImage = carrier?.vehicleImageUrls?.[0];

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-10 w-10 border-2 border-accent">
        {displayImage && <AvatarImage src={displayImage} alt={name} />}
        <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div>
        <p className="font-bold text-sm text-foreground">{name}</p>
        <div className="flex items-center text-xs text-muted-foreground gap-1">
          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
          <span>{carrier?.averageRating ? carrier.averageRating.toFixed(1) : 'جديد'}</span>
        </div>
      </div>
    </div>
  );
};

export function ScheduledTripCard({ 
    trip,
    booking,
    onBookNow, 
    onClosureAction,
    onCancelBooking,
    onMessageCarrier,
    context = 'dashboard' 
}: { 
    trip: Trip; 
    booking?: Booking;
    onBookNow: (trip: Trip) => void; 
    onClosureAction?: (trip: Trip) => void;
    onCancelBooking?: (trip: Trip, booking: Booking) => void;
    onMessageCarrier?: (booking: Booking, trip: Trip) => void;
    context?: 'dashboard' | 'history' 
}) {
  const depositAmount = (trip.price || 0) * ((trip.depositPercentage || 0) / 100);
  
  const defaultCarImage = PlaceHolderImages.find((img) => img.id === 'car-placeholder');
  const vehicleImageUrl = trip.vehicleImageUrls && trip.vehicleImageUrls.length > 0 ? trip.vehicleImageUrls[0] : defaultCarImage?.imageUrl;

  const StatusComponent = booking?.status ? statusMap[booking.status] : null;
  const isMessageable = context === 'history' && booking?.status === 'Confirmed';
  
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    // This runs only on the client, after hydration
    setFormattedDate(safeDateTimeFormat(trip.departureDate));
  }, [trip.departureDate]);


  return (
    <Card className="w-full overflow-hidden shadow-lg transition-all hover:shadow-primary/20 border-2 border-border/60 flex flex-col justify-between bg-card">
      <CardHeader>
         <CarrierInfo carrierId={trip.carrierId} carrierName={trip.carrierName} />
        
        <div className="flex justify-between items-center pt-2">
            <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formattedDate ? formattedDate : <Skeleton className="h-4 w-20" />}
            </Badge>
            <div className="flex items-center gap-2 text-sm font-bold">
               {getCityName(trip.origin)}
               <ArrowRight className="h-4 w-4 text-primary"/>
               {getCityName(trip.destination)}
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow">
        {vehicleImageUrl && (
            <div className="relative aspect-video w-full overflow-hidden rounded-md">
                <Image 
                    src={vehicleImageUrl}
                    alt="Vehicle image" 
                    fill
                    className="object-cover transition-transform hover:scale-105 duration-500"
                    unoptimized
                />
            </div>
        )}
        
        {trip.meetingPoint && (
          <div className="text-sm text-foreground p-3 bg-background/50 rounded-md border border-dashed border-border space-y-2">
              <p className='flex items-center gap-2 font-bold'><MapPin className="h-4 w-4 text-accent" /> نقطة وتوقيت الانطلاق:</p>
              <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs ps-6">
                  <p>{trip.meetingPoint}</p>
                  {trip.meetingPointLink && (
                    <Link href={trip.meetingPointLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
                      <LinkIcon className="h-3 w-3" />
                      عرض على الخريطة
                    </Link>
                  )}
              </div>
          </div>
        )}

        <div className="text-sm text-foreground p-3 bg-background/50 rounded-md border border-dashed border-border space-y-2">
            <p className='flex items-center gap-2 font-bold'><Car className="h-4 w-4 text-accent" /> تفاصيل المركبة:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs ps-6">
                <p><strong>النوع:</strong> {trip.vehicleType || 'N/A'}</p>
                <p><strong>المقاعد المتاحة:</strong> {trip.availableSeats ?? 'N/A'}</p>
            </div>
        </div>
        <div className="text-sm text-foreground p-3 bg-background/50 rounded-md border border-dashed border-border space-y-2">
            <p className='flex items-center gap-2 font-bold'><HandCoins className="h-4 w-4 text-accent" /> تفاصيل السعر:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs ps-6">
                <p><strong>السعر الكلي للمقعد:</strong> {trip.price} {trip.currency}</p>
                {trip.depositPercentage && <p><strong>العربون ({trip.depositPercentage || 0}%):</strong> {depositAmount.toFixed(2)} {trip.currency}</p>}
            </div>
        </div>
        {trip.conditions && trip.conditions.trim() !== '' && (
            <div className="text-sm text-foreground p-3 bg-background/50 rounded-md border border-dashed border-border space-y-2">
                <p className='flex items-center gap-2 font-bold'><ListChecks className="h-4 w-4 text-accent" /> شروط الناقل:</p>
                <p className="text-xs ps-6 whitespace-pre-wrap">{trip.conditions}</p>
            </div>
        )}
         {context === 'history' && StatusComponent && (
            <div className={cn("text-sm font-bold p-3 rounded-md border border-dashed flex items-center justify-center gap-2", StatusComponent.color)}>
                <StatusComponent.icon className="h-5 w-5" />
                <span>{StatusComponent.text}</span>
            </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col p-2 bg-background/30 gap-2">
          {context === 'dashboard' && (
            <Button size="sm" className="w-full" onClick={() => onBookNow(trip)}>
                حجز الآن
            </Button>
          )}
          {context === 'history' && onClosureAction && trip && (
            <Button size="sm" variant="default" className="w-full bg-accent hover:bg-accent/90" onClick={() => onClosureAction(trip)}>
                <Flag className="ml-2 h-4 w-4"/>
                إجراءات إغلاق الرحلة
            </Button>
          )}
          {context === 'history' && onCancelBooking && booking && (
              <Button size="sm" variant="destructive" className="w-full" onClick={() => onCancelBooking(trip, booking)}>
                  <Ban className="ml-2 h-4 w-4" />
                  إلغاء الحجز
              </Button>
          )}
          {isMessageable && onMessageCarrier && booking &&(
              <Button size="sm" variant="outline" className="w-full" onClick={() => onMessageCarrier(booking, trip)}>
                  <MessageSquare className="ml-2 h-4 w-4" />
                  مراسلة الناقل
              </Button>
          )}
      </CardFooter>
    </Card>
  );
}
