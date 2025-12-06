'use client';
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft } from "lucide-react";
import type { Trip, Offer } from "@/lib/data";
import { TripOffers } from "./trip-offers";

interface OfferDecisionRoomProps {
    trip: Trip;
    offers: Offer[];
    onAcceptOffer: (trip: Trip, offer: Offer) => void;
    isProcessing: boolean;
    onBack: () => void;
}

export function OfferDecisionRoom({ trip, offers, onAcceptOffer, isProcessing, onBack }: OfferDecisionRoomProps) {
    
    const getCityName = (key: string) => key; // Simplified for now

    return (
        <div className="space-y-4">
             <header className="flex items-center justify-between p-2">
                <div>
                    <h2 className="text-xl font-bold">غرفة القرار: العروض المستلمة</h2>
                    <p className="text-sm text-muted-foreground">
                        طلب رحلة: {getCityName(trip.origin)} <ArrowRight className="inline h-3 w-3" /> {getCityName(trip.destination)}
                    </p>
                </div>
                <Button variant="outline" onClick={onBack}>
                    <ChevronLeft className="ml-2 h-4 w-4" />
                    العودة للقائمة
                </Button>
            </header>
            
            <TripOffers
                trip={trip}
                offers={offers}
                onAcceptOffer={onAcceptOffer}
                isProcessing={isProcessing}
            />
        </div>
    )
}
