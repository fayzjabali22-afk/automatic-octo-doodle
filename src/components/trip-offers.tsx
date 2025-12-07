'use client';

import { useState, useMemo } from 'react';
import type { Offer, Trip, UserProfile } from '@/lib/data';
import { OfferCard } from '@/components/offer-card';
import { Skeleton } from '@/components/ui/skeleton';
import { PackageOpen, X } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';


interface TripOffersProps {
  trip: Trip;
  offers: Offer[];
  onAcceptOffer: (trip: Trip, offer: Offer) => void;
  isProcessing: boolean;
}

export function TripOffers({ trip, offers, onAcceptOffer, isProcessing }: TripOffersProps) {
  const firestore = useFirestore();
  const carrierIds = useMemo(() => offers?.map(o => o.carrierId) || [], [offers]);
  
  const carriersQuery = useMemo(() => {
    if (!firestore || carrierIds.length === 0) return null;
    return query(collection(firestore, 'users'), where('id', 'in', carrierIds));
  }, [firestore, carrierIds]);

  const { data: carriersData, isLoading: isLoadingCarriers } = useCollection<UserProfile>(carriersQuery);

  const activeCarriers = useMemo(() => {
    return carriersData?.filter(c => !c.isDeactivated) || [];
  }, [carriersData]);

  const activeOffers = useMemo(() => {
    const activeCarrierIds = new Set(activeCarriers.map(c => c.id));
    return offers.filter(offer => activeCarrierIds.has(offer.carrierId));
  }, [offers, activeCarriers]);

  const handleAcceptClick = async (offer: Offer) => {
    await onAcceptOffer(trip, offer);
  };
  
  const getCarrierName = (carrierId: string) => {
    if (isLoadingCarriers) return '...';
    const carrier = carriersData?.find(c => c.id === carrierId);
    return carrier?.firstName || 'ناقل غير معروف';
  }

  if (isProcessing) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (!activeOffers || activeOffers.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 col-span-full border-2 border-dashed rounded-lg bg-background/50">
        <PackageOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
        <p className="text-lg font-semibold">لا توجد عروض لهذا الطلب حتى الآن</p>
        <p className="text-sm mt-1 text-muted-foreground">سيتم إعلامك فور وصول عروض من الناقلين.</p>
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full space-y-3">
        {activeOffers.map((offer) => (
            <AccordionItem key={offer.id} value={offer.id} className='border rounded-lg bg-card/80'>
                <AccordionTrigger className='p-4 hover:no-underline'>
                    <div className='flex justify-between items-center w-full'>
                        <span className='font-bold text-sm'>عرض من: {getCarrierName(offer.carrierId)}</span>
                        <Badge variant={'outline'} className='font-bold text-base'>{offer.price.toFixed(2)} {offer.currency}</Badge>
                    </div>
                </AccordionTrigger>
                <AccordionContent className='p-4 pt-0'>
                     <OfferCard
                        offer={offer}
                        trip={trip}
                        onAccept={() => handleAcceptClick(offer)}
                        isAccepting={isProcessing}
                    />
                </AccordionContent>
            </AccordionItem>
        ))}
    </Accordion>
  );
}
