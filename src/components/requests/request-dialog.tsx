'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Loader2, Send, CalendarIcon, Users, Car, Share2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '../ui/scroll-area';

const passengerSchema = z.object({
  name: z.string().min(2, 'الاسم الكامل مطلوب'),
  type: z.enum(['adult', 'child']).default('adult'),
});

const requestSchema = z.object({
  departureTime: z.string().min(1, 'وقت المغادرة التقريبي مطلوب'),
  preferredVehicle: z.enum(['any', 'small', 'bus']).default('any'),
  isShared: z.boolean().default(true),
  targetPrice: z.coerce.number().optional(),
  notes: z.string().max(200, 'الملاحظات يجب ألا تتجاوز 200 حرف').optional(),
  passengersDetails: z.array(passengerSchema).min(1, "يجب إدخال بيانات راكب واحد على الأقل"),
});

type RequestFormValues = z.infer<typeof requestSchema>;

interface RequestDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  searchParams: {
    origin: string;
    destination: string;
    departureDate?: Date;
    passengers: number;
    requestType: 'General' | 'Direct';
    targetCarrierId?: string;
  };
  onSuccess: () => void;
}

export function RequestDialog({ isOpen, onOpenChange, searchParams, onSuccess }: RequestDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      departureTime: '',
      preferredVehicle: 'any',
      isShared: true,
      targetPrice: undefined,
      notes: '',
      passengersDetails: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "passengersDetails",
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        departureTime: '',
        preferredVehicle: 'any',
        isShared: true,
        targetPrice: undefined,
        notes: '',
        passengersDetails: Array.from({ length: searchParams.passengers || 1 }, () => ({ name: '', type: 'adult' })),
      });
    }
  }, [isOpen, searchParams.passengers, form]);
  
  if (!searchParams.origin || !searchParams.destination || !searchParams.departureDate) {
    if (isOpen) {
      toast({
        variant: "destructive",
        title: "بيانات غير مكتملة",
        description: "يجب تحديد الأصل والوجهة والتاريخ أولاً.",
      });
      onOpenChange(false);
    }
    return null;
  }

  const onSubmit = async (data: RequestFormValues) => {
    if (!firestore || !user || !searchParams.origin || !searchParams.destination || !searchParams.departureDate) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكن إرسال الطلب. البيانات الأساسية مفقودة.' });
        return;
    }
    setIsSubmitting(true);
    try {
        const tripsCollection = collection(firestore, 'trips');
        
        const [hours, minutes] = data.departureTime.split(':');
        const combinedDepartureDateTime = new Date(searchParams.departureDate);
        combinedDepartureDateTime.setHours(parseInt(hours, 10));
        combinedDepartureDateTime.setMinutes(parseInt(minutes, 10));

        const tripRequestData = {
            ...data,
            origin: searchParams.origin,
            destination: searchParams.destination,
            passengers: searchParams.passengers,
            departureDate: combinedDepartureDateTime.toISOString(),
            status: 'Awaiting-Offers',
            userId: user.uid,
            requestType: searchParams.requestType,
            targetCarrierId: searchParams.targetCarrierId || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        await addDocumentNonBlocking(tripsCollection, tripRequestData);
        
        onOpenChange(false);
        onSuccess();

    } catch (error) {
        console.error('Failed to create trip request:', error);
        toast({ variant: 'destructive', title: 'فشل إرسال الطلب', description: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إرسال طلب رحلة</DialogTitle>
          <DialogDescription>
            أكمل التفاصيل التالية لإرسال طلبك إلى {searchParams.requestType === 'General' ? 'السوق العام' : 'الناقل المحدد'}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="p-3 border rounded-lg bg-muted/50 space-y-2 text-sm">
                <p className="flex justify-between"><strong>من:</strong> {searchParams.origin}</p>
                <p className="flex justify-between"><strong>إلى:</strong> {searchParams.destination}</p>
                <p className="flex justify-between"><strong>التاريخ:</strong> {searchParams.departureDate ? format(searchParams.departureDate, 'PPP') : 'N/A'}</p>
                <p className="flex justify-between"><strong>عدد الركاب:</strong> {searchParams.passengers}</p>
            </div>
            
            <ScrollArea className="max-h-[35vh] pr-3">
              <div className="space-y-4">
                <div className="font-medium text-sm">بيانات الركاب</div>
                {fields.map((field, index) => (
                  <div key={field.id} className="p-3 border rounded-lg space-y-2 bg-background">
                     <FormField
                      control={form.control}
                      name={`passengersDetails.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>اسم الراكب {index + 1}</FormLabel>
                          <FormControl><Input placeholder="الاسم الكامل" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}

                <FormField control={form.control} name="departureTime" render={({ field }) => (
                    <FormItem>
                        <FormLabel>الوقت المفضل للمغادرة</FormLabel>
                        <FormControl><Input type="time" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                
                <FormField control={form.control} name="preferredVehicle" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center gap-1"><Car className="h-4 w-4"/> المركبة المفضلة</FormLabel>
                         <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-3 gap-2 pt-1">
                            <Label className="border rounded-md p-2 text-center cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground">
                                <FormControl><RadioGroupItem value="any" className="sr-only" /></FormControl><span>أي نوع</span>
                            </Label>
                             <Label className="border rounded-md p-2 text-center cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground">
                                <FormControl><RadioGroupItem value="small" className="sr-only" /></FormControl><span>صغيرة</span>
                            </Label>
                             <Label className="border rounded-md p-2 text-center cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground">
                                <FormControl><RadioGroupItem value="bus" className="sr-only" /></FormControl><span>حافلة</span>
                            </Label>
                        </RadioGroup>
                        <FormMessage />
                    </FormItem>
                )}/>

                 <FormField control={form.control} name="isShared" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <FormLabel className="flex items-center gap-1"><Share2 className="h-4 w-4"/> رحلة مشتركة</FormLabel>
                            <DialogDescription className="text-xs">هل تقبل مشاركة الرحلة مع ركاب آخرين؟</DialogDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                 )}/>

                <FormField
                  control={form.control}
                  name="targetPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>السعر المستهدف (اختياري)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="كم تتوقع أن تدفع؟" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                        <FormLabel>ملاحظات إضافية (اختياري)</FormLabel>
                        <FormControl><Textarea placeholder="مثل: وجود أمتعة كثيرة، أفضل الانطلاق باكراً..." {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
              </div>
            </ScrollArea>

            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>إلغاء</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري الإرسال...</> : <><Send className="ml-2 h-4 w-4" /> إرسال الطلب</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
