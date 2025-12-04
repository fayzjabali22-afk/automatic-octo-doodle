'use client';

import type { Offer, CarrierProfile, Trip } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { HandCoins, Star, Car, Loader2, MessageSquarePlus, Send, ListChecks } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Skeleton } from './ui/skeleton';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import React, { useMemo } from 'react';

interface OfferCardProps {
  offer: Offer;
  trip: Trip;
  onAccept: () => void;
  isAccepting: boolean;
}

const formatCurrency = (value: number | undefined) => {
    if (typeof value !== 'number' || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('ar-JO', {
        style: 'currency',
        currency: 'JOD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const CarrierInfo = React.memo(({ carrierId }: { carrierId: string }) => {
  const firestore = useFirestore();
  const carrierRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'carriers', carrierId);
  }, [firestore, carrierId]);

  const { data: carrier, isLoading } = useDoc<CarrierProfile>(carrierRef);
  const carrierImage = PlaceHolderImages.find((img) => img.id === 'user-avatar');

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-4 w-[100px]" />
        </div>
      </div>
    );
  }
  
  const rating = carrier?.averageRating ? carrier.averageRating.toFixed(1) : 'جديد';

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-12 w-12 border-2 border-accent">
        {carrierImage && (
          <AvatarImage
            src={carrierImage.imageUrl}
            alt={carrier?.name || 'Carrier Avatar'}
            unoptimized
          />
        )}
        <AvatarFallback>{carrier?.name?.charAt(0) || 'C'}</AvatarFallback>
      </Avatar>
      <div>
        <p className="font-bold text-md text-foreground">
          {carrier?.name || 'ناقل غير معروف'}
        </p>
        <div className="flex items-center text-xs text-muted-foreground gap-1">
          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" aria-hidden="true" />
          <span>{rating}</span>
        </div>
      </div>
    </div>
  );
});
CarrierInfo.displayName = 'CarrierInfo';


export function OfferCard({ offer, trip, onAccept, isAccepting }: OfferCardProps) {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const handleBookNow = () => {
      onAccept();
  }

  const depositAmount = Math.max(0, (offer.price || 0) * ((offer.depositPercentage || 20) / 100));
  const vehicleImage = PlaceHolderImages.find((img) => img.id === 'car-placeholder');

  return (
    <Card dir="rtl" className="w-full overflow-hidden shadow-lg transition-all hover:shadow-primary/20 border-2 border-border/60 flex flex-col justify-between bg-card">
      <CardHeader>
        <CarrierInfo carrierId={offer.carrierId} />
      </CardHeader>
      <CardContent className="space-y-4">
        {vehicleImage && (
          <div className="relative aspect-video w-full overflow-hidden rounded-md">
            <Image
              src={vehicleImage.imageUrl}
              alt="Vehicle Image"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}

        <div className="text-sm text-foreground p-3 bg-background/50 rounded-md border border-dashed border-border space-y-2">
          <p className="flex items-center gap-2 font-bold">
            <Car className="h-4 w-4 text-accent" aria-hidden="true" /> تفاصيل المركبة:
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs ps-6">
            <div>
              <dt className="font-semibold">النوع:</dt>
              <dd>{offer.vehicleType ?? 'غير محدد'}</dd>
            </div>
            <div>
              <dt className="font-semibold">سنة الموديل:</dt>
              <dd>{offer.vehicleModelYear ?? 'غير محدد'}</dd>
            </div>
            <div>
              <dt className="font-semibold">الفئة:</dt>
              <dd>{offer.vehicleCategory ?? 'غير محدد'}</dd>
            </div>
            <div>
              <dt className="font-semibold">المقاعد:</dt>
              <dd>{offer.availableSeats ?? 'غير محدد'}</dd>
            </div>
          </dl>
        </div>

        <div className="text-sm text-foreground p-3 bg-background/50 rounded-md border border-dashed border-border space-y-2">
            <p className='flex items-center gap-2 font-bold'>
                <HandCoins className="h-4 w-4 text-accent" aria-hidden="true" /> تفاصيل السعر:
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs ps-6">
                <div>
                    <dt className="font-semibold">السعر الكلي:</dt>
                    <dd>{formatCurrency(offer.price)}</dd>
                </div>
                 <div>
                    <dt className="font-semibold">العربون ({offer.depositPercentage ?? 20}%):</dt>
                    <dd>{formatCurrency(depositAmount)}</dd>
                </div>
            </dl>
        </div>

        {offer.conditions && (
          <div className="text-sm text-foreground p-3 bg-background/50 rounded-md border border-dashed border-border space-y-2">
            <p className='flex items-center gap-2 font-bold'><ListChecks className="h-4 w-4 text-accent" /> شروط الناقل:</p>
            <p className="text-xs ps-6 whitespace-pre-wrap">{offer.conditions}</p>
          </div>
        )}

        {offer.notes && (
          <div className="text-sm text-muted-foreground p-3 bg-background/50 rounded-md border border-dashed border-border space-y-2">
              <p className='flex gap-2 font-semibold text-foreground'>
                  ملاحظات الناقل:
              </p>
              <p className="ps-2">{offer.notes}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex p-2 bg-background/30">
          <Button className="w-full" onClick={handleBookNow} disabled={isAccepting}>
              {isAccepting ? (
                  <>
                      <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                      جاري إرسال طلب التأكيد...
                  </>
              ) : (
                  <>
                      <Send className="ms-2 h-4 w-4" />
                      قبول وإرسال طلب تأكيد
                  </>
              )}
          </Button>
      </CardFooter>
    </Card>
  );
}
