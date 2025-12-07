
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
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
import { useAuth, initiateEmailSignIn, useFirestore, initiateGoogleSignIn, initiateEmailSignUp } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { TestTube2 } from 'lucide-react';

const loginFormSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح.'),
  password: z.string().min(1, 'كلمة المرور مطلوبة.'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const bgImage = PlaceHolderImages.find(
    (img) => img.id === 'login-background'
  );
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    if (!auth) return;
    
    toast({
      title: 'جاري تسجيل الدخول...',
      description: 'الرجاء الانتظار.',
    });

    const success = await initiateEmailSignIn(auth, data.email, data.password);

    if (success) {
      toast({
        title: 'تم تسجيل الدخول بنجاح!',
        description: 'سيتم توجيهك قريباً.',
      });
      router.push('/dashboard');
    } else {
        toast({
            variant: "destructive",
            title: "فشل تسجيل الدخول",
            description: "الرجاء التحقق من بريدك الإلكتروني وكلمة المرور.",
        });
    }
  };
  
  const handleGoogleSignIn = async () => {
    if (!auth || !firestore) return;
    const success = await initiateGoogleSignIn(auth, firestore);
    if (success) {
      toast({
        title: 'تم تسجيل الدخول بنجاح!',
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
  
    const signInSuccess = await initiateEmailSignIn(auth, devEmail, devPassword);
  
    if (signInSuccess) {
      toast({ title: 'أهلاً بك أيها المطور', description: 'جاري التوجيه...' });
      router.push('/admin');
      return;
    }
  
    // If sign-in fails, it might be the first time, so we try to create the account.
    toast({ title: 'جاري إنشاء حساب المطور الأعلى...', description: 'لحظة من فضلك.' });
    const devProfile = {
      firstName: 'المطور',
      lastName: 'الأعلى',
      email: devEmail,
      phoneNumber: '000-000-0000',
      role: 'owner' as const,
    };
  
    const signUpSuccess = await initiateEmailSignUp(auth, firestore, devEmail, devPassword, devProfile, false);
  
    if (signUpSuccess) {
      // After successful sign-up, try signing in again to establish the session.
      const finalSignInSuccess = await initiateEmailSignIn(auth, devEmail, devPassword);
      if (finalSignInSuccess) {
        toast({ title: 'أهلاً بك أيها المطور', description: 'جاري التوجيه...' });
        router.push('/admin');
      } else {
        toast({ title: "فشل دخول المطور", description: "لم نتمكن من الدخول بعد إنشاء الحساب.", variant: "destructive"});
      }
    }
  };

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <Logo className="mb-4 justify-center" />
            <h1 className="text-3xl font-bold tracking-tight">أهلاً بعودتك</h1>
            <p className="mt-2 text-muted-foreground">
              ادخل بياناتك للمتابعة إلى حسابك
            </p>
          </div>
            <Button type="button" size="lg" className="w-full" onClick={handleDevSignIn}>
              <TestTube2 className="mr-2 h-5 w-5" />
              دخول فوري للمطور
            </Button>
            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        أو سجل دخولك عبر
                    </span>
                </div>
            </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
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
                  <FormItem>
                    <div className="flex items-center">
                      <FormLabel>كلمة المرور</FormLabel>
                      <Link
                        href="#"
                        className="ml-auto inline-block text-sm underline"
                      >
                        نسيت كلمة المرور؟
                      </Link>
                    </div>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                تسجيل الدخول
              </Button>
            </form>
          </Form>
           <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                  أو أكمل باستخدام
                  </span>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
              تسجيل الدخول باستخدام جوجل
            </Button>
          <div className="mt-6 text-center text-sm">
            ليس لديك حساب؟{' '}
            <Link href="/signup" className="underline font-bold">
              أنشئ حساباً
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden lg:block relative">
        {bgImage && (
          <Image
            src={bgImage.imageUrl}
            alt={bgImage.description}
            fill
            className="h-full w-full object-cover"
            data-ai-hint={bgImage.imageHint}
          />
        )}
      </div>
    </div>
  );
}
