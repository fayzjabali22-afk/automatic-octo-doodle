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
import type { Trip } from '@/lib/data';
import { Loader2, Save } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

interface EditTripDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trip: Trip | null;
  onConfirm: (trip: Trip, data: EditTripFormValues) => Promise<void>;
}

const editTripSchema = z.object({
  price: z.coerce.number().positive('السعر يجب أن يكون رقماً موجباً'),
  availableSeats: z.coerce.number().int().min(0, 'عدد المقاعد لا يمكن أن يكون سالباً'),
  departureDate: z.date({ required_error: 'تاريخ المغادرة مطلوب' }),
});

export type EditTripFormValues = z.infer<typeof editTripSchema>;

export function EditTripDialog({ isOpen, onOpenChange, trip, onConfirm }: EditTripDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditTripFormValues>({
    resolver: zodResolver(editTripSchema),
    defaultValues: {
      price: 0,
      availableSeats: 0,
    },
  });

  useEffect(() => {
    if (trip && isOpen) {
      form.reset({
        price: trip.price || 0,
        availableSeats: trip.availableSeats || 0,
        departureDate: trip.departureDate ? new Date(trip.departureDate) : new Date(),
      });
      form.clearErrors();
    }
  }, [trip, isOpen, form]);

  const onSubmit = async (data: EditTripFormValues) => {
    if (!trip) return;
    setIsSubmitting(true);
    try {
        await onConfirm(trip, data);
    } catch(e) {
        // Error toast is handled by the parent function
    } finally {
        setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تعديل تفاصيل الرحلة</DialogTitle>
          <DialogDescription className="pt-2">
            قم بتحديث تفاصيل رحلتك. سيتم إعلام جميع المسافرين بالتغييرات فوراً.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
             <FormField
              control={form.control}
              name="departureDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تاريخ ووقت المغادرة</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : <span>اختر تاريخاً</span>}
                          <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>سعر المقعد ({trip?.currency || 'د.أ'})</FormLabel>
                   <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="availableSeats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المقاعد المتاحة</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>إلغاء</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري الحفظ والإعلام...</>
                ) : (
                  <><Save className="ml-2 h-4 w-4" /> حفظ وإعلام المسافرين</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
