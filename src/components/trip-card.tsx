
import type { Trip } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, DollarSign, MapPin, Users, Calendar } from 'lucide-react';
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
        <div className="grid grid-cols-[auto_1fr_auto] items-start gap-4">
          {/* Carrier Avatar */}
          <Avatar className="h-16 w-16 border-2 border-primary">
            {carrierImage && <AvatarImage src={carrierImage.imageUrl} alt="Carrier" />}
            <AvatarFallback>N</AvatarFallback>
          </Avatar>

          {/* Trip Details */}
          <div className="space-y-2">
            <p className="font-bold text-lg">اسم الناقل</p>
            <div className="flex items-center text-sm text-muted-foreground gap-2">
              <MapPin className="h-4 w-4" />
              <span>نقطة الانطلاق: {trip.origin}</span>
            </div>
             <div className="flex items-center text-sm text-muted-foreground gap-2">
              <Calendar className="h-4 w-4" />
              <span>{new Date(trip.departureDate).toLocaleDateString('ar-EG')}</span>
            </div>
          </div>

          {/* Price */}
          <div className="flex flex-col items-end gap-1">
             <div className="flex items-center gap-1 font-bold text-primary text-xl">
                <span>50</span>
                <DollarSign className="h-5 w-5" />
            </div>
             <p className="text-xs text-muted-foreground">للمقعد</p>
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
                <span>4 مقاعد متاحة</span>
            </div>
            <Button asChild size="sm">
              <Link href="/login">تفاصيل</Link>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
