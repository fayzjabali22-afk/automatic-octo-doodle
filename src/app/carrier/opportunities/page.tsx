'use client';
import { RequestCard } from '@/components/carrier/request-card';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { PackageOpen, Settings, AlertTriangle, ListFilter, Armchair, UserCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Trip, Offer } from '@/lib/data';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { OfferDialog } from '@/components/carrier/offer-dialog';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';
import { DirectRequestActionCard } from '@/components/carrier/direct-request-action-card';

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

  // --- Combined Query Logic ---
  const opportunitiesQuery = useMemo(() => {
    if (!firestore || !user || userProfile?.isDeactivated) return null; // Don't fetch if account is frozen

    const baseConditions = [
        where('status', 'in', ['Awaiting-Offers', 'Pending-Carrier-Confirmation']),
    ];
    
    const targetConditions = [
        where('requestType', '==', 'Direct'),
        where('targetCarrierId', '==', user.uid)
    ];

    const generalConditions = [
        where('requestType', '==', 'General'),
    ];

    // This is a simplified client-side query combination.
    // Firestore does not support logical OR on different fields in this manner.
    // We will fetch two separate queries and merge them on the client.
    
    let generalQuery = query(collection(firestore, 'trips'), ...baseConditions, ...generalConditions);
    let directQuery = query(collection(firestore, 'trips'), ...baseConditions, ...targetConditions);

    if (filterBySpecialization && userProfile?.primaryRoute?.origin && userProfile?.primaryRoute?.destination) {
        generalQuery = query(generalQuery, where('origin', '==', userProfile.primaryRoute.origin));
        generalQuery = query(generalQuery, where('destination', '==', userProfile.primaryRoute.destination));
        directQuery = query(directQuery, where('origin', '==', userProfile.primaryRoute.origin));
        directQuery = query(directQuery, where('destination', '==', userProfile.primaryRoute.destination));
    }
    
    if (userProfile?.vehicleCapacity && userProfile.vehicleCapacity > 0) {
        generalQuery = query(generalQuery, where('passengers', '<=', userProfile.vehicleCapacity));
        directQuery = query(directQuery, where('passengers', '<=', userProfile.vehicleCapacity));
    }

    return { generalQuery, directQuery };

  }, [firestore, user, filterBySpecialization, userProfile]);

  const { data: generalRequests, isLoading: isLoadingGeneral } = useCollection<Trip>(opportunitiesQuery?.generalQuery);
  const { data: directRequests, isLoading: isLoadingDirect } = useCollection<Trip>(opportunitiesQuery?.directQuery);
  
  const opportunities = useMemo(() => {
    const combined = [...(directRequests || []), ...(generalRequests || [])];
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
    // Sort to show direct requests first, then by date
    return unique.sort((a, b) => {
        if (a.requestType === 'Direct' && b.requestType !== 'Direct') return -1;
        if (b.requestType === 'Direct' && a.requestType !== 'Direct') return 1;
        return new Date(b.createdAt?.seconds * 1000).getTime() - new Date(a.createdAt?.seconds * 1000).getTime();
    });
  }, [generalRequests, directRequests]);

  const isLoading = isLoadingProfile || isLoadingGeneral || isLoadingDirect;

  const handleOfferClick = (trip: Trip) => {
    setSelectedTrip(trip);
    // Here you can have a unified dialog or fork based on trip.requestType
    if (trip.requestType === 'Direct') {
        // For direct requests, maybe a simpler approval dialog is needed.
        // For now, we use the same offer dialog.
    }
    setIsOfferDialogOpen(true);
  };

  const handleSendOffer = async (offerData: Omit<Offer, 'id' | 'tripId' | 'carrierId' | 'status' | 'createdAt'>): Promise<boolean> => {
    // This function will need to be implemented, similar to the one in the old `requests/page.tsx`
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


  if (isLoading) {
    return <LoadingState />;
  }
  
  const canFilter = !!(userProfile?.primaryRoute?.origin && userProfile?.primaryRoute?.destination);
  const hasCapacity = !!(userProfile?.vehicleCapacity && userProfile.vehicleCapacity > 0);

  if (!canFilter || !hasCapacity) {
    return <NoSpecializationState />;
  }
  
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

        {opportunities && opportunities.length > 0 ? (
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
        ) : (
            <NoOpportunitiesState isFiltered={filterBySpecialization && canFilter} />
        )}
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
