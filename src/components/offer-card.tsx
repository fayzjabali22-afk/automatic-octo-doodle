'use client';

import type { Offer, CarrierProfile, Trip } from '@/lib/data';
import { mockCarriers } from '@/lib/data'; // Import mock carriers
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { HandCoins, MessageCircle, Star, ThumbsUp } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { useState } from 'react';
import { LegalDisclaimerDialog } from './legal-disclaimer-dialog';

interface OfferCardProps {
  offer: Offer;
  trip: Trip;
  onAccept: (offer: Offer, trip: Trip) => void;
}

const CarrierInfo = ({ carrierId }: { carrierId: string }) => {
    // MOCK DATA USAGE: Find carrier from mockCarriers array
    const carrier = mockCarriers.find(c => c.id === carrierId);
    const isLoading = false; // Mock data is never loading
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
                <p className="font-bold text-md text-foreground">{carrier?.name || 'ناقل غير معروف'}</p>
                <div className="flex items-center text-xs text-muted-foreground gap-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    <span>{carrier?.averageRating || 'جديد'}</span>
                </div>
            </div>
        </div>
    )
}

export function OfferCard({ offer, trip, onAccept }: OfferCardProps) {
  const { toast } = useToast();
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  
  const handleAcceptClick = () => {
    // Instead of directly calling onAccept, we now open the legal disclaimer first.
    setIsDisclaimerOpen(true);
  };

  const handleDisclaimerContinue = () => {
    // This is the final step in this flow for now.
    // It confirms the whole path is working.
    setIsDisclaimerOpen(false);
    toast({
        title: "تم الإقرار.",
        description: "سيتم الآن فتح بطاقة الحجز...",
    });
    // In a future step, we will navigate to the unified booking screen from here.
    // For now, we can still call the original onAccept for UI simulation if needed,
    // or replace it entirely once the booking screen is ready.
    // onAccept(offer, trip); 
  };
  
  return (
    <>
        <Card className="w-full overflow-hidden shadow-lg transition-all hover:shadow-primary/20 border-2 border-border/60 flex flex-col justify-between bg-card/70">
            <CardHeader>
                <CarrierInfo carrierId={offer.carrierId} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center items-baseline gap-2 text-3xl font-bold text-accent">
                  <HandCoins className="h-8 w-8" />
                  <span>{offer.price}</span>
                  <span className="text-lg font-normal text-muted-foreground">JOD</span>
              </div>

              {offer.notes && (
                <div className="text-sm text-muted-foreground p-3 bg-background/50 rounded-md border border-dashed border-border">
                    <p className='flex gap-2'><MessageCircle className="h-4 w-4 mt-0.5" /> <strong>ملاحظات الناقل:</strong></p>
                    <p>{offer.notes}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex p-2 bg-background/30">
                <Button size="lg" className="w-full bg-[#B19C7D] hover:bg-[#a18c6d] text-white border-2 border-white" onClick={handleAcceptClick}>
                    <ThumbsUp className="ml-2 h-4 w-4" />
                    قبول وتأكيد الحجز
                </Button>
            </CardFooter>
        </Card>

        <LegalDisclaimerDialog 
            isOpen={isDisclaimerOpen}
            onOpenChange={setIsDisclaimerOpen}
            onContinue={handleDisclaimerContinue}
        />
    </>
  );
}
