'use client';
import { useState, useMemo } from 'react';
import type { Booking, Trip, UserProfile } from '@/lib/data';
import { useFirestore, useDoc, addDocumentNonBlocking } from '@/firebase';
import { doc, writeBatch, increment, serverTimestamp, collection } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Calendar, Users, ArrowRight, Loader2, Info, Wallet, CircleDollarSign, Banknote, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { logEvent } from '@/lib/analytics';
import { Separator } from '../ui/separator';

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
    // This component can still fetch live user data if needed, or be mocked.
    // For this scenario, we keep it as is, assuming user profiles are not part of the core simulation.
    const firestore = useFirestore();
    const userRef = useMemo(() => userId ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: userProfile, isLoading } = useDoc<UserProfile>(userRef);

    if (isLoading) return <Skeleton className="h-6 w-32" />;
    if (!userProfile) return <span className="font-bold">{userId}</span>; // Fallback to ID
    return <span className="font-bold">{userProfile?.firstName} {userProfile?.lastName}</span>;
}

function TripInfo({ trip }: { trip?: Trip | null }) {
    if (!trip) return <div className="text-red-500 text-sm">تفاصيل الرحلة غير متاحة</div>;

    return (
         <CardDescription>
            رحلة: {getCityName(trip.origin)} <ArrowRight className="inline h-3 w-3" /> {getCityName(trip.destination)}
        </CardDescription>
    );
}

// In Simulation Mode, the trip data is passed directly as a prop.
export function BookingActionCard({ booking, trip }: { booking: Booking, trip: Trip | null }) {
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    
    // In simulation mode, we don't fetch the trip, we use the one passed in.
    const isLoadingTrip = false; 
    
    const { depositAmount, remainingAmount } = useMemo(() => {
        if (!trip) return { depositAmount: 0, remainingAmount: 0 };
        const deposit = booking.totalPrice * ((trip.depositPercentage || 20) / 100);
        const remaining = booking.totalPrice - deposit;
        return { depositAmount: deposit, remainingAmount: remaining };
    }, [booking.totalPrice, trip]);

    const handleBookingAction = async (action: 'confirm' | 'reject') => {
        // In simulation, we just show a toast and don't interact with Firestore.
        setIsProcessing(true);
        setTimeout(() => {
            toast({ title: `محاكاة: ${action === 'confirm' ? 'تم تأكيد الحجز' : 'تم رفض الحجز'}` });
            setIsProcessing(false);
        }, 1000);
    };

    const statusInfo = statusMap[booking.status] || { text: booking.status, className: 'bg-gray-100 text-gray-800' };
    const isPending = booking.status === 'Pending-Carrier-Confirmation';
    
    // SMART CAPACITY CHECK LOGIC - This now works with the mocked trip data passed in.
    const hasSufficientSeats = trip ? booking.seats <= (trip.availableSeats || 0) : false;

    return (
        <Card className={cn("w-full shadow-md transition-shadow hover:shadow-lg", isPending && "border-primary border-2")}>
            <CardHeader className="flex flex-row justify-between items-start pb-2">
                <div>
                    <CardTitle className="text-base"><UserInfo userId={booking.userId} /></CardTitle>
                    <TripInfo trip={trip} />
                </div>
                 <Badge className={statusInfo.className}>{statusInfo.text}</Badge>
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
        </Card>
    );
}
