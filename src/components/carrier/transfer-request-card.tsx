'use client';
import type { TransferRequest, UserProfile } from '@/lib/data';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Users, Calendar, ArrowRight, Check, X, Loader2 } from 'lucide-react';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';


const cities: { [key: string]: string } = {
    damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص',
    amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
    riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام',
    cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة',
};
const getCityName = (key: string) => cities[key] || key;

function FromCarrierInfo({ carrierId }: { carrierId: string }) {
    const firestore = useFirestore();
    const carrierRef = firestore ? doc(firestore, 'users', carrierId) : null;
    const { data: carrier, isLoading } = useDoc<UserProfile>(carrierRef);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className='space-y-1'>
                    <Skeleton className="h-4 w-24" />
                     <Skeleton className="h-3 w-16" />
                </div>
            </div>
        );
    }
    
    if (!carrier) return <p>ناقل غير معروف</p>;

    return (
        <div className="flex items-center gap-3">
             <Avatar className="h-8 w-8">
                <AvatarFallback>{carrier.firstName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                 <p className="text-sm font-bold">{carrier.firstName} {carrier.lastName}</p>
                 <p className="text-xs text-muted-foreground">زميل ناقل</p>
            </div>
        </div>
    );
}

interface TransferRequestCardProps {
    request: TransferRequest;
}

export function TransferRequestCard({ request }: TransferRequestCardProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();
    
    const { tripDetails } = request;

    const handleAccept = () => {
        setIsProcessing(true);
        toast({ title: "قيد التطوير", description: "سيتم تفعيل منطق القبول قريباً."});
        setTimeout(() => setIsProcessing(false), 1500);
    }

    const handleReject = () => {
        setIsProcessing(true);
        toast({ title: "قيد التطوير", description: "سيتم تفعيل منطق الرفض قريباً."});
        setTimeout(() => setIsProcessing(false), 1500);
    }

    return (
        <Card className="w-full shadow-lg border-2 border-orange-400 bg-orange-500/5">
            <CardHeader>
                <CardTitle className="text-base">
                    <FromCarrierInfo carrierId={request.fromCarrierId} />
                </CardTitle>
                <CardDescription className="pt-1">
                    طلب استلام رحلة من زميل بسبب ظرف طارئ.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-center font-bold text-lg">
                    <span>{getCityName(tripDetails.origin)}</span>
                    <ArrowRight className="mx-2 h-5 w-5 text-primary" />
                    <span>{getCityName(tripDetails.destination)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-center">
                    <div className="p-2 bg-muted rounded-md flex items-center justify-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(tripDetails.departureDate).toLocaleDateString('ar-SA')}</span>
                    </div>
                     <div className="p-2 bg-muted rounded-md flex items-center justify-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{tripDetails.passengerCount} ركاب</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex gap-2 bg-card p-2">
                 <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleAccept} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <Check className="ml-2 h-4 w-4" />}
                    قبول استلام الرحلة
                </Button>
                <Button variant="destructive" className="w-full" onClick={handleReject} disabled={isProcessing}>
                     {isProcessing ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <X className="ml-2 h-4 w-4" />}
                    رفض الطلب
                </Button>
            </CardFooter>
        </Card>
    );
}
