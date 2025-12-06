'use client';

import type { Offer, UserProfile, Trip } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { HandCoins, Star, Car, Loader2, ListChecks, Send } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Skeleton } from './ui/skeleton';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import Image from 'next/image';
import React, { useMemo } from 'react';

interface OfferCardProps {
  offer: Offer;
  trip: Trip;
  onAccept: () => void;
  isAccepting: boolean;
}

const formatCurrency = (value: number | undefined, currency: string = 'JOD') => {
    if (typeof value !== 'number' || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('ar-JO', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};


export function OfferCard({ offer, trip, onAccept, isAccepting }: OfferCardProps) {
  const depositAmount = Math.max(0, (offer.price || 0) * ((offer.depositPercentage || 20) / 100));
  const defaultVehicleImage = PlaceHolderImages.find((img) => img.id === 'car-placeholder');
  const firestore = useFirestore();
  
  const carrierRef = useMemo(() => {
    if (!firestore || !offer.carrierId) return null;
    return doc(firestore, 'users', offer.carrierId);
  }, [firestore, offer.carrierId]);
  
  const { data: carrier, isLoading: isCarrierLoading } = useDoc<UserProfile>(carrierRef);
  const vehicleImage = (carrier?.vehicleImageUrls && carrier.vehicleImageUrls[0]) || defaultVehicleImage?.imageUrl;

  const CarrierInfo = () => {
    if (isCarrierLoading) {
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
    
    if (!carrier) return <p>ناقل غير معروف</p>;

    return (
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border">
                    <AvatarImage src={(carrier as any).photoURL} alt={carrier.firstName} />
                    <AvatarFallback>{carrier.firstName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <p className="font-bold text-sm text-foreground">{carrier.firstName}</p>
            </div>
            <div className="flex items-center text-xs text-muted-foreground gap-1">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="font-bold">{carrier.averageRating ? carrier.averageRating.toFixed(1) : 'جديد'}</span>
            </div>
        </div>
    );
  };

  return (
    <div dir="rtl" className="w-full overflow-hidden transition-all flex flex-col justify-between bg-card">
      <div className="space-y-4">
        {vehicleImage && (
          <div className="relative aspect-video w-full overflow-hidden rounded-md">
            <Image
              src={vehicleImage}
              alt="Vehicle Image"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        
        <div className="p-3">
            <CarrierInfo />
        </div>

        <div className="text-sm text-foreground p-3 bg-background/50 rounded-md border border-dashed border-border space-y-2">
          <p className="flex items-center gap-2 font-bold">
            <Car className="h-4 w-4 text-accent" aria-hidden="true" /> تفاصيل المركبة:
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs ps-6">
            <div>
              <dt className="font-semibold">النوع:</dt>
              <dd>{offer.vehicleType ?? 'غير محدد'}</dd>
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
                    <dd>{formatCurrency(offer.price, offer.currency)}</dd>
                </div>
                 <div>
                    <dt className="font-semibold">العربون ({offer.depositPercentage ?? 20}%):</dt>
                    <dd>{formatCurrency(depositAmount, offer.currency)}</dd>
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
      </div>
      <div className="flex p-2 pt-4 bg-background/30">
          <Button className="w-full" onClick={onAccept} disabled={isAccepting}>
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
      </div>
    </div>
  );
}
