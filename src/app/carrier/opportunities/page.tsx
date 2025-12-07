'use client';
import { RequestCard } from '@/components/carrier/request-card';
import { useFirestore, useCollection, useUser, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, writeBatch, serverTimestamp, runTransaction } from 'firebase/firestore';
import { PackageOpen, Settings, AlertTriangle, ListFilter, Armchair, UserCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Trip, Offer, TransferRequest } from '@/lib/data';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { OfferDialog } from '@/components/carrier/offer-dialog';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { DirectRequestActionCard } from '@/components/carrier/direct-request-action-card';
import { TransferRequestCard } from '@/components/carrier/transfer-request-card';

// Dialogs and handlers will be consolidated here
// For now, let's just get the combined query working.

function LoadingState() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-lg" />
      ))}
    </div>
  );
}

function NoSpecializationState() {
    return (
        <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed rounded-lg bg-card/50">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500/80 mb-4" />
            <h3 className="text-xl font-bold">يرجى تحديد بيانات مركبتك أولاً</h3>
            <p className="text-muted-foreground mt-2 max-w-md">
              للاستفادة من الفلترة الذكية، يرجى الذهاب إلى صفحة الملف الشخصي وتحديد "خط السير المفضل" و "السعة القصوى للمركبة".
            </p>
             <Button asChild className="mt-6">
                <Link href="/carrier/profile">
                    <Settings className="ml-2 h-4 w-4" />
                    الذهاب إلى الملف الشخصي
                </Link>
            </Button>
      </div>
    )
}

function NoOpportunitiesState({ isFiltered }: { isFiltered: boolean }) {
     return (
      <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed rounded-lg bg-card/50">
        <PackageOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-bold">
            {isFiltered ? "لا توجد فرص تطابق تخصصك وسعة مركبتك" : "لا توجد فرص متاحة حالياً"}
        </h3>
        <p className="text-muted-foreground mt-2">
          {isFiltered ? "يمكنك إيقاف الفلترة لعرض كل الفرص المتاحة." : "سيتم عرض الطلبات الجديدة هنا فور وصولها."}
        </p>
      </div>
    );
}

export default function CarrierOpportunitiesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile: userProfile, isLoading: isLoadingProfile } = useUserProfile();
  const { toast } = useToast();

  const [filterBySpecialization, setFilterBySpecialization] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);

  // --- QUERIES ---
  const opportunitiesQuery = useMemo(() => {
    if (!firestore || !user || userProfile?.isDeactivated) return null;
    let generalQuery = query(collection(firestore, 'trips'), where('status', '==', 'Awaiting-Offers'), where('requestType', '==', 'General'));
    let directQuery = query(collection(firestore, 'trips'), where('status', 'in', ['Awaiting-Offers', 'Pending-Carrier-Confirmation']), where('requestType', '==', 'Direct'), where('targetCarrierId', '==', user.uid));
    
    if (filterBySpecialization && userProfile?.primaryRoute?.origin && userProfile?.primaryRoute?.destination) {
        generalQuery = query(generalQuery, where('origin', '==', userProfile.primaryRoute.origin), where('destination', '==', userProfile.primaryRoute.destination));
        directQuery = query(directQuery, where('origin', '==', userProfile.primaryRoute.origin), where('destination', '==', userProfile.primaryRoute.destination));
    }
    if (userProfile?.vehicleCapacity && userProfile.vehicleCapacity > 0) {
        generalQuery = query(generalQuery, where('passengers', '<=', userProfile.vehicleCapacity));
        directQuery = query(directQuery, where('passengers', '<=', userProfile.vehicleCapacity));
    }
    return { generalQuery, directQuery };
  }, [firestore, user, filterBySpecialization, userProfile]);

  const transferRequestsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'transferRequests'), where('toCarrierId', '==', user.uid), where('status', '==', 'pending'));
  }, [firestore, user]);

  // --- DATA FETCHING ---
  const { data: generalRequests, isLoading: isLoadingGeneral } = useCollection<Trip>(opportunitiesQuery?.generalQuery);
  const { data: directRequests, isLoading: isLoadingDirect } = useCollection<Trip>(opportunitiesQuery?.directQuery);
  const { data: transferRequests, isLoading: isLoadingTransfers } = useCollection<TransferRequest>(transferRequestsQuery);
  
  const opportunities = useMemo(() => {
    const combined = [...(directRequests || []), ...(generalRequests || [])];
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
    return unique.sort((a, b) => {
        if (a.requestType === 'Direct' && b.requestType !== 'Direct') return -1;
        if (b.requestType === 'Direct' && a.requestType !== 'Direct') return 1;
        return new Date(b.createdAt?.seconds * 1000).getTime() - new Date(a.createdAt?.seconds * 1000).getTime();
    });
  }, [generalRequests, directRequests]);

  const isLoading = isLoadingProfile || isLoadingGeneral || isLoadingDirect || isLoadingTransfers;

  const handleOfferClick = (trip: Trip) => {
    setSelectedTrip(trip);
    setIsOfferDialogOpen(true);
  };
  
  const handleSendOffer = async (offerData: Omit<Offer, 'id' | 'tripId' | 'carrierId' | 'status' | 'createdAt'>): Promise<boolean> => {
     toast({ title: "وظيفة قيد الإنشاء", description: "سيتم ربط إرسال العروض قريبًا." });
    return false;
  };
   const handleApproveDirect = async (trip: Trip, finalPrice: number, currency: string): Promise<boolean> => {
     toast({ title: "وظيفة قيد الإنشاء", description: "سيتم ربط إرسال العروض قريبًا." });
    return false;
  };
   const handleRejectDirect = async (trip: Trip, reason: string): Promise<boolean> => {
     toast({ title: "وظيفة قيد الإنشاء", description: "سيتم ربط إرسال العروض قريبًا." });
    return false;
  };

  const handleAcceptTransfer = async (request: TransferRequest) => {
    if (!firestore || !user) return;
    try {
        await runTransaction(firestore, async (transaction) => {
            const transferReqRef = doc(firestore, 'transferRequests', request.id);
            const tripRef = doc(firestore, 'trips', request.originalTripId);
            const batch = writeBatch(firestore); // Use a batch for notifications outside transaction

            // 1. Update TransferRequest status
            transaction.update(transferReqRef, { status: 'accepted', updatedAt: serverTimestamp() });

            // 2. Update the original Trip's carrierId
            transaction.update(tripRef, { carrierId: request.toCarrierId });

            // 3. Update all associated bookings
            const bookingsQuery = query(collection(firestore, 'bookings'), where('tripId', '==', request.originalTripId));
            const bookingsSnapshot = await transaction.get(bookingsQuery);
            
            const passengerUserIds: string[] = [];
            bookingsSnapshot.forEach(bookingDoc => {
                transaction.update(bookingDoc.ref, { carrierId: request.toCarrierId });
                passengerUserIds.push(bookingDoc.data().userId);
            });
            
            // 4. Prepare Notifications (to be committed outside transaction)
            // Notify original carrier
            const fromCarrierNotifRef = doc(collection(firestore, 'notifications'));
            batch.set(fromCarrierNotifRef, {
                userId: request.fromCarrierId,
                title: 'تم قبول طلب نقل الرحلة',
                message: `وافق الناقل البديل على استلام رحلتك. تم نقل المسؤولية بنجاح.`,
                type: 'trip_update', isRead: false, createdAt: serverTimestamp(), link: '/carrier/archive'
            });

            // Notify all passengers
            passengerUserIds.forEach(userId => {
                const passengerNotifRef = doc(collection(firestore, 'notifications'));
                 batch.set(passengerNotifRef, {
                    userId: userId,
                    title: 'تحديث هام بخصوص رحلتك',
                    message: `تم نقل رحلتك إلى ناقل آخر. الرجاء مراجعة تفاصيل الناقل الجديد في صفحة إدارة الحجز.`,
                    type: 'trip_update', isRead: false, createdAt: serverTimestamp(), link: '/history'
                });
            });

            // Commit notifications after transaction succeeds
            await batch.commit();
        });

        toast({ title: 'تم استلام الرحلة بنجاح!', description: 'تم تحديث بيانات الرحلة والحجوزات وإعلام جميع الأطراف.' });
        // The card will disappear automatically due to the status change
    } catch (error) {
        console.error("Error accepting transfer:", error);
        toast({ variant: 'destructive', title: 'فشل قبول النقل', description: 'حدث خطأ ما. لا يمكن إكمال العملية.' });
    }
  }
  
  const handleRejectTransfer = async (request: TransferRequest) => {
    if (!firestore) return;
    try {
      const transferReqRef = doc(firestore, 'transferRequests', request.id);
      await updateDocumentNonBlocking(transferReqRef, { status: 'rejected', updatedAt: serverTimestamp() });
      // Also notify the original carrier
      const notifPayload = {
          userId: request.fromCarrierId,
          title: 'تم رفض طلب نقل الرحلة',
          message: 'نعتذر، لم يتمكن الناقل البديل من قبول طلبك لنقل الرحلة.',
          type: 'trip_update', isRead: false, createdAt: serverTimestamp(), link: '/carrier/trips'
      }
      await addDocumentNonBlocking(collection(firestore, 'notifications'), notifPayload);
      toast({ title: 'تم رفض الطلب', variant: 'default' });
    } catch (error) {
       toast({ title: 'فشل رفض الطلب', variant: 'destructive' });
    }
  }


  if (isLoading) return <LoadingState />;
  
  const canFilter = !!(userProfile?.primaryRoute?.origin && userProfile?.primaryRoute?.destination);
  const hasCapacity = !!(userProfile?.vehicleCapacity && userProfile.vehicleCapacity > 0);

  if (!canFilter || !hasCapacity) return <NoSpecializationState />;
  
  if (userProfile?.isDeactivated) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed rounded-lg bg-card/50">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500/80 mb-4" />
            <h3 className="text-xl font-bold">حسابك مجمد حالياً</h3>
            <p className="text-muted-foreground mt-2 max-w-md">
                لقد قمت بتجميد حسابك. لن تظهر لك أي فرص جديدة. يمكنك إعادة تنشيط حسابك من صفحة الملف الشخصي.
            </p>
             <Button asChild className="mt-6">
                <Link href="/carrier/profile">
                    <Settings className="ml-2 h-4 w-4" />
                    الذهاب إلى الملف الشخصي
                </Link>
            </Button>
      </div>
      )
  }
  
  const hasOpportunities = opportunities && opportunities.length > 0;
  const hasTransferRequests = transferRequests && transferRequests.length > 0;

  return (
    <>
    <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-center sm:justify-start space-x-2 rtl:space-x-reverse bg-card p-3 rounded-lg border">
                <Label htmlFor="filter-switch" className="flex items-center gap-2 font-semibold">
                    <ListFilter className="h-4 w-4" />
                    <span>فلترة حسب خط السير</span>
                </Label>
                <Switch
                    id="filter-switch"
                    checked={filterBySpecialization}
                    onCheckedChange={setFilterBySpecialization}
                    disabled={!canFilter}
                />
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-2 text-sm font-bold bg-card p-3 rounded-lg border text-primary">
                <Armchair className="h-5 w-5" />
                <span>السعة القصوى لمركبتك:</span>
                <span>{userProfile?.vehicleCapacity || 'غير محدد'} ركاب</span>
            </div>
        </div>

        <div className="space-y-6">
            {hasTransferRequests && (
                <div>
                    <h2 className="text-lg font-bold mb-3">عروض نقل من زملاء</h2>
                    <div className="space-y-3">
                        {transferRequests.map(req => (
                            <TransferRequestCard 
                              key={req.id} 
                              request={req} 
                              onAccept={handleAcceptTransfer}
                              onReject={handleRejectTransfer}
                            />
                        ))}
                    </div>
                </div>
            )}
            
            {hasOpportunities ? (
                <div>
                    {hasTransferRequests && <h2 className="text-lg font-bold mb-3 mt-6 border-t pt-4">طلبات من المسافرين</h2>}
                    <div className="space-y-3">
                        {opportunities.map(req => (
                            req.requestType === 'Direct' ? (
                               <DirectRequestActionCard 
                                    key={req.id} 
                                    tripRequest={req}
                                    onApprove={handleApproveDirect}
                                    onReject={handleRejectDirect}
                                />
                            ) : (
                               <RequestCard key={req.id} tripRequest={req} onOffer={handleOfferClick} />
                            )
                        ))}
                    </div>
                </div>
            ) : (
                !hasTransferRequests && <NoOpportunitiesState isFiltered={filterBySpecialization && canFilter} />
            )}
        </div>
    </div>
    {selectedTrip && (
        <OfferDialog
            isOpen={isOfferDialogOpen}
            onOpenChange={setIsOfferDialogOpen}
            trip={selectedTrip}
            suggestion={null} // Suggestion logic needs to be wired
            onSuggestPrice={() => {}}
            isSuggestingPrice={false}
            onSendOffer={handleSendOffer}
        />
    )}
    </>
  );
}
