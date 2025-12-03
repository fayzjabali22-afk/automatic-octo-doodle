'use client';
import { RequestCard } from '@/components/carrier/request-card';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { collection, query, where, doc, getDoc } from 'firebase/firestore';
import { PackageOpen, Settings, AlertTriangle, ListFilter, ShipWheel } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Trip, CarrierProfile } from '@/lib/data';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { OfferDialog } from '@/components/carrier/offer-dialog';

const mockRequests: Trip[] = [
    {
      id: 'mock_trip_1',
      userId: 'mock_user_1',
      origin: 'amman',
      destination: 'riyadh',
      departureDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      passengers: 2,
      status: 'Awaiting-Offers',
    },
    {
      id: 'mock_trip_2',
      userId: 'mock_user_2',
      origin: 'damascus',
      destination: 'amman',
      departureDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      passengers: 1,
      status: 'Awaiting-Offers',
    },
    {
      id: 'mock_trip_3',
      userId: 'mock_user_3',
      origin: 'cairo',
      destination: 'jeddah',
      departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      passengers: 4,
      status: 'Awaiting-Offers',
    },
    {
      id: 'mock_trip_4',
      userId: 'mock_user_4',
      origin: 'amman',
      destination: 'damascus',
      departureDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      passengers: 3,
      status: 'Awaiting-Offers',
    },
];

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
            <h3 className="text-xl font-bold">يرجى تحديد تخصصك أولاً</h3>
            <p className="text-muted-foreground mt-2 max-w-md">
              للاستفادة من الفلترة الذكية، يرجى الذهاب إلى صفحة الملف الشخصي وتحديد "خط السير المفضل" الذي تعمل عليه.
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
            {isFiltered ? "لا توجد طلبات تطابق تخصصك" : "لا توجد طلبات متاحة حالياً"}
        </h3>
        <p className="text-muted-foreground mt-2">
          {isFiltered ? "يمكنك إيقاف الفلترة لعرض كل طلبات السوق." : "سيتم عرض الطلبات الجديدة هنا فور وصولها."}
        </p>
      </div>
    );
}


export default function CarrierRequestsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [carrierProfile, setCarrierProfile] = useState<CarrierProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [filterBySpecialization, setFilterBySpecialization] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);


  useEffect(() => {
    const fetchCarrierProfile = async () => {
      if (!firestore || !user) return;
      setIsLoadingProfile(true);
      const carrierRef = doc(firestore, 'carriers', user.uid);
      const carrierSnap = await getDoc(carrierRef);
      if (carrierSnap.exists()) {
        setCarrierProfile(carrierSnap.data() as CarrierProfile);
      }
      setIsLoadingProfile(false);
    };
    fetchCarrierProfile();
  }, [firestore, user]);


  const tripsQuery = useMemo(() => {
    if (!firestore) return null;
    let q = query(
      collection(firestore, 'trips'),
      where('status', '==', 'Awaiting-Offers')
    );
    return q;
  }, [firestore]);
  const { data: allRequests, isLoading: isLoadingRequests } = useCollection<Trip>(tripsQuery);
  
  const filteredRequests = useMemo(() => {
    const combinedRequests = [...mockRequests, ...(allRequests || [])];
    const uniqueRequests = Array.from(new Map(combinedRequests.map(item => [item.id, item])).values());

    if (filterBySpecialization && carrierProfile?.primaryRoute?.origin && carrierProfile.primaryRoute.destination) {
      const from = carrierProfile.primaryRoute.origin.toLowerCase();
      const to = carrierProfile.primaryRoute.destination.toLowerCase();
      return uniqueRequests.filter(req => 
        req.origin.toLowerCase() === from &&
        req.destination.toLowerCase() === to
      );
    }
    return uniqueRequests;
  }, [allRequests, filterBySpecialization, carrierProfile]);

  const isLoading = isLoadingProfile || isLoadingRequests;
  
  const handleOfferClick = (trip: Trip) => {
    setSelectedTrip(trip);
    setIsOfferDialogOpen(true);
  }

  if (isLoading) {
    return <LoadingState />;
  }
  
  const canFilter = !!(carrierProfile?.primaryRoute?.origin && carrierProfile?.primaryRoute?.destination);

  if (!canFilter && filterBySpecialization) {
    return <NoSpecializationState />
  }

  return (
    <>
    <div className="space-y-4">
        {canFilter && (
            <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse bg-card p-3 rounded-lg border">
                <Label htmlFor="filter-switch" className="flex items-center gap-2 font-semibold">
                    <ListFilter className="h-4 w-4" />
                    <span>فلترة حسب خط السير المفضل</span>
                </Label>
                <Switch
                    id="filter-switch"
                    checked={filterBySpecialization}
                    onCheckedChange={setFilterBySpecialization}
                />
            </div>
        )}

        {filteredRequests && filteredRequests.length > 0 ? (
            <div className="space-y-3">
                {filteredRequests.map(req => (
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
        />
    )}
    </>
  );
}
