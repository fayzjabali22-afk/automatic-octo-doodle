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
import { useState, useEffect } from 'react';
import type { Trip } from '@/lib/data';
import { Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';

export interface PassengerDetails {
  name: string;
  type: 'adult' | 'child';
}

interface BookingDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trip: Trip;
  seatCount: number;
  onConfirm: (passengers: PassengerDetails[]) => void;
  isProcessing: boolean;
}

export function BookingDialog({ isOpen, onOpenChange, trip, seatCount, onConfirm, isProcessing }: BookingDialogProps) {
    const { toast } = useToast();
    const [passengers, setPassengers] = useState<PassengerDetails[]>([]);

    useEffect(() => {
        if (isOpen) {
            setPassengers(Array(seatCount).fill({ name: '', type: 'adult' }));
        }
    }, [isOpen, seatCount]);


    const handlePassengerChange = (index: number, field: 'name' | 'type', value: string) => {
        const newPassengers = [...passengers];
        newPassengers[index] = { ...newPassengers[index], [field]: value };
        setPassengers(newPassengers);
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
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                <DialogTitle>تأكيد الحجز: تفاصيل الركاب</DialogTitle>
                <DialogDescription>
                    أنت على وشك حجز {seatCount} مقعد(مقاعد). الرجاء إدخال بيانات الركاب.
                </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="max-h-[60vh] p-4">
                    <div className="space-y-6">
                        {Array.from({ length: seatCount }).map((_, index) => (
                        <div key={index} className="p-4 border rounded-lg space-y-4 bg-muted/50">
                            <Label className="font-bold">الراكب {index + 1}</Label>
                            <div className="grid gap-2">
                                <Label htmlFor={`name-${index}`}>الاسم الكامل</Label>
                                <Input
                                    id={`name-${index}`}
                                    placeholder="أدخل الاسم الكامل للراكب"
                                    value={passengers[index]?.name || ''}
                                    onChange={(e) => handlePassengerChange(index, 'name', e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>الفئة العمرية</Label>
                                <RadioGroup
                                    defaultValue="adult"
                                    className="flex gap-4"
                                    value={passengers[index]?.type || 'adult'}
                                    onValueChange={(value) => handlePassengerChange(index, 'type', value)}
                                >
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                        <RadioGroupItem value="adult" id={`adult-${index}`} />
                                        <Label htmlFor={`adult-${index}`}>بالغ</Label>
                                    </div>
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                        <RadioGroupItem value="child" id={`child-${index}`} />
                                        <Label htmlFor={`child-${index}`}>طفل</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>
                        ))}
                    </div>
                </ScrollArea>
                
                <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isProcessing}>إلغاء</Button>
                <Button type="submit" onClick={handleSubmit} disabled={isProcessing}>
                    {isProcessing ? (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="ml-2 h-4 w-4" />
                    )}
                    {isProcessing ? 'جاري الإرسال...' : 'إرسال طلب الحجز'}
                </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
