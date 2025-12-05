'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Trip } from '@/lib/data';
import { Loader2, Send, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';


interface RateTripDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trip: Trip | null;
  onConfirm: () => void; // Callback to close the parent dialog
}

const ratingSchema = z.object({
  vehicleQuality: z.number().min(1, 'التقييم مطلوب').max(5),
  vehicleCleanliness: z.number().min(1, 'التقييم مطلوب').max(5),
  driverCourtesy: z.number().min(1, 'التقييم مطلوب').max(5),
  drivingProfessionalism: z.number().min(1, 'التقييم مطلوب').max(5),
  specificationCredibility: z.number().min(1, 'التقييم مطلوب').max(5),
  comment: z.string().optional(),
});

type RatingFormValues = z.infer<typeof ratingSchema>;

const ratingCriteria: { key: keyof RatingFormValues; label: string }[] = [
    { key: 'vehicleQuality', label: 'جودة المركبة' },
    { key: 'vehicleCleanliness', label: 'نظافة المركبة' },
    { key: 'driverCourtesy', label: 'تهذيب ومساعدة السائق' },
    { key: 'drivingProfessionalism', label: 'القيادة الآمنة والمهنية' },
    { key: 'specificationCredibility', label: 'مصداقية مواصفات المركبة' },
]

// Star rating component to be used inside the form
const StarRating = ({ value, onChange }: { value: number; onChange: (value: number) => void }) => {
  const [hoverValue, setHoverValue] = useState(0);
  return (
    <div className="flex gap-1" onMouseLeave={() => setHoverValue(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-6 w-6 cursor-pointer transition-colors',
            (hoverValue || value) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'
          )}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHoverValue(star)}
        />
      ))}
    </div>
  );
};


export function RateTripDialog({ isOpen, onOpenChange, trip, onConfirm }: RateTripDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RatingFormValues>({
    resolver: zodResolver(ratingSchema),
    defaultValues: {
      vehicleQuality: 0,
      vehicleCleanliness: 0,
      driverCourtesy: 0,
      drivingProfessionalism: 0,
      specificationCredibility: 0,
      comment: '',
    },
  });
  
  useEffect(() => {
    if (!isOpen) {
        form.reset();
    }
  }, [isOpen, form]);

  const onSubmit = async (data: RatingFormValues) => {
    if (!firestore || !trip) return;
    setIsSubmitting(true);
    
    // SIMULATION of backend logic
    setTimeout(() => {
        const ratingsArray = [
            data.vehicleQuality, 
            data.vehicleCleanliness, 
            data.driverCourtesy, 
            data.drivingProfessionalism, 
            data.specificationCredibility
        ];
        const averageRating = ratingsArray.reduce((acc, curr) => acc + curr, 0) / ratingsArray.length;
        
        console.log("SIMULATING RATING SUBMISSION", {
            tripId: trip.id,
            carrierId: trip.carrierId,
            ratingValue: averageRating,
            details: data,
            comment: data.comment,
        });
        
        console.log("SIMULATING TRIP STATUS UPDATE to Completed for trip:", trip.id);

        toast({
            title: 'محاكاة: تم إغلاق الرحلة بنجاح!',
            description: `شكراً لتقييمك. تم أرشفة الرحلة.`,
        });
        
        setIsSubmitting(false);
        onOpenChange(false);
        onConfirm();

    }, 1500);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>التقييم المعياري للرحلة</DialogTitle>
          <DialogDescription>
            تقييمك المفصل يساعدنا على ضمان أعلى مستويات الجودة.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2">
            
            <div className="space-y-4">
                {ratingCriteria.map((criterion) => (
                    <FormField
                        key={criterion.key}
                        control={form.control}
                        name={criterion.key as any}
                        render={({ field }) => (
                            <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3">
                                <FormLabel className="text-sm font-semibold">{criterion.label}</FormLabel>
                                <FormControl>
                                    <StarRating value={field.value as number} onChange={field.onChange} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                ))}
            </div>

            <Separator />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات إضافية (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="صف لنا تجربتك بشكل عام..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                العودة
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                    <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري الإرسال...</>
                ) : (
                    <><Send className="ml-2 h-4 w-4" /> إرسال التقييم وإغلاق الرحلة</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
