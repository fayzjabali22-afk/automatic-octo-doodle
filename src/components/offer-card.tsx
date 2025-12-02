'use client';

import type { Offer, CarrierProfile, Trip } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { HandCoins, MessageCircle, Star, Car, Send, Loader2, MessageSquarePlus } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Skeleton } from './ui/skeleton';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import Image from 'next/image';

interface OfferCardProps {
  offer: Offer;
  trip: Trip;
  onAccept: () => void;
  isAccepting: boolean;
}

const CarrierInfo = ({ carrierId }: { carrierId: string }) => {
  const firestore = useFirestore();
  const carrierRef = useMemoFirebase(() => {
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
          {carrier?.name || 'Unknown Carrier'}
        </p>
        <div className="flex items-center text-xs text-muted-foreground gap-1">
          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" aria-hidden="true" />
          <span>{carrier?.averageRating || 'New'}</span>
        </div>
      </div>
    </div>
  );
};

export function OfferCard({ offer, trip, onAccept, isAccepting }: OfferCardProps) {
  const handleAcceptClick = () => {
    onAccept();
  };

  const depositAmount = (offer.price || 0) * ((offer.depositPercentage || 20) / 100);
  const vehicleImage = PlaceHolderImages.find((img) => img.id === 'car-placeholder');

  return (
    <Card className="w-full overflow-hidden shadow-lg transition-all hover:shadow-primary/20 border-2 border-border/60 flex flex-col justify-between bg-card">
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

        {/* Vehicle Details */}
        <div className="text-sm text-foreground p-3 bg-background/50 rounded-md border border-dashed border-border space-y-2">
          <p className="flex items-center gap-2 font-bold">
            <Car className="h-4 w-4 text-accent" aria-hidden="true" /> Vehicle Details:
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pl-6">
            <div>
              <dt className="font-semibold">Type:</dt>
              <dd>{offer.vehicleType || 'N/A'}</dd>
            </div>
            <div>
              <dt className="font-semibold">Model Year:</dt>
              <dd>{offer.vehicleModelYear || 'N/A'}</dd>
            </div>
            <div>
              <dt className="font-semibold">Category:</dt>
              <dd>{offer.vehicleCategory || 'N/A'}</dd>
            </div>
            <div>
              <dt className="font-semibold">Seats:</dt>
              <dd>{offer.availableSeats || 'N/A'}</dd>
            </div>
          </dl>
        </div>

        {/* Price Details */}
        <div className="text-sm text-foreground p-3 bg-background/50 rounded-md border border-dashed border-border space-y-2">
            <p className='flex items-center gap-2 font-bold'>
                <HandCoins className="h-4 w-4 text-accent" aria-hidden="true" /> Price Details:
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pl-6">
                <div>
                    <dt className="font-semibold">Total Price:</dt>
                    <dd>{offer.price} JOD</dd>
                </div>
                 <div>
                    <dt className="font-semibold">Deposit ({offer.depositPercentage || 20}%):</dt>
                    <dd>{depositAmount.toFixed(2)} JOD</dd>
                </div>
            </dl>
        </div>

        {offer.notes && (
          <div className="text-sm text-muted-foreground p-3 bg-background/50 rounded-md border border-dashed border-border">
              <p className='flex gap-2 font-semibold text-foreground'>
                  <MessageCircle className="h-4 w-4 mt-0.5" aria-hidden="true" /> Extras:
              </p>
              <p>{offer.notes}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex p-2 bg-background/30">
          <Button className="w-full" onClick={handleAcceptClick} disabled={isAccepting}>
              {isAccepting ? (
                  <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      جار المعالجة...
                  </>
              ) : (
                  <>
                      <MessageSquarePlus className="mr-2 h-4 w-4" />
                      بدء محادثة مع الناقل
                  </>
              )}
          </Button>
      </CardFooter>
    </Card>
  );
}

    