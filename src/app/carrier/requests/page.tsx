
'use client';
import { RequestCard } from '@/components/carrier/request-card';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { PackageOpen, Settings, AlertTriangle, ListFilter, Armchair, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Trip } from '@/lib/data';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { OfferDialog } from '@/components/carrier/offer-dialog';
import { suggestOfferPrice, type SuggestOfferPriceInput } from '@/ai/flows/suggest-offer-price-flow';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user-profile';

function LoadingState() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" />
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
                <Link href="/profile">
                    <Settings className="ml-2 h-4 w-4" />
                    الذهاب إلى الملف الشخصي
                </Link>
            </Button>
      </div>
    )
}

function NoRequestsState({ isFiltered }: { isFiltered: boolean }) {
     return (
      <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed rounded-lg bg-card/50">
        <PackageOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-bold">
            {isFiltered ? "لا توجد طلبات تطابق تخصصك وسعة مركبتك" : "لا توجد طلبات متاحة حالياً"}
        </h3>
        <p className="text-muted-foreground mt-2">
          {isFiltered ? "يمكنك إيقاف الفلترة لعرض كل طلبات السوق." : "سيتم عرض الطلبات الجديدة هنا فور وصولها."}
        </p>
      </div>
    );
}

export default function CarrierRequestsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile: userProfile, isLoading: isLoadingProfile } = useUserProfile();

  const [filterBySpecialization, setFilterBySpecialization] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [isGettingSuggestion, setIsGettingSuggestion] = useState(false);
  const [suggestion, setSuggestion] = useState<{price: number, justification: string} | null>(null);
  const { toast } = useToast();

  const canFilter = !!(userProfile?.primaryRoute?.origin && userProfile?.primaryRoute?.destination);
  
  const requestsQuery = useMemo(() => {
    if (!firestore) return null;

    let q = query(
        collection(firestore, 'trips'), 
        where('status', '==', 'Awaiting-Offers')
    );

    // Smart Filter: Filter by carrier's specialization route if enabled and defined
    if (filterBySpecialization && canFilter) {
        q = query(q, where('origin', '==', userProfile.primaryRoute!.origin));
        q = query(q, where('destination', '==', userProfile.primaryRoute!.destination));
    }
    
    // Filter out requests that exceed the carrier's vehicle capacity
    if (userProfile?.vehicleCapacity && userProfile.vehicleCapacity > 0) {
        q = query(q, where('passengers', '<=', userProfile.vehicleCapacity));
    }
    
    return query(q, orderBy('passengers', 'desc'), orderBy('departureDate', 'asc'));

  }, [firestore, filterBySpecialization, canFilter, userProfile]);

  const { data: requests, isLoading: isLoadingRequests } = useCollection<Trip>(requestsQuery);

  const isLoading = isLoadingProfile || isLoadingRequests;
  
  const handleOfferClick = (trip: Trip) => {
    setSuggestion(null); // Clear previous suggestion
    setSelectedTrip(trip);
    setIsOfferDialogOpen(true);
  }
  
  const handlePriceSuggestion = async () => {
    if (!selectedTrip) return;
    setIsGettingSuggestion(true);
    try {
        const input: SuggestOfferPriceInput = {
            origin: selectedTrip.origin,
            destination: selectedTrip.destination,
            passengers: selectedTrip.passengers || 1,
            departureDate: selectedTrip.departureDate
        };
        const result = await suggestOfferPrice(input);
        setSuggestion({
            price: result.suggestedPrice,
            justification: result.justification
        });
        toast({
            title: 'تم إنشاء الاقتراح بنجاح',
            description: 'تم تحديث حقل السعر بالاقتراح الجديد.',
        });
    } catch(e) {
        toast({
            variant: 'destructive',
            title: 'فشل إنشاء الاقتراح',
            description: 'حدث خطأ أثناء التواصل مع الذكاء الاصطناعي.',
        });
    } finally {
        setIsGettingSuggestion(false);
    }
  }

  if (isLoading) {
    return <LoadingState />;
  }
  
  const hasCapacity = !!(userProfile?.vehicleCapacity && userProfile.vehicleCapacity > 0);

  if (!canFilter || !hasCapacity) {
    return <NoSpecializationState />
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

        {requests && requests.length > 0 ? (
            <div className="space-y-3">
                {requests.map(req => (
                    <RequestCard key={req.id} tripRequest={req} onOffer={handleOfferClick} />
                ))}
            </div>
        ) : (
            <NoRequestsState isFiltered={filterBySpecialization && canFilter} />
        )}
    </div>
    {selectedTrip && (
        <OfferDialog
            isOpen={isOfferDialogOpen}
            onOpenChange={setIsOfferDialogOpen}
            trip={selectedTrip}
            suggestion={suggestion}
            onSuggestPrice={handlePriceSuggestion}
            isSuggestingPrice={isGettingSuggestion}
        />
    )}
    </>
  );
}
