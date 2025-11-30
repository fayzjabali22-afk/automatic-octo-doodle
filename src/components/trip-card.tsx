
import type { Trip } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, DollarSign, MapPin, Users, Calendar, Phone, Car, Tag } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';

interface TripCardProps {
  trip: Trip;
}

export function TripCard({ trip }: TripCardProps) {
  const carrierImage = PlaceHolderImages.find((img) => img.id === 'user-avatar');
  const departureTime = new Date(trip.departureDate).toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card className="w-full overflow-hidden shadow-md transition-shadow hover:shadow-lg">
      <CardContent className="p-4">
        <div className="grid grid-cols-[auto_1fr_auto] items-start gap-x-4 gap-y-2">
          {/* Carrier Avatar */}
          <Avatar className="h-16 w-16 border-2 border-primary row-span-2">
            {carrierImage && <AvatarImage src={carrierImage.imageUrl} alt={trip.carrierName} />}
            <AvatarFallback>{trip.carrierName.charAt(0)}</AvatarFallback>
          </Avatar>

          {/* Carrier & Trip Details */}
          <div className="space-y-1">
            <p className="font-bold text-lg">{trip.carrierName}</p>
            <div className="flex items-center text-sm text-muted-foreground gap-2">
              <Phone className="h-4 w-4" />
              <span>{trip.carrierPhoneNumber}</span>
            </div>
             <div className="flex items-center text-sm text-muted-foreground gap-2">
              <MapPin className="h-4 w-4" />
              <span>نقطة الانطلاق: {trip.origin}</span>
            </div>
          </div>

          {/* Price */}
          <div className="flex flex-col items-end gap-1 row-span-2 text-center">
             <div className="flex items-center gap-1 font-bold text-primary text-xl">
                <span>50</span>
                <DollarSign className="h-5 w-5" />
            </div>
             <p className="text-xs text-muted-foreground">للمقعد</p>
          </div>

           {/* Vehicle Details */}
          <div className="col-start-2 space-y-1">
             <div className="flex items-center text-sm text-muted-foreground gap-2">
                <Car className="h-4 w-4" />
                <span>{trip.vehicleType}</span>
            </div>
             <div className="flex items-center text-sm text-muted-foreground gap-2">
                <Tag className="h-4 w-4" />
                <span>موديل {trip.vehicleModelYear}</span>
            </div>
          </div>

        </div>


        <div className="border-t my-4" />

        <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4"/>
                <span>{departureTime}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4"/>
                <span>{trip.availableSeats} مقاعد متاحة</span>
            </div>
            <Button asChild size="sm">
              <Link href="/login">تفاصيل</Link>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
