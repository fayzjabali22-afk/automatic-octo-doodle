'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Booking, Trip } from '@/lib/data';
import { AppLayout } from '@/components/app-layout';
import { Ship } from 'lucide-react';

function LoadingScreen() {
    return (
        <AppLayout>
            <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center gap-4 text-center">
                <Ship className="h-16 w-16 animate-pulse text-primary" />
                <h1 className="text-xl font-bold text-muted-foreground">جاري تحديد وجهتك ...</h1>
                <p className="text-sm text-muted-foreground">يقوم النظام بالتحقق من حالة رحلاتك الحالية.</p>
            </div>
        </AppLayout>
    );
}

export default function SmartRedirectPage() {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    // Query for any active processes
    const activeProcessesQuery = useMemo(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, 'bookings'),
            where('userId', '==', user.uid),
            where('status', 'in', ['Pending-Payment', 'Confirmed', 'Pending-Carrier-Confirmation'])
        );
    }, [firestore, user]);
    
    const { data: activeBookings, isLoading: isLoadingBookings } = useCollection<Booking>(activeProcessesQuery);
    
    const tripRequestsQuery = useMemo(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, 'trips'),
            where('userId', '==', user.uid),
            where('status', '==', 'Awaiting-Offers')
        );
    }, [firestore, user]);

    const { data: activeTripRequests, isLoading: isLoadingRequests } = useCollection<Trip>(tripRequestsQuery);

    useEffect(() => {
        // Wait until user auth state and data fetching are complete
        if (isUserLoading || isLoadingBookings || isLoadingRequests) {
            return;
        }

        if (!user) {
            // If not logged in, redirect to dashboard which handles auth.
            router.replace('/dashboard');
            return;
        }

        // Priority 1: Pending Payment
        const pendingPaymentBooking = activeBookings?.find(b => b.status === 'Pending-Payment');
        if (pendingPaymentBooking) {
            // In the future, we can redirect to a dedicated payment page. For now, history page is fine.
            router.replace('/history');
            return;
        }

        // Priority 2: Confirmed Ticket or any other pending process
        if (activeBookings?.length > 0 || activeTripRequests?.length > 0) {
            router.replace('/history');
            return;
        }

        // Default: No active processes, go to dashboard to explore.
        router.replace('/dashboard');

    }, [user, isUserLoading, activeBookings, activeTripRequests, isLoadingBookings, isLoadingRequests, router]);

    // Show a loading screen while we determine the correct route.
    return <LoadingScreen />;
}
