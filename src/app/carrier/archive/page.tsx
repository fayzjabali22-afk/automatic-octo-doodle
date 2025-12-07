'use client';
import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Trip } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Calendar, CircleDollarSign, CheckCircle, XCircle, Ship, Users, Hourglass } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const cities: { [key: string]: string } = {
    damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص',
    amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
    riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام',
    cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة',
};

const getCityName = (key: string) => cities[key] || key;

const safeDateFormat = (dateInput: any): string => {
  if (!dateInput) return 'غير محدد';
  try {
    const dateObj = new Date(dateInput);
    return dateObj.toLocaleDateString('ar-SA', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return 'تاريخ غير صالح'; }
};

const statusMap: Record<string, { text: string; icon: React.ElementType; className: string }> = {
  'Completed': { text: 'مكتملة', icon: CheckCircle, className: 'bg-green-100 text-green-800 border-green-300' },
  'Cancelled': { text: 'ملغاة', icon: XCircle, className: 'bg-red-100 text-red-800 border-red-300' },
};

function ArchivedTripItem({ trip }: { trip: Trip }) {
    const statusInfo = statusMap[trip.status];

    return (
        <div className="w-full p-3 border-b md:border md:rounded-lg bg-card shadow-sm">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <span className="text-sm font-bold text-foreground flex items-center gap-1">
                        {getCityName(trip.origin)} <ArrowRight className="h-4 w-4 text-muted-foreground" /> {getCityName(trip.destination)}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3" /> {safeDateFormat(trip.departureDate)}
                    </span>
                </div>
                {statusInfo && (
                    <Badge className={cn("py-1 px-3 text-xs", statusInfo.className)}>
                        <statusInfo.icon className="ml-1 h-3 w-3" />
                        {statusInfo.text}
                    </Badge>
                )}
            </div>
            <div className="border-t my-2"></div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                 <div className="flex items-center gap-2">
                    <CircleDollarSign className="h-3 w-3 text-green-500" />
                    <span>السعر: {trip.price} {trip.currency}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <Users className="h-3 w-3 text-primary" />
                    <span>الركاب: {trip.passengers || 'غير محدد'}</span>
                 </div>
            </div>
        </div>
    );
}

function TripListSkeleton() {
    return (
        <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
    );
}

function TripList({ trips }: { trips: Trip[] }) {
    if (trips.length === 0) {
        return <p className="text-center text-muted-foreground p-8">لا توجد رحلات في هذا القسم.</p>;
    }
    return (
        <div className="space-y-2 md:space-y-3">
            {trips.map(trip => <ArchivedTripItem key={trip.id} trip={trip} />)}
        </div>
    );
}

export default function ArchivePage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const archivedTripsQuery = useMemo(() => {
        if (!firestore || !user) return null;
        // The orderBy was removed from here to avoid needing a composite index.
        // Sorting will be handled client-side in the next useMemo.
        return query(
            collection(firestore, 'trips'),
            where('carrierId', '==', user.uid),
            where('status', 'in', ['Completed', 'Cancelled'])
        );
    }, [firestore, user]);

    const { data: trips, isLoading } = useCollection<Trip>(archivedTripsQuery);

    const { completedTrips, cancelledTrips } = useMemo(() => {
        if (!trips) return { completedTrips: [], cancelledTrips: [] };
        // Sort the trips here on the client-side
        const completed = trips.filter(t => t.status === 'Completed').sort((a,b) => new Date(b.departureDate).getTime() - new Date(a.departureDate).getTime());
        const cancelled = trips.filter(t => t.status === 'Cancelled').sort((a,b) => new Date(b.departureDate).getTime() - new Date(a.departureDate).getTime());
        return { completedTrips: completed, cancelledTrips: cancelled };
    }, [trips]);


    return (
        <div className="space-y-4 w-full">
            <header className="rounded-b-lg md:rounded-lg bg-card shadow-sm border-b md:border p-4">
                <h1 className="text-xl md:text-2xl font-bold">أرشيف الرحلات</h1>
                <p className="text-muted-foreground text-xs md:text-sm">
                    سجلك الكامل للرحلات المكتملة والملغاة.
                </p>
            </header>

            <main>
                <Tabs defaultValue="completed" className="w-full">
                    <div className="px-2 md:px-0">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="completed">
                                <CheckCircle className="ml-2 h-4 w-4" />
                                مكتملة ({completedTrips.length})
                            </TabsTrigger>
                            <TabsTrigger value="cancelled">
                                <XCircle className="ml-2 h-4 w-4" />
                                ملغاة ({cancelledTrips.length})
                            </TabsTrigger>
                        </TabsList>
                    </div>
                    {isLoading ? (
                        <div className="mt-4 px-2 md:px-0">
                             <TripListSkeleton />
                        </div>
                    ) : (
                        <>
                            <TabsContent value="completed" className="mt-4 px-2 md:px-0">
                                <TripList trips={completedTrips} />
                            </TabsContent>
                            <TabsContent value="cancelled" className="mt-4 px-2 md:px-0">
                                <TripList trips={cancelledTrips} />
                            </TabsContent>
                        </>
                    )}
                </Tabs>
            </main>
        </div>
    );
}
