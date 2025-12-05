'use client';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { Trip, Booking, UserProfile } from '@/lib/data';
import { User, ShieldCheck, Phone, Users as UsersIcon } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback } from '../ui/avatar';


// --- MOCK DATA ---
const mockBookings: Booking[] = [
    { id: 'booking_A1', tripId: 'mock_planned_1', userId: 'traveler_A', carrierId: 'carrier_user_id', seats: 2, passengersDetails: [{ name: 'أحمد صالح', type: 'adult' }, { name: 'فاطمة صالح', type: 'adult' }], status: 'Confirmed', totalPrice: 160, currency: 'JOD', createdAt: new Date().toISOString() },
    { id: 'booking_A2', tripId: 'mock_planned_1', userId: 'traveler_B', carrierId: 'carrier_user_id', seats: 1, passengersDetails: [{ name: 'خالد جمعة', type: 'adult' }], status: 'Confirmed', totalPrice: 80, currency: 'JOD', createdAt: new Date().toISOString() },
    { id: 'booking_B1', tripId: 'mock_in_transit_1', userId: 'traveler_C', carrierId: 'carrier_user_id', seats: 1, passengersDetails: [{ name: 'سارة فؤاد', type: 'adult' }], status: 'Confirmed', totalPrice: 120, currency: 'SAR', createdAt: new Date().toISOString() },
];

const mockUsers: { [key: string]: UserProfile } = {
    'traveler_A': { id: 'traveler_A', firstName: 'أحمد', lastName: 'صالح', email: '', phoneNumber: '+962791111111' },
    'traveler_B': { id: 'traveler_B', firstName: 'خالد', lastName: 'جمعة', email: '', phoneNumber: '+966502222222' },
    'traveler_C': { id: 'traveler_C', firstName: 'سارة', lastName: 'فؤاد', email: '', phoneNumber: '+201003333333' },
}
// --- END MOCK DATA ---


function BookingGroup({ booking }: { booking: Booking }) {
    const isLoading = false;
    const user = mockUsers[booking.userId];

    if (isLoading || !user) {
        return <Skeleton className="h-24 w-full rounded-md" />;
    }

    return (
        <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border">
                        <AvatarFallback>{user?.firstName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-bold text-sm">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-muted-foreground">المسافر المسؤول</p>
                    </div>
                </div>
                 <a href={`tel:${user.phoneNumber}`} className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline">
                    <Phone className="h-4 w-4"/>
                    <span>{user.phoneNumber}</span>
                </a>
            </div>
             <div className="border-t pt-2 space-y-2">
                <p className="text-xs font-bold flex items-center gap-1"><UsersIcon className="h-4 w-4"/> قائمة الركاب ({booking.passengersDetails.length})</p>
                <ul className="list-disc pr-5 text-xs text-muted-foreground space-y-1">
                    {booking.passengersDetails.map((p, index) => (
                        <li key={index}>{p.name}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

interface PassengersListDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    trip: Trip | null;
}

export function PassengersListDialog({ isOpen, onOpenChange, trip }: PassengersListDialogProps) {
    const isLoading = false;
    const bookings = useMemo(() => {
        if (!trip) return [];
        return mockBookings.filter(b => b.tripId === trip.id && b.status === 'Confirmed');
    }, [trip]);

    const totalPassengers = useMemo(() => {
        return bookings.reduce((acc, booking) => acc + booking.seats, 0);
    }, [bookings]);


    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>كشف ركاب الرحلة</DialogTitle>
                        <DialogDescription>
                            قائمة الركاب المؤكدين للرحلة من {trip?.origin} إلى {trip?.destination}.
                            <br/>
                            <span className="font-bold">إجمالي الركاب: {totalPassengers}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] -mx-4 px-4">
                        <div className="space-y-3 py-4">
                            {isLoading ? (
                                <div className="space-y-2">
                                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                                </div>
                            ) : bookings.length > 0 ? (
                                bookings.map(booking => (
                                    <BookingGroup key={booking.id} booking={booking} />
                                ))
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <User className="mx-auto h-8 w-8 mb-2" />
                                    لا يوجد ركاب مؤكدون لهذه الرحلة بعد.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                            إغلاق
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
