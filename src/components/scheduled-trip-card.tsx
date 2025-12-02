'use client';

import type { CarrierProfile, Trip } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from '@/components/ui/card';
import {
  Car,
  Star,
  Calendar,
  ArrowRight,
  HandCoins,
} from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Skeleton } from './ui/skeleton';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore'; // Added Timestamp for safe checking
import { Badge } from './ui/badge';
import Image from 'next/image';
import { format } from 'date-fns';

// Helper to safely format dates whether they are Strings, Dates, or Firestore Timestamps
const safeDateFormat = (dateInput: any): string => {
  if (!dateInput) return 'N/A';
  try {
    // If it's a Firestore Timestamp (has toDate method)
    if (typeof dateInput.toDate === 'function') {
      return format(dateInput.toDate(), "PPP");
    }
    // If it's a string or Date object
    return format(new Date(dateInput), "PPP");
  } catch (error) {
    console.error("Date formatting error:", error);
    return 'Invalid Date';
  }
};

const cities: { [key: string]: string } = {
  damascus: 'Damascus', aleppo: 'Aleppo', homs: 'Homs',
  amman: 'Amman', irbid: 'Irbid', zarqa: 'Zarqa',
  riyadh: 'Riyadh', jeddah: 'Jeddah', dammam: 'Dammam',
  cairo: 'Cairo', alexandria: 'Alexandria', giza: 'Giza',
  dubai: 'Dubai', kuwait: 'Kuwait'
};

const getCityName = (key: string) => {
    if (!key) return 'Unknown';
    const lowerKey = key.toLowerCase();
    return cities[lowerKey] || key; // Return mapped name or original if not found
};

const CarrierInfo = ({ carrierId, carrierName }: { carrierId: string; carrierName?: string; }) => {
  const firestore = useFirestore();
  const carrierRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'carriers', carrierId);
  }, [firestore, carrierId]);

  const { data: carrier, isLoading } = useDoc<CarrierProfile>(carrierRef);
  
  // Logic: Prefer carrier's uploaded image, fallback to placeholder
  const placeholderImage = PlaceHolderImages.find((img) => img.id === 'user-avatar');
  // @ts-ignore
  const displayImage = carrier?.imageUrl || placeholderImage?.imageUrl;

  if (isLoading) {
    return (
      // FIX: Changed 'class' to 'className'
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-3 w-[80px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-10 w-10 border-2 border-accent">
        <AvatarImage src={displayImage} alt={carrier?.name || carrierName} />
        <AvatarFallback>{(carrier?.name || carrierName || 'C').charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div>
        <p className="font-bold text-sm text-foreground">{carrier?.name || carrierName || 'Unknown Carrier'}</p>
        <div className="flex items-center text-xs text-muted-foreground gap-1">
          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
          <span>{carrier?.averageRating ? carrier.averageRating.toFixed(1) : 'New'}</span>
        </div>
      </div>
    </div>
  );
};

export function ScheduledTripCard({ trip, onBookNow }: { trip: Trip; onBookNow: (trip: Trip) => void; }) {
  const depositAmount = (trip.price || 0) * ((trip.depositPercentage || 0) / 100);
  
  // Logic: Prefer trip's vehicle image if available (assuming trip.vehicleImage exists), else placeholder
  const placeholderCar = PlaceHolderImages.find((img) => img.id === 'car-placeholder');
  // @ts-ignore: Assuming trip might have an image property in the future, otherwise strictly use placeholder
  const vehicleImageUrl = trip.vehicleImageUrl || placeholderCar?.imageUrl;

  return (
    <Card className="w-full overflow-hidden shadow-lg transition-all hover:shadow-primary/20 border-2 border-border/60 flex flex-col justify-between bg-card">
      <CardHeader>
        {trip.carrierId ? (
             <CarrierInfo carrierId={trip.carrierId} carrierName={trip.carrierName} />
        ) : (
            // Fallback if no carrier ID is present
             <div className="text-sm text-muted-foreground">Carrier info unavailable</div>
        )}
        
        <div className="flex justify-between items-center pt-2">
            <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {/* FIX: Safe date formatting */}
                {safeDateFormat(trip.departureDate)}
            </Badge>
            <div className="flex items-center gap-2 text-sm font-bold">
               {/* FIX: Case-insensitive city lookup */}
               <span>{getCityName(trip.origin)}</span>
               <ArrowRight className="h-4 w-4 text-primary"/>
               <span>{getCityName(trip.destination)}</span>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {vehicleImageUrl && (
            <div className="relative aspect-video w-full overflow-hidden rounded-md">
                <Image 
                    src={vehicleImageUrl}
                    alt="Vehicle image" 
                    fill
                    className="object-cover transition-transform hover:scale-105 duration-500"
                />
            </div>
        )}
        <div className="text-sm text-foreground p-3 bg-background/50 rounded-md border border-dashed border-border space-y-2">
            <p className='flex items-center gap-2 font-bold'><Car className="h-4 w-4 text-accent" /> Vehicle Details:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pl-6">
                <p><strong>Type:</strong> {trip.vehicleType || 'N/A'}</p>
                <p><strong>Available Seats:</strong> {trip.availableSeats ?? 'N/A'}</p>
            </div>
        </div>
        <div className="text-sm text-foreground p-3 bg-background/50 rounded-md border border-dashed border-border space-y-2">
            <p className='flex items-center gap-2 font-bold'><HandCoins className="h-4 w-4 text-accent" /> Price Details:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pl-6">
                <p><strong>Total Price:</strong> {trip.price} JOD</p>
                <p><strong>Deposit ({trip.depositPercentage || 0}%):</strong> {depositAmount.toFixed(2)} JOD</p>
            </div>
        </div>
      </CardContent>
      <CardFooter className="flex p-2 bg-background/30 gap-2">
        <Button size="sm" className="w-full" onClick={() => onBookNow(trip)}>
            Book Now
        </Button>
      </CardFooter>
    </Card>
  );
}
