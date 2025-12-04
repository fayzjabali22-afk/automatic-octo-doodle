'use client';
import { useMemo } from 'react';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Booking, Trip } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox, History, Hourglass } from 'lucide-react';
import { BookingActionCard } from '@/components/carrier/booking-action-card';

// --- MOCK DATA FOR VISUAL VERIFICATION ---

const mockTrip: Trip = {
    id: 'mock_trip_for_booking',
    userId: 'mock_user_1',
    carrierId: 'carrier_user_id',
    origin: 'amman',
    destination: 'riyadh',
    departureDate: new Date().toISOString(),
    status: 'Planned',
    price: 50,
    availableSeats: 2, // CRITICAL: Only 2 seats are available for testing.
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
}

const mockPendingBookings: Booking[] = [
    {
        id: 'mock_booking_valid', // This booking should be valid
        tripId: 'mock_trip_for_booking',
        userId: 'mock_user_1',
        carrierId: 'carrier_user_id',
        seats: 2, // Asks for 2 seats (available is 2)
        passengersDetails: [ { name: 'أحمد الصالح', type: 'adult' }, { name: 'سارة الصالح', type: 'adult' } ],
        status: 'Pending-Carrier-Confirmation',
        totalPrice: 100,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 'mock_booking_invalid', // This booking should be invalid
        tripId: 'mock_trip_for_booking',
        userId: 'mock_user_2',
        carrierId: 'carrier_user_id',
        seats: 3, // Asks for 3 seats (available is only 2)
        passengersDetails: [ { name: 'فاطمة العلي', type: 'adult' }, { name: 'خالد العلي', type: 'adult' }, { name: 'طفل', type: 'child' } ],
        status: 'Pending-Carrier-Confirmation',
        totalPrice: 150,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    }
];

const mockHistoricalBookings: Booking[] = [
    {
        id: 'mock_hist_booking_1',
        tripId: 'mock_hist_trip_1',
        userId: 'mock_user_3',
        carrierId: 'carrier_user_id',
        seats: 1,
        passengersDetails: [{ name: 'خالد المصري', type: 'adult' }],
        status: 'Confirmed',
        totalPrice: 50,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    }
];


export default function CarrierBookingsPage() {
    const isLoading = false;
    const pendingBookings = mockPendingBookings;
    const historicalBookings = mockHistoricalBookings;

    if (isLoading) {
        return (
          <div className="space-y-6">
              <Skeleton key="header-1" className="h-8 w-48 rounded-lg" />
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
              </div>
              <Skeleton key="header-2" className="h-8 w-48 rounded-lg" />
              <div className="space-y-3">
                 {[...Array(1)].map((_, i) => <Skeleton key={`hist-${i}`} className="h-48 w-full rounded-lg" />)}
              </div>
          </div>
        );
    }
    
    return (
        <div className="space-y-8">
            {/* New Requests Section */}
            <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Hourglass className="h-5 w-5 text-primary" />
                    طلبات حجز جديدة
                </h2>
                {pendingBookings.length > 0 ? (
                    <div className="space-y-4">
                        {pendingBookings.map(booking => (
                            <BookingActionCard 
                                key={booking.id} 
                                booking={booking} 
                                // Pass the mock trip for testing purposes
                                trip={booking.tripId === mockTrip.id ? mockTrip : undefined}
                            />
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

            {/* Historical Log Section */}
            <div>
                 <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <History className="h-5 w-5 text-muted-foreground" />
                    سجل الحجوزات السابق
                </h2>
                {historicalBookings.length > 0 ? (
                     <div className="space-y-4">
                        {historicalBookings.map(booking => (
                            <BookingActionCard key={booking.id} booking={booking} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        لا يوجد سجل حجوزات سابق بعد.
                    </div>
                )}
            </div>
        </div>
    );
}
