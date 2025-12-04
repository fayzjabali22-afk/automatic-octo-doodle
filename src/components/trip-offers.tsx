'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore'; 
import type { Offer, Trip } from '@/lib/data';
import { OfferCard } from '@/components/offer-card';
import { Skeleton } from '@/components/ui/skeleton';
import { PackageOpen } from 'lucide-react';

// --- MOCK DATA ---
const mockOffers: Offer[] = [
    {
        id: 'offer1',
        tripId: 'trip_req_1',
        carrierId: 'carrier_A',
        price: 90,
        currency: 'JOD',
        notes: 'توقف للاستراحة في الطريق، واي فاي متوفر.',
        status: 'Pending',
        createdAt: new Date().toISOString(),
        vehicleType: 'GMC Yukon 2023',
        vehicleCategory: 'small',
        vehicleModelYear: 2023,
        availableSeats: 4,
        depositPercentage: 20,
        conditions: 'حقيبة واحدة فقط لكل راكب.'
    },
    {
        id: 'offer2',
        tripId: 'trip_req_1',
        carrierId: 'carrier_B',
        price: 85,
        currency: 'JOD',
        notes: 'رحلة مباشرة بدون توقف.',
        status: 'Pending',
        createdAt: new Date().toISOString(),
        vehicleType: 'Hyundai Staria 2024',
        vehicleCategory: 'small',
        vehicleModelYear: 2024,
        availableSeats: 6,
        depositPercentage: 15,
    }
];
// --- END MOCK DATA ---

interface TripOffersProps {
  trip: Trip;
  onAcceptOffer: (trip: Trip, offer: Offer) => void;
  isProcessing: boolean;
}

export function TripOffers({ trip, onAcceptOffer, isProcessing }: TripOffersProps) {
  // --- USE MOCK DATA ---
  const offers = mockOffers.filter(o => o.tripId === trip.id);
  const isLoading = false;
  // --- END MOCK DATA ---


  const handleAcceptClick = async (offer: Offer) => {
    await onAcceptOffer(trip, offer);
  };

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
          isAccepting={isProcessing}
        />
      ))}
    </div>
  );
}
