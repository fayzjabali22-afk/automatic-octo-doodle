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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Loader2, CalendarIcon, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from "date-fns";
import { Label } from '@/components/ui/label';

const countries: { [key: string]: { name: string; cities: string[] } } = {
  syria: { name: 'سوريا', cities: ['damascus', 'aleppo', 'homs'] },
  jordan: { name: 'الأردن', cities: ['amman', 'irbid', 'zarqa'] },
  ksa: { name: 'السعودية', cities: ['riyadh', 'jeddah', 'dammam'] },
  egypt: { name: 'مصر', cities: ['cairo', 'alexandria', 'giza'] },
};

const cities: { [key:string]: string } = {
    damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص',
    amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
    riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام',
    cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة',
};

const addTripSchema = z.object({
  origin: z.string().min(1, 'مدينة الانطلاق مطلوبة'),
  destination: z.string().min(1, 'مدينة الوصول مطلوبة'),
  departureDate: z.date({ required_error: 'تاريخ المغادرة مطلوب' }),
  price: z.coerce.number().positive('السعر يجب أن يكون رقماً موجباً'),
  availableSeats: z.coerce.number().int().min(1, 'يجب توفر مقعد واحد على الأقل'),
  vehicleType: z.string().min(3, 'نوع المركبة مطلوب'),
});

type AddTripFormValues = z.infer<typeof addTripSchema>;

interface AddTripDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AddTripDialog({ isOpen, onOpenChange }: AddTripDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const { profile } = useUserProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [originCountry, setOriginCountry] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');

  const form = useForm<AddTripFormValues>({
    resolver: zodResolver(addTripSchema),
  });

  const onSubmit = async (data: AddTripFormValues) => {
    if (!firestore || !user || !profile) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'يجب أن تكون مسجلاً لإنشاء رحلة.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const tripsCollection = collection(firestore, 'trips');
      await addDocumentNonBlocking(tripsCollection, {
        ...data,
        departureDate: data.departureDate.toISOString(),
        userId: user.uid,
        carrierId: user.uid,
        carrierName: profile.firstName,
        status: 'Planned',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'تمت إضافة الرحلة بنجاح!', description: 'رحلتك الآن متاحة للمسافرين للحجز.' });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Failed to add trip:', error);
      toast({ variant: 'destructive', title: 'فشل إضافة الرحلة', description: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>إضافة رحلة مجدولة جديدة</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل رحلتك لجعلها متاحة للحجز من قبل المسافرين.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className='space-y-2'>
                    <Label>من</Label>
                     <Select onValueChange={setOriginCountry}>
                        <SelectTrigger><SelectValue placeholder="اختر دولة الانطلاق" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(countries).map(([key, {name}]) => (
                            <SelectItem key={key} value={key}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    <FormField control={form.control} name="origin" render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!originCountry}>
                                    <SelectTrigger><SelectValue placeholder="اختر مدينة الانطلاق" /></SelectTrigger>
                                    <SelectContent>
                                    {originCountry && countries[originCountry as keyof typeof countries]?.cities.map(cityKey => (
                                        <SelectItem key={cityKey} value={cityKey}>{cities[cityKey]}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                     )}/>
                </div>
                 <div className='space-y-2'>
                    <Label>إلى</Label>
                    <Select onValueChange={setDestinationCountry}>
                        <SelectTrigger><SelectValue placeholder="اختر دولة الوصول" /></SelectTrigger>
                        <SelectContent>
                        {Object.entries(countries).filter(([key]) => key !== originCountry).map(([key, {name}]) => (
                            <SelectItem key={key} value={key}>{name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                     <FormField control={form.control} name="destination" render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!destinationCountry}>
                                    <SelectTrigger><SelectValue placeholder="اختر مدينة الوصول" /></SelectTrigger>
                                    <SelectContent>
                                    {destinationCountry && countries[destinationCountry as keyof typeof countries]?.cities.map(cityKey => (
                                        <SelectItem key={cityKey} value={cityKey}>{cities[cityKey]}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>
            </div>
            
             <FormField control={form.control} name="departureDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>تاريخ المغادرة</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>اختر تاريخاً</span>}
                                <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
             )}/>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem>
                        <FormLabel>سعر المقعد (بالدينار)</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 50" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="availableSeats" render={({ field }) => (
                    <FormItem>
                        <FormLabel>عدد المقاعد المتاحة</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 4" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
            </div>
             <FormField control={form.control} name="vehicleType" render={({ field }) => (
                <FormItem>
                    <FormLabel>نوع المركبة</FormLabel>
                    <FormControl><Input placeholder="e.g., GMC Yukon 2023" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>إلغاء</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري الحفظ...</> : <><Send className="ml-2 h-4 w-4" /> نشر الرحلة</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
