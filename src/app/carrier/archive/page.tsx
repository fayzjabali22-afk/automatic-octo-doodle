'use client';
import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Trip } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Calendar, CircleDollarSign, CheckCircle, XCircle, Ship, Users } from 'lucide-react';
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
  'Completed': { text: 'مكتملة', icon: CheckCircle, className: 'bg-green-100 text-green-800' },
  'Cancelled': { text: 'ملغاة', icon: XCircle, className: 'bg-red-100 text-red-800' },
};

const mockArchivedTrips: Trip[] = [
    {
        id: 'mock_completed_1',
        userId: 'carrier_user_id',
        carrierId: 'carrier_user_id',
        origin: 'riyadh',
        destination: 'damascus',
        departureDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Completed',
        price: 60,
        availableSeats: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'mock_cancelled_1',
        userId: 'carrier_user_id',
        carrierId: 'carrier_user_id',
        origin: 'amman',
        destination: 'jeddah',
        departureDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Cancelled',
        price: 75,
        availableSeats: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'mock_completed_2',
        userId: 'carrier_user_id',
        carrierId: 'carrier_user_id',
        origin: 'cairo',
        destination: 'amman',
        departureDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Completed',
        price: 90,
        availableSeats: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
];

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
                    <span>السعر: {trip.price} د.أ</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <Users className="h-3 w-3 text-primary" />
                    <span>الركاب: {trip.passengers || 'غير محدد'}</span>
                 </div>
            </div>
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
    const isLoading = false;
    const trips = mockArchivedTrips;

    const { completedTrips, cancelledTrips } = useMemo(() => {
        const completed = trips.filter(t => t.status === 'Completed').sort((a,b) => new Date(b.departureDate).getTime() - new Date(a.departureDate).getTime());
        const cancelled = trips.filter(t => t.status === 'Cancelled').sort((a,b) => new Date(b.departureDate).getTime() - new Date(a.departureDate).getTime());
        return { completedTrips: completed, cancelledTrips: cancelled };
    }, [trips]);


    return (
        // PWA Compliance: No horizontal padding on mobile (p-0), but add it for larger screens
        <div className="p-0 md:p-6 lg:p-8 space-y-4">
            <header className="p-4 rounded-b-lg md:rounded-lg bg-card shadow-sm border-b md:border">
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
                    <TabsContent value="completed" className="mt-4">
                        <TripList trips={completedTrips} />
                    </TabsContent>
                    <TabsContent value="cancelled" className="mt-4">
                        <TripList trips={cancelledTrips} />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
