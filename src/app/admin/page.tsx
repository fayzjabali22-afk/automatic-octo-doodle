'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { UserProfile, Trip, Booking } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Ship, CheckCircle, Briefcase, UserCheck, Activity } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    isLoading: boolean;
}

function StatCard({ title, value, icon: Icon, isLoading }: StatCardProps) {
    return (
        <Card className="bg-gray-800 border-gray-700 hover:bg-gray-700/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
                <Icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                    <div className="text-3xl font-bold text-white">{value}</div>
                )}
            </CardContent>
        </Card>
    );
}

export default function AdminDashboardPage() {
    const firestore = useFirestore();

    const usersQuery = useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const tripsQuery = useMemo(() => firestore ? collection(firestore, 'trips') : null, [firestore]);
    const bookingsQuery = useMemo(() => firestore ? collection(firestore, 'bookings') : null, [firestore]);

    const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);
    const { data: trips, isLoading: isLoadingTrips } = useCollection<Trip>(tripsQuery);
    const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);

    const stats = useMemo(() => {
        const totalUsers = users?.length || 0;
        const totalCarriers = users?.filter(u => u.role === 'carrier').length || 0;
        const activeTrips = trips?.filter(t => t.status === 'Planned' || t.status === 'In-Transit').length || 0;
        const completedBookings = bookings?.filter(b => b.status === 'Completed').length || 0;

        return { totalUsers, totalCarriers, activeTrips, completedBookings };
    }, [users, trips, bookings]);

    const isLoading = isLoadingUsers || isLoadingTrips || isLoadingBookings;

    return (
        <div>
            <h1 className="text-2xl font-bold text-white mb-6">لوحة المعلومات الرئيسية</h1>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="إجمالي المستخدمين"
                    value={stats.totalUsers}
                    icon={Users}
                    isLoading={isLoading}
                />
                <StatCard
                    title="إجمالي الناقلين"
                    value={stats.totalCarriers}
                    icon={UserCheck}
                    isLoading={isLoading}
                />
                <StatCard
                    title="الرحلات النشطة حالياً"
                    value={stats.activeTrips}
                    icon={Activity}
                    isLoading={isLoading}
                />
                <StatCard
                    title="الحجوزات المكتملة"
                    value={stats.completedBookings}
                    icon={CheckCircle}
                    isLoading={isLoading}
                />
            </div>
             <p className="text-muted-foreground mt-8 text-xs text-center">
                يتم تحديث البيانات بشكل حي ومباشر من قاعدة البيانات.
            </p>
        </div>
    );
}
