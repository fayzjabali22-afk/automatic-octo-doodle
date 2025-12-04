'use client';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { Trip, Booking, UserProfile } from '@/lib/data';
import { Loader2, Trash2, User, AlertTriangle, ShieldCheck } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// --- MOCK DATA ---
const mockBookings: Booking[] = [
    { id: 'booking_A1', tripId: 'mock_planned_1', userId: 'traveler_A', carrierId: 'carrier_user_id', seats: 1, passengersDetails: [{ name: 'Ahmad Saleh', type: 'adult' }], status: 'Confirmed', totalPrice: 80, createdAt: new Date().toISOString() },
    { id: 'booking_A2', tripId: 'mock_planned_1', userId: 'traveler_B', carrierId: 'carrier_user_id', seats: 1, passengersDetails: [{ name: 'Khalid Jama', type: 'adult' }], status: 'Confirmed', totalPrice: 80, createdAt: new Date().toISOString() },
    { id: 'booking_B1', tripId: 'mock_in_transit_1', userId: 'traveler_C', carrierId: 'carrier_user_id', seats: 1, passengersDetails: [{ name: 'Sara Fouad', type: 'adult' }], status: 'Confirmed', totalPrice: 120, createdAt: new Date().toISOString() },
];

const mockUsers: { [key: string]: UserProfile } = {
    'traveler_A': { id: 'traveler_A', firstName: 'Ahmad', lastName: 'Saleh', email: '' },
    'traveler_B': { id: 'traveler_B', firstName: 'Khalid', lastName: 'Jama', email: '' },
    'traveler_C': { id: 'traveler_C', firstName: 'Sara', lastName: 'Fouad', email: '' },
}
// --- END MOCK DATA ---

const cancellationReasons = [
    { id: 'no-show', label: 'المسافر لم يحضر' },
    { id: 'inappropriate-behavior', label: 'سلوك غير لائق' },
    { id: 'by-request', label: 'بطلب من المسافر' },
    { id: 'emergency', label: 'ظروف طارئة خاصة بالناقل' },
];

function PassengerItem({ booking, onCancel }: { booking: Booking, onCancel: (booking: Booking) => void }) {
    const isLoading = false;
    const user = mockUsers[booking.userId];

    if (isLoading) {
        return <Skeleton className="h-12 w-full rounded-md" />;
    }

    return (
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                    <AvatarFallback>{user?.firstName.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="font-semibold text-sm">{user?.firstName} {user?.lastName}</span>
            </div>
            <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => onCancel(booking)}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}

interface PassengersListDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    trip: Trip | null;
}

export function PassengersListDialog({ isOpen, onOpenChange, trip }: PassengersListDialogProps) {
    const { toast } = useToast();
    const [isCancelling, setIsCancelling] = useState(false);
    const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
    const [cancellationReason, setCancellationReason] = useState('');

    const isLoading = false;
    const bookings = useMemo(() => {
        if (!trip) return [];
        return mockBookings.filter(b => b.tripId === trip.id && b.status === 'Confirmed');
    }, [trip]);

    const handleCancelClick = (booking: Booking) => {
        setBookingToCancel(booking);
        setCancellationReason(''); // Reset reason
    };

    const handleConfirmCancellation = async () => {
        if (!bookingToCancel || !cancellationReason) {
            toast({ variant: 'destructive', title: 'الرجاء اختيار سبب الإلغاء' });
            return;
        }
        setIsCancelling(true);
        
        // SIMULATE BACKEND LOGIC
        setTimeout(() => {
            console.log(`Simulating cancellation for booking: ${bookingToCancel.id}`);
            console.log(`Reason: ${cancellationReason}`);
            console.log(`Seat increment: ${bookingToCancel.seats}`);
            toast({
                title: 'محاكاة: تم إلغاء الحجز',
                description: `تم إبلاغ الراكب بالسبب وإعادة ${bookingToCancel.seats} مقعد(مقاعد) للرحلة.`,
            });
            setIsCancelling(false);
            setBookingToCancel(null);
        }, 1500);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>إدارة قائمة الركاب</DialogTitle>
                        <DialogDescription>
                            عرض وإدارة الركاب المؤكدين في هذه الرحلة.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] -mx-4 px-4">
                        <div className="space-y-2 py-4">
                            {isLoading ? (
                                <div className="space-y-2">
                                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                                </div>
                            ) : bookings.length > 0 ? (
                                bookings.map(booking => (
                                    <PassengerItem key={booking.id} booking={booking} onCancel={handleCancelClick} />
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
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

            <AlertDialog open={!!bookingToCancel} onOpenChange={(open) => !open && setBookingToCancel(null)}>
                <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-6 w-6 text-destructive" />
                            تأكيد إلغاء حجز الراكب
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            لتوثيق العملية، الرجاء تحديد سبب الإلغاء. سيتم إبلاغ الراكب بالسبب وسيتم إعادة مقاعده لتكون متاحة.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <RadioGroup value={cancellationReason} onValueChange={setCancellationReason} className="space-y-2">
                            {cancellationReasons.map(reason => (
                                <div key={reason.id} className="flex items-center space-x-2 rtl:space-x-reverse">
                                    <RadioGroupItem value={reason.id} id={reason.id} />
                                    <Label htmlFor={reason.id} className="font-normal">{reason.label}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                    
                    <div className="p-3 my-2 bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-lg text-xs space-y-1">
                        <p className="font-bold flex items-center gap-1"><ShieldCheck className="h-4 w-4"/> تنبيه قانوني:</p>
                        <p>
                            هذا الإجراء يتم بقرار شخصي منك وبمسؤوليتك الكاملة. إدارة المنصة تخلي مسؤوليتها القانونية والمالية تماماً عن هذا الإلغاء تجاه الطرفين. بإتمامك لهذا الإجراء، فإنك تقر بتحمل كافة التبعات القانونية وحقوق المسافر المترتبة على ذلك.
                        </p>
                    </div>

                    <AlertDialogFooter className="gap-2 sm:gap-0 pt-2">
                        <AlertDialogCancel disabled={isCancelling}>تراجع</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmCancellation}
                            disabled={isCancelling || !cancellationReason}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isCancelling ? (
                                <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري الإلغاء...</>
                            ) : "أقر بالمسؤولية وإلغاء التذكرة"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}