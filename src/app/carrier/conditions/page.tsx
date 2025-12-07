'use client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ListChecks, Route, Wallet, Save, Loader2, Briefcase, MapPin } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useEffect, useState, useMemo } from 'react';


const countries: { [key: string]: { name: string; cities?: string[] } } = {
  syria: { name: 'سوريا' },
  jordan: { name: 'الأردن' },
  ksa: { name: 'السعودية' },
  egypt: { name: 'مصر' },
};

const conditionsSchema = z.object({
  primaryRoute: z.object({
      origin: z.string().optional(),
      destination: z.string().optional(),
  }).optional(),
  paymentInformation: z.string().max(300, 'يجب ألا تتجاوز التعليمات 300 حرف').optional(),
  bagsPerSeat: z.coerce.number().optional(),
  numberOfStops: z.coerce.number().optional(),
});

type ConditionsFormValues = z.infer<typeof conditionsSchema>;

export default function CarrierConditionsPage() {
    const { toast } = useToast();
    const { profile, isLoading } = useUserProfile();
    const { user } = useUser();
    const firestore = useFirestore();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const userProfileRef = useMemo(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const form = useForm<ConditionsFormValues>({
        resolver: zodResolver(conditionsSchema),
        defaultValues: {
            primaryRoute: { origin: '', destination: '' },
            paymentInformation: '',
            bagsPerSeat: 1,
            numberOfStops: 1,
        }
    });

    const paymentInfoValue = form.watch('paymentInformation');

    useEffect(() => {
        if (profile) {
            form.reset({
                primaryRoute: profile.primaryRoute || { origin: '', destination: '' },
                paymentInformation: profile.paymentInformation || '',
                bagsPerSeat: profile.bagsPerSeat || 1,
                numberOfStops: profile.numberOfStops || 1,
            });
        }
    }, [profile, form]);

    async function onSubmit(data: ConditionsFormValues) {
        if (!userProfileRef) return;
        
        setIsSubmitting(true);
        try {
            await updateDoc(userProfileRef, data);
            toast({ title: 'تم تحديث الشروط الدائمة', description: 'تم حفظ تغييراتك بنجاح.' });
        } catch (error) {
            toast({ title: 'فشل التحديث', description: 'حدث خطأ ما.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="space-y-4 w-full">
             <header className="rounded-b-lg md:rounded-lg bg-card shadow-sm border-b md:border p-4">
                <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                    <ListChecks className="h-6 w-6 text-primary" />
                    إدارة الإعدادات الدائمة
                </h1>
                <p className="text-muted-foreground text-xs md:text-sm pt-1">
                    حدد هنا الإعدادات التي تطبق تلقائياً على رحلاتك وعروضك لتسريع وتيرة عملك.
                </p>
            </header>

            <main>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Route/> خط السير المفضل</CardTitle>
                                <CardDescription>يستخدم هذا الإعداد للفلترة الذكية في مركز الفرص.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="primaryRoute.origin" render={({ field }) => (<FormItem><FormLabel>من</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر دولة" /></SelectTrigger></FormControl><SelectContent>{Object.entries(countries).map(([key, { name }]) => (<SelectItem key={key} value={key}>{name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="primaryRoute.destination" render={({ field }) => (<FormItem><FormLabel>إلى</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر دولة" /></SelectTrigger></FormControl><SelectContent>{Object.entries(countries).filter(([key]) => key !== form.watch('primaryRoute.origin')).map(([key, { name }]) => (<SelectItem key={key} value={key}>{name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><ListChecks/> شروط الرحلة الافتراضية</CardTitle>
                                <CardDescription>هذه الشروط تظهر للمسافرين عند حجز رحلاتك.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                     <FormField
                                        control={form.control}
                                        name="bagsPerSeat"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-1"><Briefcase className="h-4 w-4" /> عدد الحقائب/مقعد</FormLabel>
                                            <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="اختر العدد" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {[1, 2, 3].map(num => <SelectItem key={num} value={String(num)}>{num}</SelectItem>)}
                                            </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="numberOfStops"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-1"><MapPin className="h-4 w-4" /> عدد محطات التوقف</FormLabel>
                                            <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="اختر العدد" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {[0, 1, 2, 3].map(num => <SelectItem key={num} value={String(num)}>{num === 0 ? 'مباشرة بدون توقف' : num}</SelectItem>)}
                                            </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Wallet/> تعليمات استلام الدفعات</CardTitle>
                                <CardDescription>
                                    هذه التعليمات تظهر للمسافر عند دفعه للعربون. كن واضحاً ودقيقاً.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                 <FormField
                                    control={form.control}
                                    name="paymentInformation"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormControl>
                                            <Textarea
                                                placeholder="اكتب هنا تفاصيل الدفع (مثل: محفظة زين كاش 079...، كليك Alias...، أو الدفع نقداً عند الالتقاء)."
                                                className="min-h-[100px]"
                                                maxLength={300}
                                                {...field}
                                            />
                                        </FormControl>
                                        <div className="text-xs text-muted-foreground text-end pt-1">
                                            {paymentInfoValue?.length || 0}/300
                                        </div>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSubmitting || isLoading}>
                                {isSubmitting ? (
                                    <><Loader2 className="ml-2 h-4 w-4 animate-spin"/> جاري الحفظ...</>
                                ) : (
                                    <><Save className="ml-2 h-4 w-4"/> حفظ الإعدادات الدائمة</>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </main>
        </div>
    )
}
