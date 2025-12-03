'use client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { Banknote, Loader2, Save } from 'lucide-react';

const bankDetailsSchema = z.object({
  bankName: z.string().min(3, 'اسم البنك مطلوب'),
  accountHolderName: z.string().min(3, 'اسم صاحب الحساب مطلوب'),
  iban: z.string().min(15, 'رقم IBAN غير صالح').max(34, 'رقم IBAN غير صالح'),
});

type BankDetailsFormValues = z.infer<typeof bankDetailsSchema>;

export function BankDetailsForm() {
    const { profile, isLoading: isProfileLoading } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<BankDetailsFormValues>({
        resolver: zodResolver(bankDetailsSchema),
        defaultValues: {
            bankName: '',
            accountHolderName: '',
            iban: '',
        }
    });

    useEffect(() => {
        if (profile?.bankDetails) {
            form.reset(profile.bankDetails);
        }
    }, [profile, form]);

    const onSubmit = async (data: BankDetailsFormValues) => {
        if (!firestore || !profile?.id) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكن حفظ البيانات.' });
            return;
        }
        setIsSubmitting(true);
        try {
            const carrierRef = doc(firestore, 'carriers', profile.id);
            await updateDoc(carrierRef, { bankDetails: data });
            toast({ title: 'تم حفظ البيانات بنجاح', description: 'تم تحديث معلومات حسابك البنكي.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'فشل الحفظ', description: 'حدث خطأ أثناء حفظ البيانات.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-primary"/>
                    <span>إعدادات الحساب البنكي</span>
                </CardTitle>
                <CardDescription>
                    أدخل معلومات حسابك البنكي لاستقبال الأرباح. هذه المعلومات سرية ومشفرة.
                </CardDescription>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="bankName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>اسم البنك</FormLabel>
                                    <FormControl><Input placeholder="مثال: البنك العربي" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="accountHolderName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>اسم صاحب الحساب (كما هو في كشف البنك)</FormLabel>
                                    <FormControl><Input placeholder="الاسم الكامل" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="iban"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>رقم الحساب الدولي (IBAN)</FormLabel>
                                    <FormControl><Input placeholder="JO89ARAB109000000010922222220" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isSubmitting || isProfileLoading}>
                            {isSubmitting ? (
                                <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري الحفظ...</>
                            ) : (
                                <><Save className="ml-2 h-4 w-4" /> حفظ المعلومات البنكية</>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
