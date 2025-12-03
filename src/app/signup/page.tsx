
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
import { useFirestore, initiateEmailSignUp, useAuth, initiateGoogleSignIn } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { MailCheck } from 'lucide-react';

const signupFormSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters.'),
  phoneNumber: z.string().min(1, 'Phone number is required.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(5, 'Password must be at least 5 characters.'),
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
  const [isSignUpSuccessful, setIsSignUpSuccessful] = useState(false);
  const [userEmail, setUserEmail] = useState('');

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
        toast({ title: "Error", description: "Firebase not initialized.", variant: "destructive"});
        return;
    };

    const [firstName, ...lastNameParts] = data.fullName.split(' ');
    const userProfile = {
        firstName: firstName,
        lastName: lastNameParts.join(' '),
        email: data.email,
        phoneNumber: data.phoneNumber,
    };

    const success = await initiateEmailSignUp(auth, firestore, data.email, data.password, userProfile);

    if (success) {
        setUserEmail(data.email);
        setIsSignUpSuccessful(true);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth || !firestore) return;
    const success = await initiateGoogleSignIn(auth, firestore);
    if (success) {
      toast({
        title: 'Signed Up Successfully!',
        description: 'You will be redirected shortly.',
      });
      router.push('/dashboard');
    }
  };

  if (isSignUpSuccessful) {
    return (
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4">
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
            <Card className="mx-auto max-w-sm text-center">
                <CardHeader>
                    <MailCheck className="mx-auto h-16 w-16 text-green-500" />
                    <CardTitle className="text-2xl mt-4">Success!</CardTitle>
                    <CardDescription className="pt-2">
                        We've sent a verification and legal acknowledgment link to your email.
                        <br/>
                        <span className="font-bold text-foreground">{userEmail}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground">
                        If you don't see the email, please check your spam folder.
                    </p>
                    <Button onClick={() => router.push('/login')} className="mt-4">Back to Login</Button>
                </CardContent>
            </Card>
        </div>
    );
  }


  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4">
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
      <Card className="mx-auto max-w-sm">
        <CardHeader className="text-center">
          <Logo className="mb-4 justify-center" />
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>
            Enter your information to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input placeholder="Fayz Al-Harbi" {...field} />
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
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+966 50 123 4567" {...field} />
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
                    <FormLabel>Email</FormLabel>
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
             
              <Button variant="secondary" type="submit" className="w-full">
                Create an account
              </Button>
            </form>
          </Form>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                Or continue with
                </span>
            </div>
          </div>
           <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
            Sign up with Google
          </Button>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
