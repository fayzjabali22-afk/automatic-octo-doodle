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
      <div className="space-y-6">
          <div className="px-2 md:px-0">
            <Skeleton key="header-1" className="h-8 w-48 rounded-lg" />
            <div className="space-y-3 mt-4">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
            </div>
          </div>
          <div className="px-2 md:px-0">
            <Skeleton key="header-2" className="h-8 w-48 rounded-lg" />
            <div className="space-y-3 mt-4">
                {[...Array(1)].map((_, i) => <Skeleton key={`hist-${i}`} className="h-20 w-full rounded-lg" />)}
            </div>
          </div>
      </div>
    );
}


export default function CarrierTripsPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const pendingBookingsQuery = useMemo(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, 'bookings'),
            where('carrierId', '==', user.uid),
            where('status', '==', 'Pending-Carrier-Confirmation')
        );
    }, [firestore, user]);
    
    const { data: pendingBookingsData, isLoading: isLoadingPending } = useCollection<Booking>(pendingBookingsQuery);
    
    const pendingBookings = useMemo(() => {
        if (!pendingBookingsData) return [];
        return [...pendingBookingsData].sort((a, b) => new Date((b.createdAt as any)?.seconds * 1000).getTime() - new Date((a.createdAt as any)?.seconds * 1000).getTime());
    }, [pendingBookingsData]);


    if (isLoadingPending) {
        return <LoadingState />;
    }

    return (
        <div className="p-0 md:p-6 lg:p-8 space-y-8">
            <header className="p-4 md:p-0">
                <h1 className="text-xl md:text-2xl font-bold">إدارة الرحلات والحجوزات</h1>
                <p className="text-muted-foreground text-sm md:text-base">
                    أدرْ رحلاتك النشطة، وقم بتأكيد أو رفض طلبات الحجز الجديدة في مكان واحد.
                </p>
            </header>
            
            <main className="space-y-8">
                {/* New Booking Requests Section */}
                <div className="px-2 md:px-0">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Hourglass className="h-5 w-5 text-primary" />
                        طلبات حجز جديدة
                    </h2>
                    {pendingBookings && pendingBookings.length > 0 ? (
                        <div className="space-y-4">
                            {pendingBookings.map(booking => (
                                <BookingActionCard key={booking.id} booking={booking} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed rounded-lg bg-card/50">
                            <Inbox className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-bold">لا توجد طلبات حجز جديدة</h3>
                            <p className="text-muted-foreground mt-2 max-w-sm text-sm">
                                سيتم عرض طلبات الحجز المرسلة من المسافرين هنا فور وصولها.
                            </p>
                        </div>
                    )}
                </div>

                {/* My Active Trips Section */}
                <div className="px-2 md:px-0">
                     <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Route className="h-5 w-5 text-muted-foreground" />
                        رحلاتي النشطة والمجدولة
                    </h2>
                    <MyTripsList />
                </div>
            </main>
        </div>
    );
}