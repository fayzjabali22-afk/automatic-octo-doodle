'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore'; // Added orderBy for better sorting
import type { Offer, Trip } from '@/lib/data';
import { OfferCard } from '@/components/offer-card';
import { Skeleton } from '@/components/ui/skeleton';
import { PackageOpen } from 'lucide-react';
// Removed unused useToast import

interface TripOffersProps {
  trip: Trip;
  onAcceptOffer: (offer: Offer) => void;
}

export function TripOffers({ trip, onAcceptOffer }: TripOffersProps) {
  const firestore = useFirestore();
  // State to track which offer is currently being processed
  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null);

  const offersQuery = useMemoFirebase(() => {
    if (!firestore || !trip?.id) return null;
    // Added orderBy to show newest offers first or by price (optional, defaulted to price here or creation time)
    return query(
        collection(firestore, 'trips', trip.id, 'offers'),
        orderBy('price', 'asc') // Example: Show cheapest first
    );
  }, [firestore, trip.id]);

  const { data: offers, isLoading } = useCollection<Offer>(offersQuery);

  const handleAcceptClick = async (offer: Offer) => {
    setAcceptingOfferId(offer.id);
    try {
        await onAcceptOffer(offer);
    } catch (error) {
        console.error("Error accepting offer:", error);
        setAcceptingOfferId(null); // Reset on error
    }
    // Note: If onAcceptOffer redirects, we might not need to reset state, 
    // but good practice to have error handling.
  };

  const handleActionComplete = () => {
    setAcceptingOfferId(null);
  }

  // ✅ حالة التحميل
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-md" />
        ))}
      </div>
    );
  }

  // ✅ حالة عدم وجود عروض
  if (!offers || offers.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 col-span-full border-2 border-dashed rounded-lg bg-background/50">
        <PackageOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
        <p className="text-lg font-semibold">لا توجد عروض لهذا الطلب حتى الآن</p>
        <p className="text-sm mt-1 text-muted-foreground">سيتم إعلامك فور وصول عروض من الناقلين.</p>
      </div>
    );
  }

  // ✅ عرض العروض
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {offers.map((offer) => (
        <OfferCard
          key={offer.id}
          offer={offer}
          trip={trip}
          onAccept={() => handleAcceptClick(offer)}
          onActionComplete={handleActionComplete}
          isAccepting={acceptingOfferId === offer.id}
        />
      ))}
    </div>
  );
}
