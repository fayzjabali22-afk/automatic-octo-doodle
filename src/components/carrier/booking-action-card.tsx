'use client';
import { useState, useMemo } from 'react';
import type { Booking, Trip, UserProfile } from '@/lib/data';
import { useFirestore, useDoc, addDocumentNonBlocking, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc, writeBatch, increment, serverTimestamp, collection, runTransaction } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Calendar, Users, ArrowRight, Loader2, Info, Wallet, CircleDollarSign, Banknote, AlertCircle, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { logEvent } from '@/lib/analytics';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChatDialog } from '@/components/chat/chat-dialog';


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


const mockTravelers: { [key: string]: UserProfile } = {
    'traveler_A': { id: 'traveler_A', firstName: 'أحمد', lastName: 'صالح', email: 'ahmad@email.com' },
    'traveler_B': { id: 'traveler_B', firstName: 'خالد', lastName: 'جمعة', email: 'khalid@email.com' },
    'traveler_C': { id: 'traveler_C', firstName: 'سارة', lastName: 'فؤاد', email: 'sara@email.com' },
    'traveler_D': { id: 'traveler_D', firstName: 'منى', lastName: 'علي', email: 'mona@email.com' },
};

function UserInfo({ userId }: { userId: string }) {
    const firestore = useFirestore();
    const userProfileRef = firestore ? doc(firestore, 'users', userId) : null;
    const { data: userProfile, isLoading } = useDoc<UserProfile>(userProfileRef);

    if (isLoading) return <Skeleton className="h-8 w-32" />;
    
    const fallbackName = mockTravelers[userId];

    if (!userProfile && !fallbackName) return <span className="font-bold">{userId}</span>;
    
    const profile = userProfile || fallbackName;

    return (
        <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
                <AvatarFallback>{profile.firstName.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="font-bold">{profile?.firstName} {profile?.lastName}</span>
        </div>
    )
}

function TripInfo({ tripId }: { tripId: string }) {
    const firestore = useFirestore();
    const tripRef = firestore ? doc(firestore, 'trips', tripId) : null;
    const { data: trip, isLoading } = useDoc<Trip>(tripRef);
    
    if (isLoading) return <Skeleton className="h-4 w-48 mt-1" />;

    if (!trip) return <div className="text-red-500 text-sm">تفاصيل الرحلة غير متاحة</div>;

    return (
         <CardDescription>
            رحلة: {getCityName(trip.origin)} <ArrowRight className="inline h-3 w-3" /> {getCityName(trip.destination)}
        </CardDescription>
    );
}

export function BookingActionCard({ booking }: { booking: Booking }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isProcessing, setIsProcessing] = useState(false);
    
    const tripRef = useMemo(() => {
        if (!firestore) return null;
        return doc(firestore, 'trips', booking.tripId);
    }, [firestore, booking.tripId]);
    
    const { data: trip, isLoading: isLoadingTrip } = useDoc<Trip>(tripRef);
    
    const [isChatOpen, setIsChatOpen] = useState(false);
    
    const travelerProfileRef = useMemo(() => {
        if (!firestore) return null;
        return doc(firestore, 'users', booking.userId);
    }, [firestore, booking.userId]);
    const { data: travelerProfile } = useDoc<UserProfile>(travelerProfileRef);
    
    const { depositAmount, remainingAmount } = useMemo(() => {
        if (!trip) return { depositAmount: 0, remainingAmount: 0 };
        const deposit = booking.totalPrice * ((trip.depositPercentage || 20) / 100);
        const remaining = booking.totalPrice - deposit;
        return { depositAmount: deposit, remainingAmount: remaining };
    }, [booking.totalPrice, trip]);

    const handleBookingAction = async (action: 'confirm' | 'reject') => {
        if (!firestore || !trip) {
            toast({ title: 'خطأ', description: 'لا يمكن إتمام الإجراء، بيانات الرحلة غير متوفرة', variant: 'destructive' });
            return;
        }

        setIsProcessing(true);

        try {
            await runTransaction(firestore, async (transaction) => {
                const tripDocRef = doc(firestore, 'trips', trip.id);
                const bookingDocRef = doc(firestore, 'bookings', booking.id);
                
                const freshTripDoc = await transaction.get(tripDocRef);
                if (!freshTripDoc.exists()) {
                    throw "Trip does not exist!";
                }

                if (action === 'confirm') {
                    const currentSeats = freshTripDoc.data().availableSeats || 0;
                    if (currentSeats < booking.seats) {
                        throw "Not enough available seats.";
                    }
                    
                    transaction.update(tripDocRef, { availableSeats: increment(-booking.seats) });
                    transaction.update(bookingDocRef, { status: 'Confirmed' });
                } else { // reject
                    transaction.update(bookingDocRef, { status: 'Cancelled', cancelledBy: 'carrier', cancellationReason: 'تم رفض الطلب من قبل الناقل' });
                }
            });

            // Send notification outside of transaction
            const notificationPayload = {
                userId: booking.userId,
                type: 'booking_confirmed' as 'booking_confirmed',
                isRead: false,
                createdAt: serverTimestamp(),
                title: action === 'confirm' ? 'تم تأكيد حجزك! 🎉' : 'عذراً، تم رفض طلب الحجز',
                message: action === 'confirm'
                    ? `لقد قام الناقل بتأكيد حجزك لرحلة ${getCityName(trip.origin)} إلى ${getCityName(trip.destination)}. نتمنى لك رحلة سعيدة!`
                    : `نعتذر، لم يتمكن الناقل من تأكيد حجزك لرحلة ${getCityName(trip.origin)} إلى ${getCityName(trip.destination)}.`,
                link: '/history',
            };
            await addDocumentNonBlocking(collection(firestore, 'notifications'), notificationPayload);

            toast({ title: `تم ${action === 'confirm' ? 'تأكيد' : 'رفض'} الحجز بنجاح!` });
            if (action === 'confirm') logEvent('BOOKING_CONFIRMED', { carrierId: booking.carrierId, bookingId: booking.id });
        } catch (error: any) {
            console.error("Booking action failed:", error);
            toast({ title: 'فشل الإجراء', description: error.toString(), variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    const statusInfo = statusMap[booking.status] || { text: booking.status, className: 'bg-gray-100 text-gray-800' };
    const isPending = booking.status === 'Pending-Carrier-Confirmation';
    const isConfirmed = booking.status === 'Confirmed';
    
    const hasSufficientSeats = trip ? booking.seats <= (trip.availableSeats || 0) : false;

    const handleOpenChatDialog = () => {
        if (!travelerProfile) return;
        setIsChatOpen(true);
    };

    return (
        <>
        <Card className={cn("w-full shadow-md transition-shadow hover:shadow-lg", isPending && "border-primary border-2")}>
            <CardHeader className="flex flex-row justify-between items-start pb-2">
                <div>
                    <CardTitle className="text-base"><UserInfo userId={booking.userId} /></CardTitle>
                    <TripInfo tripId={booking.tripId} />
                </div>
                 <Badge className={cn(statusInfo.className, "text-xs")}>{statusInfo.text}</Badge>
            </CardHeader>
            <CardContent className="space-y-4 pb-4">
                 <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <Users className="h-4 w-4 text-primary" />
                        <strong>عدد الركاب:</strong> {booking.seats}
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <Calendar className="h-4 w-4 text-primary" />
                        <strong>تاريخ الطلب:</strong> {new Date(booking.createdAt).toLocaleDateString('ar-SA')}
                    </div>
                </div>
                {booking.passengersDetails?.length > 0 && (
                     <div className="p-3 bg-muted/30 rounded-md border border-dashed">
                        <p className="font-bold text-xs mb-2 flex items-center gap-1"><Info className="h-4 w-4"/> أسماء الركاب:</p>
                        <ul className="list-disc pr-5 text-xs text-muted-foreground">
                            {booking.passengersDetails.map((p, i) => <li key={i}>{p.name} ({p.type === 'adult' ? 'بالغ' : 'طفل'})</li>)}
                        </ul>
                    </div>
                )}
                 <div className="p-3 bg-muted/40 rounded-lg border">
                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><Wallet className="h-4 w-4 text-primary"/>التفاصيل المالية</h4>
                     <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">السعر الإجمالي للحجز:</span>
                            <span className="font-bold">{booking.totalPrice.toFixed(2)} د.أ</span>
                        </div>
                        <Separator/>
                        <div className="flex justify-between items-center text-green-600">
                            <span className="flex items-center gap-1"><CircleDollarSign className="h-4 w-4"/> العربون المدفوع (مُحصّل):</span>
                            <span className="font-bold text-base">{isLoadingTrip ? '...' : depositAmount.toFixed(2)} د.أ</span>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground">
                            <span className="flex items-center gap-1"><Banknote className="h-4 w-4"/> المبلغ المتبقي للتحصيل:</span>
                            <span className="font-bold">{isLoadingTrip ? '...' : remainingAmount.toFixed(2)} د.أ</span>
                        </div>
                    </div>
                </div>
            </CardContent>
            {isPending && (
                <CardFooter className="flex flex-col gap-2 bg-muted/30 p-2">
                    <div className='flex gap-2 w-full'>
                        <Button 
                            className="w-full bg-green-600 hover:bg-green-700 text-white" 
                            onClick={() => handleBookingAction('confirm')}
                            disabled={isProcessing || isLoadingTrip || !hasSufficientSeats}
                        >
                            {isProcessing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Check className="ml-2 h-4 w-4" />}
                            تأكيد الحجز
                        </Button>
                        <Button 
                            variant="destructive" 
                            className="w-full"
                            onClick={() => handleBookingAction('reject')}
                            disabled={isProcessing || isLoadingTrip}
                        >
                             {isProcessing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <X className="ml-2 h-4 w-4" />}
                            رفض
                        </Button>
                    </div>
                    {trip && !hasSufficientSeats && (
                        <div className='flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-md w-full'>
                            <AlertCircle className="h-4 w-4" />
                            <span>عذراً، السعة المتبقية ({trip.availableSeats || 0}) لا تكفي لهذا الطلب.</span>
                        </div>
                    )}
                </CardFooter>
            )}
             {isConfirmed && (
                <CardFooter className="bg-muted/30 p-2">
                    <Button variant="outline" className="w-full" onClick={handleOpenChatDialog}>
                        <MessageSquare className="ml-2 h-4 w-4" />
                        مراسلة المسافر
                    </Button>
                </CardFooter>
            )}
        </Card>
        {isConfirmed && travelerProfile && (
            <ChatDialog 
                isOpen={isChatOpen}
                onOpenChange={setIsChatOpen}
                bookingId={booking.id}
                otherPartyName={`${travelerProfile.firstName} ${travelerProfile.lastName}`}
            />
        )}
        </>
    );
}
