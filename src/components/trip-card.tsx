'use client';
import type { Trip, CarrierProfile } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, Users, Briefcase, Calendar, ArrowRight, Info, CheckCircle } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import { useRouter } from 'next/navigation';
import { AuthRedirectDialog } from './auth-redirect-dialog';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const cities: { [key: string]: string } = {
    damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص',
    amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
    riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام',
    cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة',
    dubai: 'دبي', kuwait: 'الكويت'
};

const CarrierInfo = ({ carrierId, carrierName }: { carrierId?: string, carrierName?: string }) => {
    const firestore = useFirestore();
    const carrierRef = useMemoFirebase(() => {
        if (!firestore || !carrierId) return null;
        return doc(firestore, 'carriers', carrierId);
    }, [firestore, carrierId]);

    const { data: carrier, isLoading } = useDoc<CarrierProfile>(carrierRef);
    const carrierImage = PlaceHolderImages.find((img) => img.id === 'user-avatar');

    if (isLoading) {
        return (
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[120px]" />
                    <Skeleton className="h-3 w-[80px]" />
                </div>
            </div>
        )
    }

    const name = carrier?.name || carrierName || 'ناقل غير معروف';

    return (
        <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary">
                {carrierImage && <AvatarImage src={carrierImage.imageUrl} alt={name} />}
                <AvatarFallback>{name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <p className="font-bold text-sm text-foreground">{name}</p>
                <div className="flex items-center text-xs text-muted-foreground gap-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    <span>{carrier?.averageRating || 'جديد'}</span>
                </div>
            </div>
        </div>
    )
}


export function TripCard({ trip }: { trip: Trip }) {
    const router = useRouter();
    const { user } = useUser();
    const { toast } = useToast();
    const [isAuthRedirectOpen, setIsAuthRedirectOpen] = useState(false);


    const handleBooking = () => {
         if (!user) {
            setIsAuthRedirectOpen(true);
            return;
        }
        if (user && !user.emailVerified) {
            toast({
                variant: "destructive",
                title: "الحساب غير مفعل",
                description: "الرجاء تفعيل حسابك أولاً لتتمكن من الحجز.",
            });
            return;
        }
        // For now, we just log it.
        console.log("Booking trip:", trip.id);
        toast({
            title: 'قيد الإنشاء',
            description: 'سيتم قريباً تفعيل الحجز المباشر من هنا.',
        });
        // router.push(`/book/${trip.id}`);
    }

    const originCity = cities[trip.origin] || trip.origin;
    const destinationCity = cities[trip.destination] || trip.destination;

    return (
        <>
            <Card className="flex flex-col justify-between w-full overflow-hidden shadow-md transition-all hover:shadow-lg hover:border-primary/50 border-border/60">
                <CardHeader>
                    <CarrierInfo carrierId={trip.carrierId} carrierName={trip.carrierName} />
                    <div className="flex justify-between items-center pt-2">
                         <div className="flex items-center gap-2 text-lg font-bold text-primary">
                           <span>{originCity}</span>
                           <ArrowRight className="h-5 w-5"/>
                           <span>{destinationCity}</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between items-center text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(trip.departureDate).toLocaleDateString('ar-EG', { month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{trip.availableSeats} مقاعد متاحة</span>
                        </div>
                    </div>
                     <div className="p-3 bg-background/50 rounded-md border border-dashed border-border">
                        <p className="flex items-center gap-1 text-xs">
                            <Info className="h-3 w-3 text-accent" />
                            <strong>معلومات إضافية:</strong>
                        </p>
                        <ul className="text-xs list-disc pr-5 mt-1 space-y-1 text-muted-foreground">
                            {trip.vehicleType && <li>نوع المركبة: {trip.vehicleType}</li>}
                            {trip.price !== undefined && <li>السعر للمقعد: {trip.price} دينار أردني</li>}
                            {trip.depositPercentage !== undefined && <li>يتطلب عربون بنسبة {trip.depositPercentage}%</li>}
                        </ul>
                    </div>
                </CardContent>
                <CardFooter className="p-2 bg-background/30">
                    <Button className="w-full" onClick={handleBooking}>
                        <CheckCircle className="ml-2 h-4 w-4"/>
                        حجز مقعد
                    </Button>
                </CardFooter>
            </Card>
            <AuthRedirectDialog
                isOpen={isAuthRedirectOpen}
                onOpenChange={setIsAuthRedirectOpen}
            />
        </>
    )
}
