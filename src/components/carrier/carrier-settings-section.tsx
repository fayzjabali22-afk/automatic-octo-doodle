'use client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Briefcase, Loader2, Save } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const carrierSettingsSchema = z.object({
    primaryRoute: z.object({
        origin: z.string().min(1, 'Origin country is required.'),
        destination: z.string().min(1, 'Destination country is required.'),
    }),
    vehicleCategory: z.enum(['small', 'bus'], {
        required_error: "You need to select a vehicle category.",
    }),
});

type CarrierSettingsValues = z.infer<typeof carrierSettingsSchema>;

const countries: { [key: string]: { name: string; cities?: string[] } } = {
  syria: { name: 'سوريا' },
  jordan: { name: 'الأردن' },
  ksa: { name: 'السعودية' },
  egypt: { name: 'مصر' },
};

export function CarrierSettingsSection() {
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const carrierProfileRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'carriers', user.uid);
    }, [firestore, user]);

    const form = useForm<CarrierSettingsValues>({
      resolver: zodResolver(carrierSettingsSchema),
      defaultValues: {
          primaryRoute: { origin: '', destination: ''},
      }
    });

    useEffect(() => {
        const fetchCarrierProfile = async () => {
            if (!carrierProfileRef) return;
            setIsLoading(true);
            try {
                const carrierSnap = await getDoc(carrierProfileRef);
                if(carrierSnap.exists()) {
                    const carrierData = carrierSnap.data();
                    form.reset({
                        primaryRoute: carrierData.primaryRoute || { origin: '', destination: '' },
                        vehicleCategory: carrierData.vehicleCategory,
                    });
                }
            } catch (error) {
                console.error("Failed to fetch carrier profile", error);
                toast({ variant: 'destructive', title: 'فشل تحميل بيانات الناقل' });
            } finally {
                setIsLoading(false);
            }
        }
        fetchCarrierProfile();
    }, [carrierProfileRef, form, toast]);
  
    async function onSubmit(data: CarrierSettingsValues) {
        if (!carrierProfileRef) return;
        setIsSubmitting(true);
        try {
            await updateDoc(carrierProfileRef, data);
            toast({ title: 'تم تحديث إعدادات الناقل', description: 'تم حفظ إعداداتك التخصصية.' });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'فشل التحديث', description: 'لم نتمكن من حفظ إعدادات الناقل.' });
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Briefcase /> إعدادات الناقل التخصصية</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center p-8">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Briefcase /> إعدادات الناقل التخصصية</CardTitle>
                <CardDescription>حدد خط النقل الذي تعمل عليه ونوع مركبتك لتصلك الطلبات المناسبة.</CardDescription>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label className="font-semibold">خط السير المفضل</Label>
                            <div className="grid grid-cols-2 gap-4">
                                 <FormField control={form.control} name="primaryRoute.origin" render={({ field }) => (<FormItem><FormLabel>من</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر دولة" /></SelectTrigger></FormControl><SelectContent>{Object.entries(countries).map(([key, {name}]) => (<SelectItem key={key} value={key}>{name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                 <FormField control={form.control} name="primaryRoute.destination" render={({ field }) => (<FormItem><FormLabel>إلى</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر دولة" /></SelectTrigger></FormControl><SelectContent>{Object.entries(countries).filter(([key]) => key !== form.watch('primaryRoute.origin')).map(([key, {name}]) => (<SelectItem key={key} value={key}>{name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                            </div>
                        </div>
                        <Separator />
                        <FormField control={form.control} name="vehicleCategory" render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel className="font-semibold">فئة المركبة الأساسية</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                                        <FormItem className="flex items-center space-x-3 space-x-reverse"><FormControl><RadioGroupItem value="small" /></FormControl><FormLabel className="font-normal">مركبة صغيرة (4-7 ركاب)</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-3 space-x-reverse"><FormControl><RadioGroupItem value="bus" /></FormControl><FormLabel className="font-normal">حافلة (8+ ركاب)</FormLabel></FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                            <Save className="ml-2 h-4 w-4" />
                            حفظ إعدادات الناقل
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    )
}
