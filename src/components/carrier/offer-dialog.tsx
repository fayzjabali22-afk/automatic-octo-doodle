'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Trip, Offer } from '@/lib/data';
import { Loader2, Send, Sparkles, ListChecks } from 'lucide-react';
import React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { useUserProfile } from '@/hooks/use-user-profile';
import { SuggestOfferPriceOutput } from '@/ai/flows/suggest-offer-price-flow';

const offerFormSchema = z.object({
  price: z.coerce.number().positive('يجب أن يكون السعر رقماً موجباً'),
  currency: z.string().min(1, "العملة مطلوبة").max(10, "رمز العملة طويل جداً"),
  vehicleType: z.string().min(3, 'نوع المركبة مطلوب'),
  depositPercentage: z.coerce.number().min(0).max(25, "نسبة العربون لا يمكن أن تتجاوز 25%"),
  notes: z.string().optional(),
  conditions: z.string().max(200, "الشروط يجب ألا تتجاوز 200 حرف").optional(),
});

type OfferFormValues = z.infer<typeof offerFormSchema>;

interface OfferDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trip: Trip;
  suggestion: SuggestOfferPriceOutput | null;
  isSuggestingPrice: boolean;
  onSuggestPrice: () => void;
  onSendOffer: (offerData: Omit<Offer, 'id' | 'tripId' | 'carrierId' | 'status' | 'createdAt'>) => Promise<boolean>;
}

export function OfferDialog({ isOpen, onOpenChange, trip, suggestion, isSuggestingPrice, onSuggestPrice, onSendOffer }: OfferDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useUserProfile();

  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      price: undefined,
      vehicleType: '',
      depositPercentage: 10,
      notes: '',
      conditions: '',
      currency: 'د.أ',
    },
  });
  
  const conditionsValue = form.watch('conditions');
  const priceValue = form.watch('price');
  const depositPercentageValue = form.watch('depositPercentage');

  const depositAmount = useMemo(() => {
    const price = priceValue || 0;
    const percentage = depositPercentageValue || 0;
    return (price * (percentage / 100)).toFixed(2);
  }, [priceValue, depositPercentageValue]);


  useEffect(() => {
    if (suggestion) {
        form.setValue('price', suggestion.suggestedPrice);
    }
  }, [suggestion, form]);

  useEffect(() => {
    if (isOpen) {
        // Reset specific fields but keep others that might be useful
        form.setValue('price', trip.targetPrice || undefined);
        form.setValue('vehicleType', profile?.vehicleType || '');
        
        const defaultConditions = [];
        if (profile?.bagsPerSeat) defaultConditions.push(`حقيبة ${profile.bagsPerSeat} لكل راكب.`);
        if (profile?.numberOfStops !== undefined) {
            if (profile.numberOfStops === 0) defaultConditions.push('الرحلة مباشرة بدون توقف.');
            else defaultConditions.push(`تتضمن الرحلة ${profile.numberOfStops} محطة توقف.`);
        }
        if (defaultConditions.length > 0) {
            form.setValue('conditions', defaultConditions.join('\n'));
        }

    }
  }, [profile, form, isOpen, trip]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    const success = await onSendOffer(data);
    if(success) {
      onOpenChange(false);
      form.reset();
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>تقديم عرض جديد</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل عرضك لرحلة {trip.origin} إلى {trip.destination}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>السعر الإجمالي</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="e.g., 100" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>العملة</FormLabel>
                        <FormControl>
                           <Input placeholder="د.أ، SAR..." {...field} maxLength={10} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
             
             <Button type="button" variant="outline" className="w-full" onClick={onSuggestPrice} disabled={isSuggestingPrice}>
                {isSuggestingPrice ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <Sparkles className="ml-2 h-4 w-4 text-yellow-500" />}
                {isSuggestingPrice ? 'جاري التفكير...' : 'اقترح لي سعراً مناسباً (AI)'}
             </Button>
            {suggestion && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
                    <p><strong>تعليل الاقتراح:</strong> {suggestion.justification}</p>
                </div>
            )}
            
             <FormField
                control={form.control}
                name="depositPercentage"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex justify-between items-center mb-2">
                            <FormLabel>نسبة العربون</FormLabel>
                            <span className="text-sm font-bold text-primary">قيمة العربون: {depositAmount} {form.watch('currency')}</span>
                        </div>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={String(field.value)}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر نسبة العربون" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {[0, 5, 10, 15, 20, 25].map(p => <SelectItem key={p} value={String(p)}>{p}%</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

             <FormField
              control={form.control}
              name="vehicleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع المركبة</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., GMC Yukon 2023" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="conditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='flex items-center gap-1'>
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                    شروط العرض (اختياري)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="شروط خاصة بهذا العرض فقط (مثل: التوقف في مكان محدد)"
                      className="resize-none"
                      {...field}
                      maxLength={200}
                    />
                  </FormControl>
                   <div className="text-xs text-muted-foreground text-left">
                        {conditionsValue?.length || 0}/200
                    </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات إضافية (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="اذكر أي تفاصيل إضافية هنا (مثل: التوقف للاستراحة، وجود واي فاي...)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                    <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري الإرسال...
                    </>
                ) : (
                    <>
                        <Send className="ml-2 h-4 w-4" />
                        إرسال العرض
                    </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
