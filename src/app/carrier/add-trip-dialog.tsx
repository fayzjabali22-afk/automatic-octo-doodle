'use client';

import { useState, useMemo } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Loader2, CalendarIcon, Send, Clock, PlaneTakeoff, PlaneLanding, Settings, ListChecks, MapPin, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from "date-fns";
import { Label } from '@/components/ui/label';
import { logEvent } from '@/lib/analytics';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Textarea } from '../ui/textarea';


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
  departureTime: z.string().min(1, 'وقت المغادرة مطلوب'),
  meetingPoint: z.string().min(3, 'نقطة التجمع مطلوبة'),
  meetingPointLink: z.string().url('الرجاء إدخال رابط خرائط جوجل صالح').optional().or(z.literal('')),
  price: z.coerce.number().positive('السعر يجب أن يكون رقماً موجباً'),
  currency: z.string().min(1, "العملة مطلوبة").max(10, "رمز العملة طويل جداً"),
  availableSeats: z.coerce.number().int().min(1, 'يجب توفر مقعد واحد على الأقل'),
  depositPercentage: z.coerce.number().min(0, "الحد الأدنى 0%").max(25, "نسبة العربون لا يمكن أن تتجاوز 25% حسب قوانين المنصة"),
  durationHours: z.coerce.number().positive('مدة الرحلة المتوقعة مطلوبة ويجب أن تكون رقماً موجباً'),
  conditions: z.string().max(200, 'الشروط يجب ألا تتجاوز 200 حرف').optional(),
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
    defaultValues: {
      origin: '',
      destination: '',
      departureTime: '',
      meetingPoint: '',
      meetingPointLink: '',
      price: undefined,
      availableSeats: 4,
      depositPercentage: 10,
      durationHours: undefined,
      conditions: '',
      currency: 'د.أ',
    }
  });

  const conditionsValue = form.watch('conditions');
  const priceValue = form.watch('price');
  const depositPercentageValue = form.watch('depositPercentage');

  const depositAmount = useMemo(() => {
    const price = priceValue || 0;
    const percentage = depositPercentageValue || 0;
    return (price * (percentage / 100)).toFixed(2);
  }, [priceValue, depositPercentageValue]);


  const onSubmit = async (data: AddTripFormValues) => {
    if (!firestore || !user || !profile) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'يجب أن تكون مسجلاً لإنشاء رحلة.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const tripsCollection = collection(firestore, 'trips');
      
      const [hours, minutes] = data.departureTime.split(':');
      const combinedDepartureDateTime = new Date(data.departureDate);
      combinedDepartureDateTime.setHours(parseInt(hours, 10));
      combinedDepartureDateTime.setMinutes(parseInt(minutes, 10));

      const tripData = {
        ...data,
        departureDate: combinedDepartureDateTime.toISOString(),
        userId: user.uid,
        carrierId: user.uid,
        carrierName: profile.firstName,
        vehicleType: profile.vehicleType || 'غير محدد',
        vehicleImageUrls: profile.vehicleImageUrls || [],
        vehicleCategory: profile.vehicleCapacity && profile.vehicleCapacity > 7 ? 'bus' : 'small',
        status: 'Planned',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      // remove departureTime as it's now merged into departureDate
      delete (tripData as any).departureTime;

      await addDocumentNonBlocking(tripsCollection, tripData);

      logEvent('TRIP_PUBLISHED', {
        carrierId: user.uid,
        origin: data.origin,
        destination: data.destination,
        departureDate: combinedDepartureDateTime.toISOString(),
        vehicleType: profile.vehicleType,
        price: data.price,
        availableSeats: data.availableSeats,
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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>تأسيس رحلة مجدولة جديدة</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل رحلتك لجعلها متاحة للحجز من قبل المسافرين.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <Card className="bg-muted/30 border-accent/20">
              <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className='space-y-2'>
                      <Label className='flex items-center gap-2 font-bold text-accent'><PlaneTakeoff className='h-4 w-4' /> من</Label>
                       <Select onValueChange={setOriginCountry}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="اختر دولة الانطلاق" /></SelectTrigger>
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
                                      <SelectTrigger className="bg-background"><SelectValue placeholder="اختر مدينة الانطلاق" /></SelectTrigger>
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
                      <Label className='flex items-center gap-2 font-bold text-accent'><PlaneLanding className='h-4 w-4' /> إلى</Label>
                      <Select onValueChange={setDestinationCountry}>
                          <SelectTrigger className="bg-background"><SelectValue placeholder="اختر دولة الوصول" /></SelectTrigger>
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
                                      <SelectTrigger className="bg-background"><SelectValue placeholder="اختر مدينة الوصول" /></SelectTrigger>
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
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full" defaultValue='details'>
              <AccordionItem value="details" className="border rounded-lg bg-muted/30">
                <AccordionTrigger className="p-4 font-semibold text-sm hover:no-underline">
                    <div className='flex items-center gap-2'>
                        <Settings className='h-4 w-4'/>
                        التفاصيل التشغيلية
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="departureDate" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>تاريخ المغادرة</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal bg-card", !field.value && "text-muted-foreground")}>
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
                     <FormField control={form.control} name="departureTime" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>وقت المغادرة</FormLabel>
                            <FormControl>
                                <Input type="time" className="bg-card" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                     )}/>
                  </div>
                  
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <FormField control={form.control} name="meetingPoint" render={({ field }) => (<FormItem><FormLabel className='flex items-center gap-1'><MapPin className="h-4 w-4"/>نقطة التجمع</FormLabel><FormControl><Input className="bg-card" placeholder="مثال: العبدلي - بجانب جت" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name="meetingPointLink" render={({ field }) => (<FormItem><FormLabel>رابط الموقع (اختياري)</FormLabel><FormControl><Input className="bg-card" dir="ltr" placeholder="https://maps.app.goo.gl/..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                   </div>
                  
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="availableSeats" render={({ field }) => (
                          <FormItem>
                              <FormLabel>عدد المقاعد المتاحة</FormLabel>
                              <FormControl><Input className="bg-card" type="number" placeholder="e.g., 4" {...field} /></FormControl>
                              <FormMessage />
                          </FormItem>
                        )}/>
                        <FormField control={form.control} name="durationHours" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-1"><Clock className="h-4 w-4 text-muted-foreground"/>مدة الرحلة (ساعة)</FormLabel>
                                <FormControl><Input className="bg-card" type="number" placeholder="e.g., 8" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                   </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="financials" className="border rounded-lg bg-muted/30">
                 <AccordionTrigger className="p-4 font-semibold text-sm hover:no-underline">
                    <div className='flex items-center gap-2'>
                        <Wallet className='h-4 w-4'/>
                        التفاصيل المالية
                    </div>
                </AccordionTrigger>
                 <AccordionContent className="p-4 pt-0 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField control={form.control} name="price" render={({ field }) => (
                            <FormItem>
                                <FormLabel>سعر المقعد</FormLabel>
                                <FormControl><Input className="bg-card" type="number" placeholder="e.g., 50" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="currency" render={({ field }) => (
                            <FormItem>
                                <FormLabel>العملة</FormLabel>
                                <FormControl><Input className="bg-card" placeholder="د.أ، SAR..." {...field} maxLength={10} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="depositPercentage" render={({ field }) => (
                            <FormItem>
                                <FormLabel>نسبة العربون</FormLabel>
                                <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={String(field.value)}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="اختر نسبة" /></SelectTrigger></FormControl>
                                    <SelectContent>{[0, 5, 10, 15, 20, 25].map(p => <SelectItem key={p} value={String(p)}>{p}%</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                    <div className="p-2 bg-background/50 border rounded-md text-center text-sm font-bold text-primary">
                        قيمة العربون للمقعد الواحد: {depositAmount} {form.watch('currency')}
                    </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
             <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="conditions" className="border rounded-lg bg-muted/30">
                 <AccordionTrigger className="p-4 font-semibold text-sm hover:no-underline">
                    <div className='flex items-center gap-2'>
                        <ListChecks className='h-4 w-4'/>
                        الشروط والأحكام (اختياري)
                    </div>
                </AccordionTrigger>
                 <AccordionContent className="p-4 pt-0">
                     <FormField control={form.control} name="conditions" render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Textarea
                                    placeholder="مثال: ممنوع التدخين، حقيبة واحدة فقط لكل راكب..."
                                    className="resize-none bg-card"
                                    {...field}
                                    maxLength={200}
                                />
                            </FormControl>
                            <div className="text-xs text-muted-foreground text-left pt-1">
                                {conditionsValue?.length || 0}/200
                            </div>
                            <FormMessage />
                        </FormItem>
                     )}/>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
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
