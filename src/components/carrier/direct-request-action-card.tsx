'use client';
import { useState } from 'react';
import type { Trip, UserProfile } from '@/lib/data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Calendar, Users, ArrowRight, Loader2, Info, User, CircleDollarSign, CheckCheck, Ban, Wallet, Hourglass } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Badge } from '../ui/badge';


const cities: { [key: string]: string } = {
    damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص',
    amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
    riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام',
    cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة',
};
const getCityName = (key: string) => cities[key] || key;

const mockTravelers: { [key: string]: UserProfile } = {
    'traveler_mock_3': { id: 'traveler_mock_3', firstName: 'علي', lastName: 'حسن', email: 'ali@email.com' },
    'traveler_mock_4': { id: 'traveler_mock_4', firstName: 'سعيد', lastName: 'محمد', email: 'saeed@email.com' },
};

function UserInfo({ userId }: { userId: string }) {
    const firestore = useFirestore();
    const userProfileRef = firestore ? doc(firestore, 'users', userId) : null;
    // const { data: userProfile, isLoading } = useDoc<UserProfile>(userProfileRef);
    const userProfile = mockTravelers[userId];
    const isLoading = false;


    if (isLoading) return <Skeleton className="h-8 w-32" />;

    if (!userProfile) return <span className="font-bold">{userId}</span>;
    
    return (
        <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
                <AvatarFallback>{userProfile.firstName.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="font-bold">{userProfile?.firstName} {userProfile?.lastName}</span>
        </div>
    )
}

interface DirectRequestActionCardProps {
    tripRequest: Trip;
    onApprove: (trip: Trip, finalPrice: number, currency: string) => Promise<boolean>;
    onReject: (trip: Trip, reason: string) => Promise<boolean>;
}

export function DirectRequestActionCard({ tripRequest, onApprove, onReject }: DirectRequestActionCardProps) {
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [finalPrice, setFinalPrice] = useState<number | undefined>(tripRequest.price || tripRequest.targetPrice);
    const [currency, setCurrency] = useState(tripRequest.currency || 'د.أ');
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectionInput, setShowRejectionInput] = useState(false);

    const handleApproveClick = async () => {
        if (!finalPrice || finalPrice <= 0) {
            toast({ title: 'خطأ', description: 'الرجاء إدخال سعر صالح للموافقة.', variant: 'destructive' });
            return;
        }
        setIsProcessing(true);
        const success = await onApprove(tripRequest, finalPrice, currency);
        if (!success) {
            setIsProcessing(false); // Re-enable button on failure
        }
        // On success, the card will disappear from the list, so no need to set isProcessing to false.
    };

    const handleRejectClick = async () => {
        if (!rejectionReason) {
             toast({ title: 'خطأ', description: 'الرجاء توضيح سبب الاعتذار.', variant: 'destructive' });
            return;
        }
        setIsProcessing(true);
        const success = await onReject(tripRequest, rejectionReason);
         if (!success) {
            setIsProcessing(false);
        }
    }
    
    const isAwaitingFinalConfirmation = tripRequest.status === 'Pending-Carrier-Confirmation';

    if(isAwaitingFinalConfirmation) {
        return (
             <Card className="w-full shadow-md transition-shadow hover:shadow-lg border-yellow-500 border-2">
                 <CardHeader>
                    <Badge variant="outline" className="flex items-center gap-2 bg-yellow-100 text-yellow-800 border-yellow-300 w-fit">
                        <Hourglass className="h-4 w-4 animate-pulse" />
                        موافقة نهائية مطلوبة
                    </Badge>
                     <CardTitle className="text-base pt-2"><UserInfo userId={tripRequest.userId} /></CardTitle>
                    <CardDescription>
                        وافق المسافر على عرضك. مطلوب موافقتك النهائية لبدء عملية الدفع.
                    </CardDescription>
                 </CardHeader>
                  <CardContent className="space-y-4 pb-4">
                      <div className="p-3 bg-muted/50 rounded-lg border">
                            <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><Wallet className="h-4 w-4 text-primary"/>التفاصيل المالية المتفق عليها</h4>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">السعر الإجمالي:</span>
                                    <span className="font-bold text-lg">{tripRequest.price?.toFixed(2)} {tripRequest.currency}</span>
                                </div>
                            </div>
                        </div>
                  </CardContent>
                 <CardFooter className="flex flex-col gap-2 bg-muted/30 p-2">
                     <Button 
                        className="w-full bg-green-600 hover:bg-green-700 text-white" 
                        onClick={handleApproveClick}
                        disabled={isProcessing}
                    >
                        {isProcessing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <CheckCheck className="ml-2 h-4 w-4" />}
                        موافقة نهائية وإرسال فاتورة العربون
                    </Button>
                 </CardFooter>
             </Card>
        )
    }

    return (
        <Card className="w-full shadow-md transition-shadow hover:shadow-lg border-primary border-2">
            <CardHeader className="flex flex-row justify-between items-start pb-4">
                <div>
                    <CardTitle className="text-base"><UserInfo userId={tripRequest.userId} /></CardTitle>
                    <CardDescription>
                        طلب مباشر لرحلة: {getCityName(tripRequest.origin)} <ArrowRight className="inline h-3 w-3" /> {getCityName(tripRequest.destination)}
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pb-4">
                 <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <Users className="h-4 w-4 text-primary" />
                        <strong>عدد الركاب:</strong> {tripRequest.passengers}
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <Calendar className="h-4 w-4 text-primary" />
                        <strong>التاريخ المطلوب:</strong> {new Date(tripRequest.departureDate).toLocaleDateString('ar-SA')}
                    </div>
                </div>
                 {tripRequest.passengersDetails && tripRequest.passengersDetails.length > 0 && (
                     <div className="p-3 bg-muted/30 rounded-md border border-dashed">
                        <p className="font-bold text-xs mb-2 flex items-center gap-1"><Info className="h-4 w-4"/> المسافرون:</p>
                        <ul className="list-disc pr-5 text-xs text-muted-foreground">
                            {tripRequest.passengersDetails.map((p, i) => <li key={i}>{p.name} ({p.type === 'adult' ? 'بالغ' : 'طفل'})</li>)}
                        </ul>
                    </div>
                )}
                 {tripRequest.notes && (
                    <div className="p-3 bg-muted/30 rounded-md border border-dashed">
                        <p className="font-bold text-xs mb-2 flex items-center gap-1"><Info className="h-4 w-4"/> ملاحظات المسافر:</p>
                        <p className="text-sm text-muted-foreground">{tripRequest.notes}</p>
                    </div>
                 )}
                 
                 <div className="p-4 bg-muted/50 rounded-lg border">
                    <h4 className="font-bold text-base mb-3 flex items-center gap-2"><Wallet className="h-5 w-5 text-primary"/>حدد السعر النهائي</h4>
                     <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                             <Label htmlFor="price" className="sr-only">السعر</Label>
                             <Input 
                                id="price"
                                type="number" 
                                placeholder="السعر الإجمالي"
                                value={finalPrice}
                                onChange={(e) => setFinalPrice(Number(e.target.value))}
                                disabled={isProcessing}
                                className="text-lg"
                             />
                        </div>
                        <div>
                            <Label htmlFor="currency" className="sr-only">العملة</Label>
                            <Input
                                id="currency"
                                placeholder="العملة"
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                disabled={isProcessing}
                                className="text-lg"
                            />
                        </div>
                     </div>
                      {tripRequest.targetPrice && (
                        <p className="text-xs text-muted-foreground mt-2">
                            *ميزانية المسافر المستهدفة كانت ~{tripRequest.targetPrice} {tripRequest.currency}.
                        </p>
                      )}
                 </div>

            </CardContent>
            
            <CardFooter className="flex flex-col gap-2 bg-muted/30 p-2">
                {!showRejectionInput && (
                    <div className='flex gap-2 w-full'>
                        <Button 
                            className="w-full bg-green-600 hover:bg-green-700 text-white" 
                            onClick={handleApproveClick}
                            disabled={isProcessing}
                        >
                            {isProcessing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <CheckCheck className="ml-2 h-4 w-4" />}
                            موافقة وتحديد السعر
                        </Button>
                        <Button 
                            variant="secondary" 
                            className="w-full"
                            onClick={() => setShowRejectionInput(true)}
                            disabled={isProcessing}
                        >
                            <Ban className="ml-2 h-4 w-4" />
                            اعتذار عن الخدمة
                        </Button>
                    </div>
                )}
                {showRejectionInput && (
                     <div className="w-full space-y-2">
                         <Label htmlFor="rejectionReason">سبب الاعتذار (سيتم إرساله للمسافر)</Label>
                         <Textarea 
                            id="rejectionReason"
                            placeholder="مثال: تعارض في المواعيد، خارج نطاق خدمتي..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            disabled={isProcessing}
                         />
                         <div className="flex gap-2">
                             <Button variant="ghost" size="sm" onClick={() => setShowRejectionInput(false)} disabled={isProcessing}>إلغاء</Button>
                             <Button variant="destructive" className="flex-1" onClick={handleRejectClick} disabled={isProcessing}>
                                 {isProcessing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <X className="ml-2 h-4 w-4" />}
                                 تأكيد الاعتذار
                            </Button>
                         </div>
                     </div>
                )}
            </CardFooter>
        </Card>
    );
}
