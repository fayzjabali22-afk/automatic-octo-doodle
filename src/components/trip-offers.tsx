'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Offer, Trip } from '@/lib/data';
import { OfferCard } from '@/components/offer-card';
import { Skeleton } from '@/components/ui/skeleton';
import { PackageOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TripOffersProps {
  trip: Trip;
  onAcceptOffer: (offer: Offer) => void;
}

export function TripOffers({ trip, onAcceptOffer }: TripOffersProps) {
  const firestore = useFirestore();

  const offersQuery = useMemoFirebase(() => {
    if (!firestore || !trip?.id) return null;
    return query(collection(firestore, 'trips', trip.id, 'offers'));
  }, [firestore, trip.id]);

  const { data: offers, isLoading } = useCollection<Offer>(offersQuery);

  // ✅ حالة التحميل
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-96 w-full rounded-md" />
        ))}
      </div>
    );
  }

  // ✅ حالة عدم وجود عروض
  if (!offers || offers.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 col-span-full">
        <PackageOpen className="mx-auto h-10 w-10 text-muted-foreground/50 mb-4" aria-hidden="true" />
        <p className="text-md font-semibold">لا توجد عروض لهذا الطلب حتى الآن.</p>
        <p className="text-sm mt-1">سيتم إعلامك فور وصول أي عروض جديدة.</p>
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
          onAccept={() => onAcceptOffer(offer)}
          isAccepting={false} // يمكن إدارة الحالة لاحقًا
        />
      ))}
    </div>
  );
}
