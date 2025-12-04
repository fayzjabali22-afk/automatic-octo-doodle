'use client';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, setDocumentNonBlocking, useAuth } from '@/firebase';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { deleteUser, sendEmailVerification } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Trash2, MailCheck, TestTube2, ArrowRightLeft, Loader2, Upload, Briefcase, Car } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { actionCodeSettings } from '@/firebase/config';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const countries: { [key: string]: { name: string; cities?: string[] } } = {
  syria: { name: 'سوريا' },
  jordan: { name: 'الأردن' },
  ksa: { name: 'السعودية' },
  egypt: { name: 'مصر' },
};


const profileFormSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters.'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  phoneNumber: z.string().optional(),
  // Carrier-specific fields
  vehicleType: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.string().optional(),
  vehicleCapacity: z.coerce.number().int().optional(),
  vehicleImageUrls: z.array(z.string().url('الرجاء إدخال رابط صورة صالح').or(z.literal(''))).max(2).optional(),
  primaryRoute: z.object({
      origin: z.string().optional(),
      destination: z.string().optional(),
  }).optional(),
  paymentInformation: z.string().max(300, 'يجب ألا تتجاوز التعليمات 300 حرف').optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;


export default function ProfilePage() {
  const { toast } = useToast();
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { profile, isLoading } = useUserProfile();
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  const userProfileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);


  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { 
        firstName: '', 
        lastName: '', 
        email: '', 
        phoneNumber: '',
        vehicleType: '',
        vehicleModel: '',
        vehicleYear: '',
        vehicleCapacity: 0,
        vehicleImageUrls: ['',''],
        primaryRoute: { origin: '', destination: '' },
        paymentInformation: ''
    },
  });

  const paymentInfoValue = form.watch('paymentInformation');

  useEffect(() => {
    if (profile) {
      form.reset({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || user?.email || '',
        phoneNumber: profile.phoneNumber || user?.phoneNumber || '',
        vehicleType: profile.vehicleType || '',
        vehicleModel: profile.vehicleModel || '',
        vehicleYear: profile.vehicleYear || '',
        vehicleCapacity: profile.vehicleCapacity || 0,
        vehicleImageUrls: profile.vehicleImageUrls || ['',''],
        primaryRoute: profile.primaryRoute || { origin: '', destination: '' },
        paymentInformation: profile.paymentInformation || '',
      });
    } else if (user) {
        form.reset({
        ...form.getValues(),
        email: user.email || '',
        phoneNumber: user.phoneNumber || ''
        });
    }
  }, [profile, user, form]);
  
  function onUserSubmit(data: ProfileFormValues) {
    if (!userProfileRef) return;
    
    // Create a mutable copy
    const dataToSave: Partial<ProfileFormValues> = { ...data };

    // Ensure vehicleCapacity is a number or deleted
    if (dataToSave.vehicleCapacity && typeof dataToSave.vehicleCapacity === 'string') {
        dataToSave.vehicleCapacity = parseInt(dataToSave.vehicleCapacity, 10);
    }
    if (isNaN(dataToSave.vehicleCapacity!)) {
        delete dataToSave.vehicleCapacity;
    }
    
    // Filter out empty image URLs
    if (dataToSave.vehicleImageUrls) {
        dataToSave.vehicleImageUrls = dataToSave.vehicleImageUrls.filter(url => url && url.trim() !== '');
    }

    if (profile?.role !== 'carrier') {
        // Don't save carrier fields if user is not a carrier
        delete dataToSave.vehicleType;
        delete dataToSave.vehicleModel;
        delete dataToSave.vehicleYear;
        delete dataToSave.vehicleCapacity;
        delete dataToSave.vehicleImageUrls;
        delete dataToSave.primaryRoute;
        delete dataToSave.paymentInformation;
    }

    updateDoc(userProfileRef, dataToSave);
    toast({ title: 'تم تحديث الملف الشخصي', description: 'تم حفظ تغييراتك بنجاح.' });
  }


  const handleRoleChange = async (newRole: 'traveler' | 'carrier') => {
    if (!userProfileRef || !user) return;
    setIsSwitchingRole(true);
    try {
        await updateDoc(userProfileRef, { role: newRole });

        toast({
            title: `تم تغيير الدور إلى ${newRole === 'carrier' ? 'ناقل' : 'مسافر'}`,
            description: "سيتم تحديث صلاحياتك."
        });

        if (newRole === 'carrier') {
            router.push('/carrier');
        } else {
            router.push('/dashboard');
        }
    } catch (e) {
         toast({ variant: "destructive", title: "فشل تحديث الدور", description: "حدث خطأ ما." });
    } finally {
        setIsSwitchingRole(false);
    }
  }

  const handleResendVerification = async () => {
    if (user && !user.emailVerified) {
        try {
            await sendEmailVerification(user, actionCodeSettings);
            toast({ title: 'تم إرسال البريد', description: 'تم إرسال بريد تفعيل جديد. الرجاء التحقق من صندوق الوارد.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'فشل إرسال بريد التفعيل. الرجاء المحاولة مرة أخرى قريبًا.' });
        }
    }
  };

    const handleDeleteAccount = async () => {
    if (!user || !auth || !firestore) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم العثور على المستخدم أو خدمات Firebase.' });
        setIsDeleteConfirmOpen(false);
        return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);

    try {
        await deleteDoc(userDocRef);
        
        await deleteUser(user);
        
        toast({ title: 'تم حذف الحساب بنجاح', description: 'نأمل أن نراك مرة أخرى قريبًا.' });
        router.push('/signup');

    } catch (error: any) {
        console.error("Delete account error:", error);
        
        if (error.code === 'auth/requires-recent-login') {
             toast({ variant: 'destructive', title: 'فشل حذف المصادقة', description: 'هذه العملية تتطلب إعادة تسجيل دخول حديثة. تم حذف بياناتك، يرجى تسجيل الخروج ثم الدخول مرة أخرى لإكمال الحذف.' });
             router.push('/login'); 
        } else {
             toast({ variant: 'destructive', title: 'فشل حذف الحساب', description: 'حدث خطأ أثناء محاولة حذف حسابك.' });
        }
    } finally {
        setIsDeleteConfirmOpen(false);
    }
  };

  const isDevUser = user?.email === 'dev@safar.com';
  const roleIsLoading = isLoading || isSwitchingRole;


  return (
    <>
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8 p-4">
        
        {user && !user.emailVerified && !isDevUser && (
          <Card className="border-yellow-500 shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-500"><ShieldAlert /> تفعيل الحساب</CardTitle>
                <CardDescription>حسابك غير مُفعّل. الرجاء التحقق من بريدك الإلكتروني أو طلب رابط تفعيل جديد.</CardDescription>
            </CardHeader>
            <CardFooter>
                 <Button variant="outline" onClick={handleResendVerification}><MailCheck className="ml-2 h-4 w-4" /> إعادة إرسال بريد التفعيل</Button>
            </CardFooter>
          </Card>
        )}

        {isDevUser && (
          <Card className="border-accent shadow-lg">
             <CardHeader>
                <CardTitle className="flex items-center gap-2 text-accent"><TestTube2 /> منطقة المطور (Dev Zone)</CardTitle>
                <CardDescription>أنت تستخدم حساب المطور. يمكنك تبديل دورك لأغراض الاختبار. الدور الحالي: <span className="font-bold text-foreground">{profile?.role || '...'}</span></CardDescription>
             </CardHeader>
             <CardFooter className="flex flex-col sm:flex-row gap-4">
                 <Button variant={profile?.role === 'traveler' ? 'default' : 'outline'} onClick={() => handleRoleChange('traveler')} disabled={roleIsLoading} className="flex-1">
                    {roleIsLoading && profile?.role !== 'traveler' ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <ArrowRightLeft className="ml-2 h-4 w-4" />}
                    التحويل إلى مسافر (Traveler)
                </Button>
                <Button variant={profile?.role === 'carrier' ? 'default' : 'outline'} onClick={() => handleRoleChange('carrier')} disabled={roleIsLoading} className="flex-1">
                    {roleIsLoading && profile?.role !== 'carrier' ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <ArrowRightLeft className="ml-2 h-4 w-4" />}
                    التحويل إلى ناقل (Carrier)
                </Button>
             </CardFooter>
          </Card>  
        )}


        <Form {...form}>
            <form onSubmit={form.handleSubmit(onUserSubmit)} className="space-y-8">
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="font-headline">إعدادات الهوية</CardTitle>
                        <CardDescription>إدارة معلومات حسابك الأساسية.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center space-x-6 rtl:space-x-reverse">
                            <Avatar className="h-20 w-20"><AvatarImage src={user?.photoURL || ''} alt={user?.displayName || ''} /><AvatarFallback>{profile?.firstName ? profile.firstName.charAt(0) : user?.email?.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                            <Button variant="outline" type="button" onClick={() => toast({ title: 'قيد التطوير', description: 'ميزة رفع الصور ستكون متاحة قريباً.' })}><Upload className="ml-2 h-4 w-4" /> تغيير الصورة</Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>الاسم الأول</FormLabel><FormControl><Input placeholder="اسمك الأول" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>الاسم الأخير</FormLabel><FormControl><Input placeholder="اسمك الأخير" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>البريد الإلكتروني</FormLabel><FormControl><Input type="email" placeholder="بريدك الإلكتروني" {...field} disabled /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="phoneNumber" render={({ field }) => (<FormItem><FormLabel>رقم الهاتف</FormLabel><FormControl><Input type="tel" placeholder="رقم هاتفك" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </CardContent>
                </Card>

                {profile?.role === 'carrier' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Briefcase /> بيانات الناقل</CardTitle>
                            <CardDescription>إدارة بيانات مركبتك ومعلومات استقبال الدفعات.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <FormField control={form.control} name="vehicleType" render={({ field }) => (<FormItem><FormLabel>نوع المركبة</FormLabel><FormControl><Input placeholder="e.g., GMC Yukon" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="vehicleModel" render={({ field }) => (<FormItem><FormLabel>موديل المركبة</FormLabel><FormControl><Input placeholder="e.g., Suburban" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="vehicleYear" render={({ field }) => (<FormItem><FormLabel>سنة الصنع</FormLabel><FormControl><Input placeholder="e.g., 2024" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="vehicleCapacity" render={({ field }) => (<FormItem><FormLabel>سعة الركاب</FormLabel><FormControl><Input type="number" placeholder="e.g., 4" {...field} /></FormControl><FormMessage /></FormMessage>)} />
                            </div>
                            <Separator/>
                             <div className="space-y-4">
                                <FormLabel className="flex items-center gap-2 font-semibold"><Car className="h-4 w-4"/>روابط صور المركبة</FormLabel>
                                <FormField control={form.control} name="vehicleImageUrls.0" render={({ field }) => (<FormItem><FormLabel className="text-xs">الصورة الأساسية</FormLabel><FormControl><Input dir="ltr" placeholder="https://example.com/main-image.jpg" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="vehicleImageUrls.1" render={({ field }) => (<FormItem><FormLabel className="text-xs">صورة إضافية</FormLabel><FormControl><Input dir="ltr" placeholder="https://example.com/extra-image.jpg" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <Separator/>
                            <div className="space-y-2">
                                <FormLabel className="font-semibold">خط السير المفضل (للفلترة الذكية)</FormLabel>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="primaryRoute.origin" render={({ field }) => (<FormItem><FormLabel>من</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر دولة" /></SelectTrigger></FormControl><SelectContent>{Object.entries(countries).map(([key, {name}]) => (<SelectItem key={key} value={key}>{name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="primaryRoute.destination" render={({ field }) => (<FormItem><FormLabel>إلى</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر دولة" /></SelectTrigger></FormControl><SelectContent>{Object.entries(countries).filter(([key]) => key !== form.watch('primaryRoute.origin')).map(([key, {name}]) => (<SelectItem key={key} value={key}>{name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                </div>
                            </div>
                            <Separator/>
                            <FormField
                                control={form.control}
                                name="paymentInformation"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>تعليمات استلام الدفعات (Payment Instructions)</FormLabel>
                                    <FormControl>
                                    <Textarea
                                        placeholder="اكتب هنا تفاصيل الدفع (مثل: محفظة زين كاش 079...، كليك Alias...، أو الدفع نقداً)."
                                        className="min-h-[100px]"
                                        maxLength={300}
                                        {...field}
                                    />
                                    </FormControl>
                                    <div className="text-xs text-muted-foreground text-end">
                                      {paymentInfoValue?.length || 0}/300
                                    </div>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                )}
                
                <div className="flex justify-end">
                    <Button type="submit">حفظ التغييرات</Button>
                </div>

            </form>
        </Form>
        

        <Card className="border-destructive shadow-lg">
            <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><ShieldAlert /> منطقة الخطر</CardTitle><CardDescription>هذه الإجراءات دائمة ولا يمكن التراجع عنها. يرجى المتابعة بحذر.</CardDescription></CardHeader>
            <CardContent><p>بمجرد حذف حسابك، ستفقد كل بياناتك الشخصية وسجل الحجوزات بشكل نهائي.</p></CardContent>
            <CardFooter><Button variant="destructive" onClick={() => setIsDeleteConfirmOpen(true)}><Trash2 className="ml-2 h-4 w-4" /> حذف الحساب بشكل نهائي</Button></CardFooter>
        </Card>
      </div>
    </AppLayout>

    <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent dir="rtl">
            <AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-red-500" /> هل أنت متأكد من حذف حسابك؟</AlertDialogTitle><AlertDialogDescription>هذا الإجراء سيقوم بحذف حسابك بشكل نهائي. لا يمكن التراجع عن هذا الإجراء. سيتم حذف جميع بياناتك الشخصية وحجوزاتك وسجل رحلاتك.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">نعم، قم بحذف حسابي</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );

    