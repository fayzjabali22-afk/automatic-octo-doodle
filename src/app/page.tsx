
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

    // Query for any active processes for the user
    const activeBookingsQuery = useMemo(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, 'bookings'),
            where('userId', '==', user.uid),
            where('status', 'in', ['Pending-Payment', 'Confirmed', 'Pending-Carrier-Confirmation'])
        );
    }, [firestore, user]);
    
    const activeTripRequestsQuery = useMemo(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, 'trips'),
            where('userId', '==', user.uid),
            where('status', '==', 'Awaiting-Offers')
        );
    }, [firestore, user]);

    const { data: activeBookings, isLoading: isLoadingBookings } = useCollection<Booking>(activeBookingsQuery);
    const { data: activeTripRequests, isLoading: isLoadingRequests } = useCollection<Trip>(activeTripRequestsQuery);

    useEffect(() => {
        // Wait until both authentication and data fetching are complete
        if (isUserLoading || isLoadingBookings || isLoadingRequests) {
            return;
        }

        // If the user is not logged in, they should be taken to the public dashboard.
        if (!user) {
            router.replace('/dashboard');
            return;
        }
        
        // If the user has any active process (booking or request), redirect to the history page.
        if ((activeBookings && activeBookings.length > 0) || (activeTripRequests && activeTripRequests.length > 0)) {
            router.replace('/history');
            return;
        }

        // Default case: a logged-in user with no active processes goes to the dashboard.
        router.replace('/dashboard');

    }, [user, isUserLoading, activeBookings, activeTripRequests, isLoadingBookings, isLoadingRequests, router]);

    // Render a loading screen while the redirection logic is processing.
    return <LoadingScreen />;
}
