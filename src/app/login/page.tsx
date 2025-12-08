
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
import { Shield, TestTube2 } from 'lucide-react';

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
    if (!auth) {
        toast({
            variant: "destructive",
            title: "خطأ",
            description: "خدمات Firebase غير مهيأة.",
        });
        return;
    };
    
    toast({
      title: 'جاري تسجيل الدخول...',
      description: 'الرجاء الانتظار.',
    });

    const userCredential = await initiateEmailSignIn(auth, data.email, data.password);
    
    if (userCredential) { // Check if userCredential is not null
      toast({
        title: 'تم تسجيل الدخول بنجاح!',
        description: 'سيتم توجيهك قريباً.',
      });
      router.push('/');
    }
    // No else block needed, initiateEmailSignIn handles failure toasts
  };
  
  const handleGoogleSignIn = async () => {
    if (!auth || !firestore) return;
    const success = await initiateGoogleSignIn(auth, firestore);
    if (success) {
      toast({
        title: 'تم تسجيل الدخول بنجاح!',
        description: 'سيتم توجيهك قريباً.',
      });
      router.push('/');
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="flex items-center justify-center p-6 xl:p-12">
        <Card className="w-full max-w-md p-6 space-y-6 rounded-lg shadow-2xl bg-card border-border">
          <div className="space-y-2 text-center">
            <Logo className="mb-4 justify-center" />
            <h1 className="text-3xl font-bold">أهلاً بالقائد</h1>
            <p className="text-muted-foreground">
              الخطوة الأولى هي تأمين هويتك كمالك للنظام.
            </p>
          </div>
          
           <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                 <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                        أنشئ حساب المالك الآن
                    </span>
                </div>
            </div>

            <Button variant="default" className="w-full" size="lg" onClick={() => router.push('/signup')}>
              إنشاء حساب المدير الأعلى
            </Button>
        
          <div className="mt-6 text-center text-sm">
            هل تملك حساباً بالفعل؟{' '}
            <Link href="/login-form" className="underline font-bold">
              سجل دخولك من هنا
            </Link>
          </div>
        </Card>
      </div>
       <div className="relative hidden bg-muted lg:block">
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
