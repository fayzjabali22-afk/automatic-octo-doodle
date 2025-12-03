'use client';

import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { Trip } from '@/lib/data';
import { Loader2, Minus, Plus, Save } from 'lucide-react';

interface EditTripDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trip: Trip | null;
}

const editTripSchema = z.object({
  availableSeats: z.coerce.number().int().min(0, 'عدد المقاعد لا يمكن أن يكون سالباً'),
});

type EditTripFormValues = z.infer<typeof editTripSchema>;

export function EditTripDialog({ isOpen, onOpenChange, trip }: EditTripDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditTripFormValues>({
    resolver: zodResolver(editTripSchema),
    defaultValues: {
        availableSeats: 0,
    }
  });
  
  useEffect(() => {
    if (trip) {
      form.reset({
        availableSeats: trip.availableSeats || 0,
      });
    }
  }, [trip, form]);

  const onSubmit = async (data: EditTripFormValues) => {
    if (!firestore || !trip) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكن تحديث الرحلة حالياً.' });
      return;
    }

    // SOVEREIGN GUARD: Prevent updates on mock data
    if (trip.id.startsWith('mock_')) {
        toast({
            variant: 'default',
            title: 'عرض توضيحي فقط',
            description: 'لا يمكن تعديل البيانات الوهمية. هذه الميزة تعمل فقط على الرحلات الحقيقية.'
        });
        onOpenChange(false);
        return;
    }

    setIsSubmitting(true);
    try {
      const tripRef = doc(firestore, 'trips', trip.id);
      await updateDoc(tripRef, {
        availableSeats: data.availableSeats
      });
      toast({ title: 'تم تحديث عدد المقاعد بنجاح!' });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update trip:', error);
      toast({ variant: 'destructive', title: 'فشل تحديث الرحلة', description: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const adjustSeats = (amount: number) => {
    const currentSeats = form.getValues('availableSeats');
    const newSeats = Math.max(0, currentSeats + amount);
    form.setValue('availableSeats', newSeats, { shouldValidate: true });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تعديل المقاعد المتاحة</DialogTitle>
          <DialogDescription>
            قم بتحديث عدد المقاعد المتاحة لرحلتك ليعكس الحجوزات الخارجية.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="availableSeats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المقاعد المتاحة حالياً</FormLabel>
                  <div className="flex items-center gap-2">
                     <Button type="button" size="icon" variant="outline" onClick={() => adjustSeats(-1)} disabled={field.value === 0}>
                        <Minus className="h-4 w-4" />
                     </Button>
                     <FormControl>
                        <Input type="number" className="text-center text-lg font-bold" {...field} />
                     </FormControl>
                     <Button type="button" size="icon" variant="outline" onClick={() => adjustSeats(1)}>
                        <Plus className="h-4 w-4" />
                     </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>إلغاء</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                    <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري الحفظ...</>
                ) : (
                    <><Save className="ml-2 h-4 w-4" /> حفظ التغييرات</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
