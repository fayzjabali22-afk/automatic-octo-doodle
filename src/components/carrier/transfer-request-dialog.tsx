'use client';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { Trip, UserProfile, TransferRequest } from '@/lib/data';
import { Loader2, Send, Users, ArrowRight, UserCheck, Search } from 'lucide-react';
import { useCollection, useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, serverTimestamp } from 'firebase/firestore';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';

interface TransferRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trip: Trip | null;
}

const cities: { [key: string]: string } = {
    damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص',
    amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
    riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام',
    cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة',
};
const getCityName = (key: string) => cities[key] || key;


function CarrierListItem({ carrier, onSelect, isSelected }: { carrier: UserProfile, onSelect: (carrier: UserProfile) => void, isSelected: boolean }) {
    return (
        <div 
            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-primary/20 border-primary' : 'hover:bg-muted/50 border-transparent'} border-2`}
            onClick={() => onSelect(carrier)}
        >
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarFallback>{carrier.firstName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-bold text-sm">{carrier.firstName} {carrier.lastName}</p>
                    <p className="text-xs text-muted-foreground">يعمل على نفس الخط</p>
                </div>
            </div>
            {isSelected && <UserCheck className="h-5 w-5 text-primary" />}
        </div>
    )
}

export function TransferRequestDialog({ isOpen, onOpenChange, trip }: TransferRequestDialogProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedCarrier, setSelectedCarrier] = useState<UserProfile | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const carriersQuery = useMemo(() => {
        if (!firestore || !trip || !user) return null;
        return query(
            collection(firestore, 'users'),
            where('role', '==', 'carrier'),
            where('primaryRoute.origin', '==', trip.origin),
            where('primaryRoute.destination', '==', trip.destination),
        );
    }, [firestore, trip, user]);

    const { data: availableCarriers, isLoading } = useCollection<UserProfile>(carriersQuery);
    
    const filteredCarriers = useMemo(() => {
        if (!availableCarriers) return [];
        return availableCarriers.filter(c => 
            c.id !== user?.uid && 
            (c.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) || c.lastName?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [availableCarriers, searchTerm, user]);

    const totalPassengers = useMemo(() => {
        return trip?.bookingIds?.length || 0;
    }, [trip]);


    const handleSendRequest = async () => {
        if (!firestore || !user || !trip || !selectedCarrier) {
            toast({ title: 'خطأ', description: 'الرجاء اختيار ناقل لإرسال العرض إليه', variant: 'destructive'});
            return;
        }
        setIsSubmitting(true);
        
        try {
            const transferRequestsCollection = collection(firestore, 'transferRequests');
            
            const newTransferRequest: Omit<TransferRequest, 'id'> = {
                originalTripId: trip.id,
                fromCarrierId: user.uid,
                toCarrierId: selectedCarrier.id,
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                tripDetails: {
                    origin: trip.origin,
                    destination: trip.destination,
                    departureDate: trip.departureDate,
                    passengerCount: totalPassengers
                }
            };
            
            await addDocumentNonBlocking(transferRequestsCollection, newTransferRequest);

            toast({
                title: 'تم إرسال طلب النقل بنجاح!',
                description: `تم إرسال طلب نقل الرحلة إلى الناقل ${selectedCarrier.firstName}.`,
            });
            onOpenChange(false);
            
        } catch (error) {
             toast({
                title: 'فشل إرسال الطلب',
                description: 'حدث خطأ أثناء إنشاء طلب النقل.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>طلب نقل رحلة وركابها</DialogTitle>
                    <DialogDescription>
                        اختر ناقلاً بديلاً من زملائك الذين يعملون على نفس خط السير.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="p-3 bg-muted rounded-lg border border-dashed text-sm">
                        <p className="font-bold flex items-center justify-between">
                            <span>الرحلة: {getCityName(trip?.origin || '')} <ArrowRight className="inline h-3 w-3"/> {getCityName(trip?.destination || '')}</span>
                            <span className="flex items-center gap-1"><Users className="h-4 w-4"/> {totalPassengers}</span>
                        </p>
                        <p className="text-xs text-muted-foreground pt-1">التاريخ: {trip?.departureDate ? new Date(trip.departureDate).toLocaleDateString('ar-SA') : '...'}</p>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="ابحث عن اسم الناقل..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    
                    <ScrollArea className="h-64 border rounded-md">
                        <div className="p-2 space-y-1">
                            {isLoading ? (
                                <div className="p-4 text-center text-muted-foreground">جاري تحميل قائمة الناقلين...</div>
                            ) : filteredCarriers.length > 0 ? (
                                filteredCarriers.map(carrier => (
                                    <CarrierListItem 
                                        key={carrier.id} 
                                        carrier={carrier}
                                        onSelect={setSelectedCarrier}
                                        isSelected={selectedCarrier?.id === carrier.id}
                                    />
                                ))
                            ) : (
                                 <div className="p-4 text-center text-muted-foreground">لا يوجد ناقلون متاحون على هذا الخط حالياً.</div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
                
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>إلغاء</Button>
                    <Button type="button" onClick={handleSendRequest} disabled={!selectedCarrier || isSubmitting}>
                        {isSubmitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <Send className="ml-2 h-4 w-4"/>}
                        إرسال عرض نقل الرحلة
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
