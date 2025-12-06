'use client';
import { useFirestore, useCollection, useUser, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, writeBatch, doc, serverTimestamp, getDoc, runTransaction } from 'firebase/firestore';
import { PackageOpen, UserCheck, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Trip, Booking } from '@/lib/data';
import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DirectRequestActionCard } from '@/components/carrier/direct-request-action-card';

function LoadingState() {
  return (
    <div className="space-y-3">
      {[...Array(2)].map((_, i) => (
        <Skeleton key={i} className="h-48 w-full rounded-lg" />
      ))}
    </div>
  );
}

function NoRequestsState() {
     return (
      <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed rounded-lg bg-card/50">
        <UserCheck className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-bold">
            لا توجد طلبات مباشرة جديدة
        </h3>
        <p className="text-muted-foreground mt-2">
          عندما يرسل لك مسافر طلباً مباشراً، سيظهر هنا.
        </p>
      </div>
    );
}

export default function CarrierDirectRequestsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const requestsQuery = useMemo(() => {
    if (!firestore || !user) return null;

    return query(
        collection(firestore, 'trips'), 
        where('requestType', '==', 'Direct'),
        where('targetCarrierId', '==', user.uid),
        where('status', 'in', ['Awaiting-Offers', 'Pending-Carrier-Confirmation'])
    );
  }, [firestore, user]);

  const { data: requests, isLoading } = useCollection<Trip>(requestsQuery);

  const handleApprove = async (trip: Trip, finalPrice: number, currency: string) => {
    if (!firestore || !user) return false;

    try {
        await runTransaction(firestore, async (transaction) => {
            const tripRef = doc(firestore, 'trips', trip.id);
            const bookingRef = doc(collection(firestore, 'bookings'));

            // 1. Update the Trip (request) with the price and set to Pending-Payment
            transaction.update(tripRef, { 
                price: finalPrice,
                currency: currency,
                status: 'Pending-Carrier-Confirmation' // Changed to wait for user to accept the price
            });

            // 2. Create the Booking document immediately is not needed anymore
            // User will initiate booking after accepting the price
            
            // 3. (Optional but good) Create a notification for the traveler
            const notificationRef = doc(collection(firestore, 'notifications'));
            transaction.set(notificationRef, {
                id: notificationRef.id,
                userId: trip.userId,
                title: '🎉 تمت الموافقة على طلبك المباشر!',
                message: `وافق الناقل على طلبك لرحلة ${trip.origin} - ${trip.destination}. السعر الجديد هو ${finalPrice} ${currency}. بانتظار موافقتك النهائية.`,
                link: '/history',
                type: 'new_offer',
                isRead: false,
                createdAt: serverTimestamp(),
            });
        });

        toast({
            title: 'تمت الموافقة بنجاح!',
            description: 'تم إرسال السعر للمسافر وهو الآن بانتظار موافقته النهائية.',
        });
        return true; // Indicates success to the card
    } catch (e) {
        console.error("Direct Approval Transaction Failed: ", e);
        toast({
            variant: 'destructive',
            title: 'فشل إتمام الموافقة',
            description: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
        });
        return false; // Indicates failure to the card
    }
  };

  const handleReject = async (trip: Trip, reason: string) => {
     if (!firestore || !user) return false;
      try {
        const tripRef = doc(firestore, 'trips', trip.id);
        const notificationRef = doc(collection(firestore, 'notifications'));
        
        const batch = writeBatch(firestore);
        
        // Update trip status to show it's handled
        batch.update(tripRef, { status: 'Cancelled' });
        
        // Notify user
        batch.set(notificationRef, {
            id: notificationRef.id,
            userId: trip.userId,
            title: 'اعتذار عن طلبك المباشر',
            message: `نعتذر، لقد اعتذر الناقل عن تنفيذ طلبك. السبب: "${reason}"`,
            link: '/dashboard',
            type: 'trip_update',
            isRead: false,
            createdAt: serverTimestamp(),
        });
        
        await batch.commit();

        toast({
            title: 'تم الاعتذار عن الطلب',
            description: 'تم إعلام المسافر بالقرار.',
        });
        return true;
    } catch (e) {
         toast({
            variant: 'destructive',
            title: 'فشل إجراء الاعتذار',
        });
        return false;
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-4">
        {requests && requests.length > 0 ? (
            <div className="space-y-4">
                {requests.map(req => (
                    <DirectRequestActionCard 
                        key={req.id} 
                        tripRequest={req}
                        onApprove={handleApprove}
                        onReject={handleReject}
                    />
                ))}
            </div>
        ) : (
            <NoRequestsState />
        )}
    </div>
  );
}
