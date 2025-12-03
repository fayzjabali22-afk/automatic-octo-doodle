'use client';

import { useState } from 'react';
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
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import type { Trip } from '@/lib/data';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { suggestOfferPrice } from '@/ai/flows/suggest-offer-price-flow';

const offerFormSchema = z.object({
  price: z.coerce.number().positive('يجب أن يكون السعر رقماً موجباً'),
  vehicleType: z.string().min(3, 'نوع المركبة مطلوب'),
  depositPercentage: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

type OfferFormValues = z.infer<typeof offerFormSchema>;

interface OfferDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trip: Trip;
}

export function OfferDialog({ isOpen, onOpenChange, trip }: OfferDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: carrierUser } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggestingPrice, setIsSuggestingPrice] = useState(false);

  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      price: undefined,
      vehicleType: '',
      depositPercentage: 20,
      notes: '',
    },
  });

  const handleSuggestPrice = async () => {
    setIsSuggestingPrice(true);
    try {
        const result = await suggestOfferPrice({
            origin: trip.origin,
            destination: trip.destination,
            passengers: trip.passengers || 1,
            departureDate: trip.departureDate,
        });

        form.setValue('price', result.suggestedPrice, { shouldValidate: true });
        toast({
            title: '💡 اقتراح السعر الذكي',
            description: result.justification,
        });

    } catch (error) {
        console.error("AI Price Suggestion Error:", error);
        toast({
            variant: 'destructive',
            title: 'خطأ في الاقتراح',
            description: 'لم نتمكن من اقتراح سعر في الوقت الحالي.'
        });
    } finally {
        setIsSuggestingPrice(false);
    }
  }

  const onSubmit = async (data: OfferFormValues) => {
    if (!firestore || !carrierUser) {
      toast({
        variant: 'destructive',
        title: 'خطأ في المصادقة',
        description: 'يجب أن تكون ناقلاً مسجلاً لتقديم العروض.',
      });
      return;
    }
    setIsSubmitting(true);

    try {
      const offersCollection = collection(firestore, 'trips', trip.id, 'offers');
      const newOffer = {
        tripId: trip.id,
        carrierId: carrierUser.uid,
        price: data.price,
        vehicleType: data.vehicleType,
        notes: data.notes,
        depositPercentage: data.depositPercentage,
        status: 'Pending',
        createdAt: serverTimestamp(),
      };
      await addDocumentNonBlocking(offersCollection, newOffer);

      const notificationsCollection = collection(firestore, 'notifications');
      await addDocumentNonBlocking(notificationsCollection, {
        userId: trip.userId,
        title: 'لديك عرض جديد!',
        message: `وصلك عرض جديد لرحلتك من ${trip.origin} إلى ${trip.destination}.`,
        type: 'new_offer',
        isRead: false,
        link: `/history#${trip.id}`,
        createdAt: serverTimestamp(),
      });
      
      toast({
        title: 'تم إرسال العرض بنجاح',
        description: 'سيتم إعلام المسافر بعرضك.',
      });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Failed to submit offer:', error);
      toast({
        variant: 'destructive',
        title: 'فشل إرسال العرض',
        description: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
      });
    } finally {
      setIsSubmitting(false);
    }
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>السعر الإجمالي (بالدينار)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 100" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="depositPercentage"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>نسبة العربون (%)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 20" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleSuggestPrice}
                disabled={isSuggestingPrice}
            >
                {isSuggestingPrice ? (
                     <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                    <Sparkles className="ml-2 h-4 w-4 text-accent" />
                )}
               اقترح لي سعراً (AI)
            </Button>
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
