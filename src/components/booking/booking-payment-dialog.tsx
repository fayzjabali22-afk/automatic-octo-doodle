'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect, useMemo } from 'react';
import type { Offer, Trip, UserProfile, Booking } from '@/lib/data';
import { Send, Loader2, CreditCard, Banknote, Clipboard, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';

export interface PassengerDetails {
  name: string;
  type: 'adult' | 'child';
}

interface BookingPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trip: Trip;
  booking?: Booking; // Optional, for scenarios where booking already exists
  offer?: Offer; // Optional, for scenarios where this is a new booking from an offer
  onConfirm: (passengers: PassengerDetails[]) => void;
  isProcessing?: boolean;
}

export function BookingPaymentDialog({ 
  isOpen, 
  onOpenChange, 
  trip, 
  booking,
  offer,
  onConfirm, 
  isProcessing = false 
}: BookingPaymentDialogProps) {
    const { toast } = useToast();
    const firestore = useFirestore();

    const initialSeatCount = useMemo(() => booking?.seats || trip?.passengers || 1, [booking, trip]);
    const [passengers, setPassengers] = useState<PassengerDetails[]>([]);

    const carrierProfileRef = useMemo(() => {
        if (!firestore || !trip.carrierId) return null;
        return doc(firestore, 'users', trip.carrierId);
    }, [firestore, trip.carrierId]);

    const { data: carrierProfile } = useDoc<UserProfile>(carrierProfileRef);

    const { totalAmount, depositAmount, remainingAmount, currency, depositPercentage } = useMemo(() => {
        const pricePerSeat = offer?.price || trip.price || 0;
        const total = pricePerSeat * initialSeatCount;
        const depositPerc = offer?.depositPercentage || trip.depositPercentage || 20;
        const deposit = total * (depositPerc / 100);
        const remaining = total - deposit;
        return { 
            totalAmount: total, 
            depositAmount: deposit, 
            remainingAmount: remaining,
            currency: offer?.currency || trip.currency || 'USD',
            depositPercentage: depositPerc,
        };
    }, [offer, trip, initialSeatCount]);

    useEffect(() => {
        if (isOpen) {
            const initialPassengers = booking?.passengersDetails || Array.from({ length: initialSeatCount }, () => ({ name: '', type: 'adult' as 'adult' }));
            setPassengers(initialPassengers);
        }
    }, [isOpen, initialSeatCount, booking]);

    const handlePassengerChange = (index: number, field: keyof PassengerDetails, value: string) => {
        setPassengers(prev => {
            const newPassengers = [...prev];
            newPassengers[index] = { ...newPassengers[index], [field]: value as any }; 
            return newPassengers;
        });
    };

    const handleCopy = () => {
        const paymentInfo = carrierProfile?.paymentInformation || "الدفع نقداً عند الالتقاء (لم يحدد الناقل طريقة أخرى).";
        navigator.clipboard.writeText(paymentInfo);
        toast({ title: 'تم نسخ تعليمات الدفع بنجاح!' });
    };

    const handleSubmit = () => {
        const allNamesFilled = passengers.every(p => p.name.trim() !== '');
        if (!allNamesFilled) {
            toast({
                variant: 'destructive',
                title: 'بيانات غير مكتملة',
                description: 'الرجاء إدخال أسماء جميع الركاب.',
            });
            return;
        }
        onConfirm(passengers);
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && onOpenChange(open)}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>إتمام الحجز - الخطوة الأخيرة</DialogTitle>
                    <DialogDescription>
                        يرجى مراجعة التفاصيل المالية وتحويل العربون للناقل مباشرة.
                    </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="max-h-[60vh] p-1 pr-4">
                    <div className="space-y-6">
                        
                        {/* Financial Summary */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">1</span>
                                الفاتورة النهائية
                            </h3>
                            <Card className="bg-muted/50">
                                <CardContent className="p-4 space-y-2 text-sm">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>السعر الإجمالي ({initialSeatCount} مقاعد)</span>
                                        <span className="font-bold">{totalAmount.toFixed(2)} {currency}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between font-bold text-lg pt-1 text-primary">
                                        <span>
                                            <CreditCard className="inline-block ml-2 h-5 w-5" />
                                            العربون المطلوب (الآن)
                                        </span>
                                        <span>{depositAmount.toFixed(2)} {currency}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground text-xs pt-1">
                                        <span>
                                            <Banknote className="inline-block ml-2 h-4 w-4" />
                                            المبلغ المتبقي (عند لقاء الناقل)
                                        </span>
                                        <span>{remainingAmount.toFixed(2)} {currency}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Payment Instructions */}
                        <div className="space-y-3">
                             <h3 className="font-semibold text-sm flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">2</span>
                                طريقة الدفع (تعليمات الناقل)
                            </h3>
                            <div className="p-4 border rounded-lg bg-background relative">
                                <Button size="icon" variant="ghost" className="absolute top-2 left-2 h-7 w-7" onClick={handleCopy}>
                                    <Clipboard className="h-4 w-4" />
                                </Button>
                                <p className="text-sm whitespace-pre-wrap">
                                    {carrierProfile?.paymentInformation || "الدفع نقداً عند الالتقاء (لم يحدد الناقل طريقة أخرى)."}
                                </p>
                            </div>
                        </div>

                        {/* Passenger Details */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">3</span>
                                بيانات الركاب ({initialSeatCount})
                            </h3>
                            {passengers.map((passenger, index) => (
                            <div key={index} className="p-3 border rounded-lg space-y-3 bg-card">
                                <Label className="text-xs text-muted-foreground">الراكب {index + 1}</Label>
                                <div className="grid gap-3">
                                    <Input
                                        placeholder="الاسم الكامل"
                                        value={passenger.name}
                                        onChange={(e) => handlePassengerChange(index, 'name', e.target.value)}
                                        disabled={isProcessing}
                                        className="h-9"
                                    />
                                    <RadioGroup
                                        value={passenger.type}
                                        onValueChange={(value) => handlePassengerChange(index, 'type', value)}
                                        className="flex gap-2"
                                        disabled={isProcessing}
                                    >
                                        <div className="flex items-center space-x-2 rtl:space-x-reverse border px-3 py-1.5 rounded-md bg-background flex-1 cursor-pointer hover:bg-accent/50">
                                            <RadioGroupItem value="adult" id={`adult-${index}`} />
                                            <Label htmlFor={`adult-${index}`} className="cursor-pointer text-sm">بالغ</Label>
                                        </div>
                                        <div className="flex items-center space-x-2 rtl:space-x-reverse border px-3 py-1.5 rounded-md bg-background flex-1 cursor-pointer hover:bg-accent/50">
                                            <RadioGroupItem value="child" id={`child-${index}`} />
                                            <Label htmlFor={`child-${index}`} className="cursor-pointer text-sm">طفل</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>
                            ))}
                        </div>
                         <Alert variant="destructive" className="bg-black text-white border-destructive">
                            <Info className="h-4 w-4 !text-destructive" />
                            <AlertTitle className="font-bold !text-destructive">إقرار هام</AlertTitle>
                            <AlertDescription className="text-xs !text-white/80">
                                بالضغط على الزر أدناه، أنت تقر بأنك قمت بتحويل مبلغ العربون مباشرة إلى الناقل بناءً على التعليمات المذكورة. التطبيق هو وسيط ولا يتحمل مسؤولية التحويلات المالية.
                            </AlertDescription>
                        </Alert>
                    </div>
                </ScrollArea>
                
                <DialogFooter className="gap-2 pt-4">
                    <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)} 
                        disabled={isProcessing}
                    >
                        إلغاء
                    </Button>
                    <Button 
                        type="submit" 
                        onClick={handleSubmit} 
                        disabled={isProcessing}
                        className="w-full sm:w-auto min-w-[180px]"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                جاري التأكيد...
                            </>
                        ) : (
                            <>
                                <Send className="ml-2 h-4 w-4" />
                                {offer ? 'أوافق على العرض' : 'تم التحويل، أكّد الحجز'}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
