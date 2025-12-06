'use client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { deleteUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Trash2, Upload, Briefcase } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useUserProfile } from '@/hooks/use-user-profile';


const profileFormSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters.'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  phoneNumber: z.string().optional(),
  vehicleType: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.string().optional(),
  vehiclePlateNumber: z.string().optional(),
  vehicleCapacity: z.coerce.number().int().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;


export default function CarrierProfilePage() {
  const { toast } = useToast();
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { profile } = useUserProfile();

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
      vehiclePlateNumber: '',
      vehicleCapacity: 0,
    },
  });

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
        vehiclePlateNumber: profile.vehiclePlateNumber || '',
        vehicleCapacity: profile.vehicleCapacity || 0,
      });
    } else if (user) {
      form.reset({
        ...form.getValues(),
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
      });
    }
  }, [profile, user, form]);

  function onUserSubmit(data: ProfileFormValues) {
    if (!userProfileRef) return;
    const dataToSave: Partial<ProfileFormValues> = { ...data };

    if (dataToSave.vehicleCapacity && typeof dataToSave.vehicleCapacity === 'string') {
      dataToSave.vehicleCapacity = parseInt(dataToSave.vehicleCapacity, 10);
    }
    if (isNaN(dataToSave.vehicleCapacity!)) {
      delete dataToSave.vehicleCapacity;
    }

    updateDoc(userProfileRef, dataToSave);
    toast({ title: 'تم تحديث الملف الشخصي', description: 'تم حفظ تغييراتك بنجاح.' });
  }

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

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-8">
          
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Briefcase /> بيانات المركبة</CardTitle>
                  <CardDescription>إدارة بيانات مركبتك التي تظهر للمسافرين.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField control={form.control} name="vehicleType" render={({ field }) => (<FormItem><FormLabel>نوع المركبة</FormLabel><FormControl><Input placeholder="e.g., GMC Yukon" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="vehicleModel" render={({ field }) => (<FormItem><FormLabel>موديل المركبة</FormLabel><FormControl><Input placeholder="e.g., Suburban" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="vehicleYear" render={({ field }) => (<FormItem><FormLabel>سنة الصنع</FormLabel><FormControl><Input placeholder="e.g., 2024" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="vehiclePlateNumber" render={({ field }) => (<FormItem><FormLabel>رقم لوحة المركبة</FormLabel><FormControl><Input placeholder="e.g., 1-12345" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="vehicleCapacity" render={({ field }) => (<FormItem><FormLabel>سعة الركاب</FormLabel><FormControl><Input type="number" placeholder="e.g., 4" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit">حفظ التغييرات</Button>
              </div>
            </form>
          </Form>

          <Card className="border-destructive shadow-lg">
            <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><ShieldAlert /> منطقة الخطر</CardTitle><CardDescription>هذه الإجراءات دائمة ولا يمكن التراجع عنها. يرجى المتابعة بحذر.</CardDescription></CardHeader>
            <CardContent><p>بمجرد حذف حسابك، ستفقد كل بياناتك الشخصية وسجل الحجوزات بشكل نهائي.</p></CardContent>
            <CardFooter>
                <Button variant="destructive" onClick={() => setIsDeleteConfirmOpen(true)}>
                    <Trash2 className="ml-2 h-4 w-4" />
                    حذف الحساب بشكل نهائي
                </Button>
            </CardFooter>
          </Card>
      </div>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-red-500" /> هل أنت متأكد من حذف حسابك؟</AlertDialogTitle><AlertDialogDescription>هذا الإجراء سيقوم بحذف حسابك بشكل نهائي. لا يمكن التراجع عن هذا الإجراء. سيتم حذف جميع بياناتك الشخصية وحجوزاتك وسجل رحلاتك.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">نعم، قم بحذف حسابي</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
