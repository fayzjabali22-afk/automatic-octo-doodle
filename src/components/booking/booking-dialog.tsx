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
  isProcessing?: boolean; // خاصية التحكم بحالة التحميل
}

export function BookingDialog({ 
  isOpen, 
  onOpenChange, 
  trip, 
  seatCount, 
  onConfirm, 
  isProcessing = false 
}: BookingDialogProps) {
    const { toast } = useToast();
    const [passengers, setPassengers] = useState<PassengerDetails[]>([]);

    useEffect(() => {
        if (isOpen) {
            // إعادة تعيين النموذج عند فتح النافذة
            setPassengers(Array.from({ length: seatCount }, () => ({ name: '', type: 'adult' })));
        }
    }, [isOpen, seatCount]);


    // دالة تحديث بيانات الراكب مع معالجة الأنواع
    const handlePassengerChange = (index: number, field: keyof PassengerDetails, value: string) => {
        setPassengers(prev => {
            const newPassengers = [...prev];
            // Type assertion here ensures typescript is happy treating the string as the specific union type
            newPassengers[index] = { ...newPassengers[index], [field]: value as any }; 
            return newPassengers;
        });
    };

    const handleSubmit = () => {
        const allNamesFilled = passengers.every(p => p.name.trim() !== '');
        if (!allNamesFilled) {
            toast({
                variant: 'destructive',
                title: 'بيانات غير مكتملة',
                description: 'الرجاء إدخال أسماء جميع الركاب لإتمام الحجز.',
            });
            return;
        }
        onConfirm(passengers);
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && onOpenChange(open)}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                <DialogTitle>تأكيد الحجز: تفاصيل الركاب</DialogTitle>
                <DialogDescription>
                    أنت على وشك حجز {seatCount} مقعد(مقاعد) لرحلة {trip.origin} - {trip.destination}.
                </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="max-h-[60vh] p-1 pr-4">
                    <div className="space-y-6">
                        {passengers.map((passenger, index) => (
                        <div key={index} className="p-4 border rounded-lg space-y-4 bg-muted/30">
                            <Label className="font-bold text-primary">الراكب {index + 1}</Label>
                            
                            {/* حقل الاسم */}
                            <div className="grid gap-2">
                                <Label htmlFor={`name-${index}`}>الاسم الكامل</Label>
                                <Input
                                    id={`name-${index}`}
                                    placeholder="أدخل الاسم الكامل كما في الهوية"
                                    value={passenger.name}
                                    onChange={(e) => handlePassengerChange(index, 'name', e.target.value)}
                                    disabled={isProcessing}
                                    className="bg-background"
                                />
                            </div>

                            {/* خيارات الفئة العمرية */}
                            <div className="grid gap-2">
                                <Label>الفئة العمرية</Label>
                                <RadioGroup
                                    value={passenger.type}
                                    onValueChange={(value) => handlePassengerChange(index, 'type', value)}
                                    className="flex gap-4"
                                    disabled={isProcessing}
                                >
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse border p-2 rounded-md bg-background flex-1 justify-center cursor-pointer hover:bg-accent/50 transition-colors">
                                        <RadioGroupItem value="adult" id={`adult-${index}`} />
                                        <Label htmlFor={`adult-${index}`} className="cursor-pointer">بالغ</Label>
                                    </div>
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse border p-2 rounded-md bg-background flex-1 justify-center cursor-pointer hover:bg-accent/50 transition-colors">
                                        <RadioGroupItem value="child" id={`child-${index}`} />
                                        <Label htmlFor={`child-${index}`} className="cursor-pointer">طفل</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>
                        ))}
                    </div>
                </ScrollArea>
                
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={() => onOpenChange(false)} 
                        disabled={isProcessing}
                    >
                        إلغاء
                    </Button>
                    <Button 
                        type="submit" 
                        onClick={handleSubmit} 
                        disabled={isProcessing}
                        className="w-full sm:w-auto"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                جاري التأكيد...
                            </>
                        ) : (
                            <>
                                <Send className="ml-2 h-4 w-4" />
                                تأكيد الحجز
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
