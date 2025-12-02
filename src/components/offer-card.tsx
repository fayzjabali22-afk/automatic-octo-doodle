
'use client';

import type { Offer, CarrierProfile, Trip } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { HandCoins, MessageCircle, Star, ThumbsUp, Car, Calendar, Users, Percent, Send, Loader2 } from 'lucide-react';
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
        )
    }

    return (
        <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-accent">
              {carrierImage && <AvatarImage src={carrierImage.imageUrl} alt={carrier?.name} />}
              <AvatarFallback>{carrier?.name?.charAt(0) || 'C'}</AvatarFallback>
            </Avatar>
            <div>
                <p className="font-bold text-md text-white">{carrier?.name || 'ناقل غير معروف'}</p>
                <div className="flex items-center text-xs text-muted-foreground gap-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    <span>{carrier?.averageRating || 'جديد'}</span>
                </div>
            </div>
        </div>
    )
}

export function OfferCard({ offer, trip, onAccept, isAccepting }: OfferCardProps) {
  
  const handleAcceptClick = () => {
    onAccept();
  };
  
  const depositAmount = offer.price * ((offer.depositPercentage || 20) / 100);
  const vehicleImage = PlaceHolderImages.find((img) => img.id === 'car-placeholder');


  return (
    
        <Card className="w-full overflow-hidden shadow-lg transition-all hover:shadow-primary/20 border-2 border-border/60 flex flex-col justify-between" style={{backgroundColor: '#13060A'}}>
            <CardHeader>
                <CarrierInfo carrierId={offer.carrierId} />
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
                        <p><strong>النوع:</strong> {offer.vehicleType || 'غير محدد'}</p>
                        <p><strong>سنة الصنع:</strong> {offer.vehicleModelYear || 'غير محدد'}</p>
                        <p><strong>الفئة:</strong> {offer.vehicleCategory || 'غير محدد'}</p>
                        <p><strong>المقاعد:</strong> {offer.availableSeats || 'غير محدد'}</p>
                    </div>
                </div>

                 <div className="text-sm text-foreground p-3 bg-background/50 rounded-md border border-dashed border-border space-y-2">
                    <p className='flex items-center gap-2 font-bold'><HandCoins className="h-4 w-4 text-accent" /> تفاصيل السعر:</p>
                     <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pl-6">
                        <p><strong>السعر الإجمالي:</strong> {offer.price} JOD</p>
                        <p><strong>العربون ({offer.depositPercentage || 20}%):</strong> {depositAmount.toFixed(2)} JOD</p>
                    </div>
                </div>

              {offer.notes && (
                <div className="text-sm text-muted-foreground p-3 bg-background/50 rounded-md border border-dashed border-border">
                    <p className='flex gap-2'><MessageCircle className="h-4 w-4 mt-0.5" /> <strong>إضافات:</strong></p>
                    <p>{offer.notes}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex p-2 bg-background/30">
                <Button className="w-full" onClick={handleAcceptClick} disabled={isAccepting}>
                    {isAccepting ? (
                        <>
                            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                            جاري الإرسال...
                        </>
                    ) : (
                        <>
                            <Send className="ml-2 h-4 w-4" />
                            إرسال طلب الحجز
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>

    
  );
}

    

    