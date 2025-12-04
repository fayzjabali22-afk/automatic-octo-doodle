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
  booking?: Booking | null; // MODIFIED: Can be null
  offer?: Offer; // Optional, for scenarios where this is a new booking from an offer
  onConfirm: () => void; // MODIFIED: No longer passes passengers
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

    const carrierProfileRef = useMemo(() => {
        if (!firestore || !trip.carrierId) return null;
        return doc(firestore, 'users', trip.carrierId);
    }, [firestore, trip.carrierId]);

    const { data: carrierProfile } = useDoc<UserProfile>(carrierProfileRef);

    const { totalAmount, depositAmount, remainingAmount, currency, depositPercentage } = useMemo(() => {
        const pricePerSeat = offer?.price || trip.price || 0;
        const seatCount = booking?.seats || trip.passengers || 1;
        const total = pricePerSeat * seatCount;
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
    }, [offer, trip, booking]);


    const handleCopy = () => {
        const paymentInfo = carrierProfile?.paymentInformation || "الدفع نقداً عند الالتقاء (لم يحدد الناقل طريقة أخرى).";
        navigator.clipboard.writeText(paymentInfo);
        toast({ title: 'تم نسخ تعليمات الدفع بنجاح!' });
    };

    const handleSubmit = () => {
        // No validation needed as we are not collecting data anymore
        onConfirm();
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
                                        <span>السعر الإجمالي ({booking?.seats || trip.passengers || 1} مقاعد)</span>
                                        <span className="font-bold">{totalAmount.toFixed(2)} {currency}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between font-bold text-lg pt-1 text-accent-foreground dark:text-accent">
                                        <span className="flex items-center gap-2">
                                            <CreditCard className="inline-block h-5 w-5" />
                                            العربون المطلوب ({depositPercentage}%)
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

                        {/* Passenger Details READ-ONLY */}
                        {booking?.passengersDetails && booking.passengersDetails.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="font-semibold text-sm flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">3</span>
                                    بيانات الركاب ({booking.passengersDetails.length})
                                </h3>
                                <div className="p-3 border rounded-lg space-y-2 bg-muted/30">
                                    <ul className="list-disc pr-4 space-y-1">
                                    {booking.passengersDetails.map((p, index) => (
                                        <li key={index} className="text-sm">{p.name} ({p.type === 'adult' ? 'بالغ' : 'طفل'})</li>
                                    ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                        
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
                                تم التحويل، أكّد الحجز
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
