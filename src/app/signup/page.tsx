
'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useState }
from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
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
import { Logo } from '@/components/logo';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useFirestore, initiateEmailSignUp, useAuth, initiateGoogleSignIn, initiateEmailSignIn } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { MailCheck, Shield, TestTube2 } from 'lucide-react';

const signupFormSchema = z.object({
  fullName: z.string().min(2, 'الاسم الكامل يجب أن يتكون من حرفين على الأقل.'),
  phoneNumber: z.string().min(1, 'رقم الهاتف مطلوب.'),
  email: z.string().email('البريد الإلكتروني غير صالح.'),
  password: z.string().min(5, 'كلمة المرور يجب أن تتكون من 5 أحرف على الأقل.'),
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

export default function SignupPage() {
  const bgImage = PlaceHolderImages.find(
    (img) => img.id === 'login-background'
  );
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      fullName: '',
      phoneNumber: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    if (!auth || !firestore) {
        toast({ title: "خطأ", description: "Firebase not initialized.", variant: "destructive"});
        return;
    };

    const [firstName, ...lastNameParts] = data.fullName.split(' ');
    const userProfile = {
        firstName: firstName,
        lastName: lastNameParts.join(' '),
        email: data.email,
        phoneNumber: data.phoneNumber,
        role: data.email === 'dev@safar.com' ? 'owner' : 'traveler'
    };

    const userCredential = await initiateEmailSignUp(auth, firestore, data.email, data.password, userProfile, false);

    if (userCredential) {
        toast({
          title: 'تم إنشاء الحساب بنجاح!',
          description: 'سيتم توجيهك إلى لوحة التحكم.',
        });
        router.push('/dashboard');
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth || !firestore) return;
    const success = await initiateGoogleSignIn(auth, firestore);
    if (success) {
      toast({
        title: 'تم إنشاء الحساب بنجاح!',
        description: 'سيتم توجيهك قريباً.',
      });
      router.push('/dashboard');
    }
  };

  const handleDevSignIn = async () => {
    if (!auth || !firestore) {
      toast({ title: "خطأ", description: "Firebase not initialized.", variant: "destructive" });
      return;
    }
  
    const devEmail = 'dev@safar.com';
    const devPassword = 'password123';
  
    toast({ title: 'جاري التحقق من هوية المطور...', description: 'الرجاء الانتظار.' });
  
    const signInCredential = await initiateEmailSignIn(auth, devEmail, devPassword);
  
    if (signInCredential) {
      toast({ title: 'أهلاً بعودتك أيها المطور الأعلى', description: 'جاري التوجيه...' });
      router.push('/admin'); // Redirect to admin panel on successful sign-in
      return;
    }
  
    // If sign-in fails, it means the account doesn't exist yet. Create it.
    toast({ title: 'جاري إنشاء حساب المطور الأعلى...', description: 'لحظة من فضلك.' });
    const devProfile = {
      firstName: 'المطور',
      lastName: 'الأعلى',
      email: devEmail,
      phoneNumber: '000-000-0000',
      role: 'owner' as const,
    };
  
    const signUpCredential = await initiateEmailSignUp(auth, firestore, devEmail, devPassword, devProfile, false);
  
    if (signUpCredential) {
      // No need to sign in again, initiateEmailSignUp now handles the session.
      toast({ title: 'تم إنشاء حسابك أيها المطور', description: 'جاري التوجيه...' });
      router.push('/admin'); // Redirect to admin panel after creation.
    }
    // initiateEmailSignUp will show its own error toast on failure.
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center px-4 py-8 md:px-0">
      {bgImage && (
        <Image
          src={bgImage.imageUrl}
          alt={bgImage.description}
          fill
          className="absolute inset-0 -z-10 h-full w-full object-cover"
          data-ai-hint={bgImage.imageHint}
        />
      )}
      <div className="absolute inset-0 -z-10 bg-black/60" />
      <Card className="mx-auto max-w-sm bg-card/80 backdrop-blur-sm border-white/20">
        <CardHeader className="text-center">
          <Logo className="mb-4 justify-center" />
          <CardTitle className="text-2xl">إنشاء حساب جديد</CardTitle>
          <CardDescription>
            أدخل معلوماتك للبدء
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 mb-4">
               <Button type="button" variant="secondary" size="lg" className="w-full" onClick={handleDevSignIn}>
                <TestTube2 className="mr-2 h-5 w-5" />
                زر الطوارئ (مطور)
              </Button>
            </div>
            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card/80 px-2 text-muted-foreground">
                        أو أنشئ حساباً
                    </span>
                </div>
            </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel>الاسم الكامل</FormLabel>
                    <FormControl>
                      <Input placeholder="فايز الحربي" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl>
                      <Input dir="ltr" placeholder="+966 50 123 4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="m@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel>كلمة المرور</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
             
              <Button variant="secondary" type="submit" className="w-full">
                إنشاء حساب
              </Button>
            </form>
          </Form>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card/80 px-2 text-muted-foreground">
                أو أكمل باستخدام
                </span>
            </div>
          </div>
           <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
            التسجيل باستخدام جوجل
          </Button>
          <div className="mt-4 text-center text-sm">
            لديك حساب بالفعل؟{' '}
            <Link href="/login" className="underline">
              تسجيل الدخول
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
