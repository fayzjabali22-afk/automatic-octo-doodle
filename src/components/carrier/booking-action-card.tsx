'use client';
import { useState, useMemo } from 'react';
import type { Booking, Trip, UserProfile } from '@/lib/data';
import { useFirestore, useDoc, addDocumentNonBlocking } from '@/firebase';
import { doc, writeBatch, increment, serverTimestamp, collection } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Calendar, Users, ArrowRight, Loader2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { logEvent } from '@/lib/analytics';

const cities: { [key: string]: string } = {
    damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص',
    amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
    riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام',
    cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة',
};

const getCityName = (key: string) => cities[key] || key;

const statusMap: Record<string, { text: string; className: string }> = {
    'Pending-Carrier-Confirmation': { text: 'بانتظار التأكيد', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    'Confirmed': { text: 'مؤكد', className: 'bg-green-100 text-green-800 border-green-300' },
    'Cancelled': { text: 'ملغي', className: 'bg-red-100 text-red-800 border-red-300' },
    'Completed': { text: 'مكتمل', className: 'bg-blue-100 text-blue-800 border-blue-300' },
};

function UserInfo({ userId }: { userId: string }) {
    const firestore = useFirestore();
    const userRef = useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: userProfile, isLoading } = useDoc<UserProfile>(userRef);

    if (isLoading) return <Skeleton className="h-6 w-32" />;
    return <span className="font-bold">{userProfile?.firstName} {userProfile?.lastName}</span>;
}

function TripInfo({ tripId }: { tripId: string }) {
    const firestore = useFirestore();
    const tripRef = useMemo(() => tripId ? doc(firestore, 'trips', tripId) : null, [firestore, tripId]);
    const { data: trip, isLoading } = useDoc<Trip>(tripRef);

    if (isLoading) return <Skeleton className="h-5 w-48 mt-1" />;
    if (!trip) return <div className="text-red-500 text-sm">تفاصيل الرحلة غير متاحة</div>;

    return (
         <CardDescription>
            رحلة: {getCityName(trip.origin)} <ArrowRight className="inline h-3 w-3" /> {getCityName(trip.destination)}
        </CardDescription>
    );
}

export function BookingActionCard({ booking }: { booking: Booking }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    
    const handleBookingAction = async (action: 'confirm' | 'reject') => {
        if (!firestore) return;
        setIsProcessing(true);
        
        const bookingRef = doc(firestore, 'bookings', booking.id);
        const tripRef = doc(firestore, 'trips', booking.tripId);
        
        const batch = writeBatch(firestore);

        if (action === 'confirm') {
            batch.update(bookingRef, { status: 'Confirmed' });
            batch.update(tripRef, { availableSeats: increment(-booking.seats) });

            const notificationData = {
                userId: booking.userId,
                title: 'تم تأكيد حجزك!',
                message: `خبر سعيد! تم تأكيد حجزك لرحلة ${getCityName(booking.tripId)}. نتمنى لك رحلة موفقة!`,
                type: 'booking_confirmed',
                isRead: false,
                createdAt: new Date().toISOString(),
                link: '/history',
            };
            addDocumentNonBlocking(collection(firestore, 'notifications'), notificationData);
            
            logEvent('BOOKING_CONFIRMED', {
                carrierId: booking.carrierId,
                tripId: booking.tripId,
                bookingId: booking.id,
                totalPrice: booking.totalPrice,
                seats: booking.seats,
            });

        } else { // Reject
            batch.update(bookingRef, { status: 'Cancelled' });
            
            const notificationData = {
                userId: booking.userId,
                title: 'تحديث بخصوص طلب الحجز',
                message: `نعتذر، لم يتمكن الناقل من تأكيد طلب الحجز الخاص بك لرحلة ${getCityName(booking.tripId)} في الوقت الحالي.`,
                type: 'trip_update',
                isRead: false,
                createdAt: new Date().toISOString(),
                link: '/history',
            };
            addDocumentNonBlocking(collection(firestore, 'notifications'), notificationData);
        }

        try {
            await batch.commit();
            toast({
                title: action === 'confirm' ? 'تم تأكيد الحجز بنجاح' : 'تم رفض الحجز',
            });
        } catch (error) {
            console.error('Error processing booking:', error);
            toast({ variant: 'destructive', title: 'حدث خطأ', description: 'لم نتمكن من إتمام الإجراء. يرجى المحاولة مرة أخرى.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const statusInfo = statusMap[booking.status] || { text: booking.status, className: 'bg-gray-100 text-gray-800' };
    const isPending = booking.status === 'Pending-Carrier-Confirmation';

    return (
        <Card className={cn("w-full shadow-md transition-shadow hover:shadow-lg", isPending && "border-primary border-2")}>
            <CardHeader className="flex flex-row justify-between items-start pb-2">
                <div>
                    <CardTitle className="text-base"><UserInfo userId={booking.userId} /></CardTitle>
                    <TripInfo tripId={booking.tripId} />
                </div>
                 <Badge className={statusInfo.className}>{statusInfo.text}</Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm pb-4">
                 <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <Users className="h-4 w-4 text-primary" />
                    <strong>عدد الركاب:</strong> {booking.seats}
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <Calendar className="h-4 w-4 text-primary" />
                    <strong>تاريخ الطلب:</strong> {new Date(booking.createdAt).toLocaleDateString('ar-SA')}
                </div>
                {booking.passengersDetails?.length > 0 && (
                     <div className="col-span-2 p-3 bg-muted/50 rounded-md border border-dashed">
                        <p className="font-bold text-xs mb-2 flex items-center gap-1"><Info className="h-4 w-4"/> أسماء الركاب:</p>
                        <ul className="list-disc pr-5 text-xs text-muted-foreground">
                            {booking.passengersDetails.map((p, i) => <li key={i}>{p.name} ({p.type === 'adult' ? 'بالغ' : 'طفل'})</li>)}
                        </ul>
                    </div>
                )}
            </CardContent>
            {isPending && (
                <CardFooter className="flex gap-2 bg-muted/30 p-2">
                    <Button 
                        className="w-full bg-green-600 hover:bg-green-700 text-white" 
                        onClick={() => handleBookingAction('confirm')}
                        disabled={isProcessing}
                    >
                        {isProcessing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Check className="ml-2 h-4 w-4" />}
                        تأكيد الحجز
                    </Button>
                    <Button 
                        variant="destructive" 
                        className="w-full"
                        onClick={() => handleBookingAction('reject')}
                        disabled={isProcessing}
                    >
                         {isProcessing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <X className="ml-2 h-4 w-4" />}
                        رفض
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
