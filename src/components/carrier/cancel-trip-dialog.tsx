'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Trip } from '@/lib/data';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';

interface CancelTripDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trip: Trip | null;
}

export function CancelTripDialog({ isOpen, onOpenChange, trip }: CancelTripDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isCancelling, setIsCancelling] = useState(false);

  const handleConfirm = async () => {
    if (!trip || !firestore) return;
    setIsCancelling(true);

    // --- REAL LOGIC IN SIMULATION MODE ---
    // In a real scenario, you'd fetch the actual booking documents.
    // Here, we'll just use the mock bookingIds to send notifications.
    const mockAffectedUserIds = ['traveler_A', 'traveler_B', 'traveler_C']; // Simulate users who booked this trip
    const notificationsCollection = collection(firestore, 'notifications');
    const tripDate = new Date(trip.departureDate).toISOString().split('T')[0];

    // The smart link for searching for an alternative trip
    const smartSearchLink = `/dashboard?origin=${trip.origin}&destination=${trip.destination}&date=${tripDate}`;
    
    // Create a notification for each affected user
    const notificationPromises = mockAffectedUserIds.map(userId => {
        const notificationPayload = {
            userId: userId,
            title: 'إلغاء رحلة وحجز!',
            message: `نعتذر، لقد قام الناقل بإلغاء رحلتك من ${trip.origin} إلى ${trip.destination} لظروف طارئة. اضغط هنا للبحث عن بديل فوراً.`,
            type: 'trip_update',
            isRead: false,
            createdAt: new Date().toISOString(),
            link: smartSearchLink
        };
        return addDocumentNonBlocking(notificationsCollection, notificationPayload);
    });

    try {
      await Promise.all(notificationPromises);
       toast({
          title: 'تم إلغاء الرحلة بنجاح',
          description: `تم إرسال إشعارات إلى ${mockAffectedUserIds.length} مسافرين متأثرين.`,
      });
    } catch (error) {
       toast({
          variant: 'destructive',
          title: 'فشل إرسال الإشعارات',
          description: 'حدث خطأ أثناء إبلاغ المسافرين.',
      });
    } finally {
        setIsCancelling(false);
        onOpenChange(false);
    }
    // --- END LOGIC ---
  };

  const bookedSeats = trip?.bookingIds?.length || 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            تأكيد إلغاء الرحلة
          </AlertDialogTitle>
          <AlertDialogDescription>
            <p className="font-bold py-2 text-base">هل أنت متأكد من رغبتك في إلغاء هذه الرحلة؟</p>
            <div className="p-3 text-destructive-foreground bg-destructive/80 rounded-lg text-sm space-y-1">
                <p className="font-bold">سيتم إبلاغ جميع المسافرين المسجلين فوراً.</p>
                <p className="text-xs">
                    يوجد حالياً <span className="font-bold">{bookedSeats}</span> حجز مؤكد على هذه الرحلة.
                    إلغاء الرحلة يعتبر إجراءً نهائياً ولا يمكن التراجع عنه. 
                </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0 pt-4">
          <AlertDialogCancel disabled={isCancelling}>تراجع</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={isCancelling}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isCancelling ? (
                <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الإلغاء...
                </>
            ) : "نعم، قم بالإلغاء وإبلاغ المسافرين"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
