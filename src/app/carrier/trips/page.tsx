'use client';
import { useState, useMemo } from 'react';
import { MyTripsList } from '@/components/carrier/my-trips-list';
import { Booking, Trip } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox, Hourglass, Briefcase, Route } from 'lucide-react';
import { BookingActionCard } from '@/components/carrier/booking-action-card';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

function LoadingState() {
    return (
      <div className="space-y-6 px-4 md:px-0">
          <Skeleton key="header-1" className="h-8 w-48 rounded-lg mb-4" />
          <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
          </div>
      </div>
    );
}

export default function CarrierTripsPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const activeTripsQuery = useMemo(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, 'trips'),
            where('carrierId', '==', user.uid),
            where('status', 'in', ['Planned', 'In-Transit'])
        );
    }, [firestore, user]);

    const pendingBookingsQuery = useMemo(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, 'bookings'),
            where('carrierId', '==', user.uid),
            where('status', 'in', ['Pending-Carrier-Confirmation', 'Pending-Payment'])
        );
    }, [firestore, user]);
    
    const { data: activeTrips, isLoading: isLoadingTrips } = useCollection<Trip>(activeTripsQuery);
    const { data: pendingBookingsData, isLoading: isLoadingPending } = useCollection<Booking>(pendingBookingsQuery);
    
    const bookingsByTripId = useMemo(() => {
        if (!pendingBookingsData) return new Map<string, Booking[]>();
        // Only include bookings that need carrier action
        return pendingBookingsData.filter(b => b.status === 'Pending-Carrier-Confirmation').reduce((acc, booking) => {
            if (!acc.has(booking.tripId)) {
                acc.set(booking.tripId, []);
            }
            acc.get(booking.tripId)!.push(booking);
            return acc;
        }, new Map<string, Booking[]>());
    }, [pendingBookingsData]);

    const bookingsAwaitingPayment = useMemo(() => {
        if (!pendingBookingsData) return [];
        return pendingBookingsData.filter(b => b.status === 'Pending-Payment');
    }, [pendingBookingsData]);

    const isLoading = isLoadingTrips || isLoadingPending;

    if (isLoading) {
        return <LoadingState />;
    }

    return (
        <div className="p-4 md:px-6 lg:px-8 space-y-8">
            <header>
                <h1 className="text-xl md:text-2xl font-bold">إدارة الرحلات والحجوزات</h1>
                <p className="text-muted-foreground text-sm md:text-base">
                   أدرْ رحلاتك النشطة، وقم بتأكيد أو رفض طلبات الحجز الجديدة في مكان واحد.
                </p>
            </header>
            
            <main className="space-y-8">
                {bookingsAwaitingPayment.length > 0 && (
                    <div>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-orange-500">
                            <Hourglass className="h-5 w-5" />
                            حجوزات بانتظار دفع العربون
                        </h2>
                        <div className="space-y-4">
                            {bookingsAwaitingPayment.map(booking => (
                                <BookingActionCard key={booking.id} booking={booking} />
                            ))}
                        </div>
                    </div>
                )}
                
                <div>
                     <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Route className="h-5 w-5 text-muted-foreground" />
                        رحلاتي النشطة وطلباتها
                    </h2>
                    <MyTripsList 
                        trips={activeTrips || []}
                        pendingBookingsMap={bookingsByTripId}
                    />
                </div>
            </main>
        </div>
    );
}
