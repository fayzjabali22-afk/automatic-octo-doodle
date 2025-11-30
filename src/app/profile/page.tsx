'use client';
import { useForm } from 'react-hook-form';
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
import { useUser, useFirestore, useMemoFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { deleteUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


const profileFormSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters.'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  phoneNumber: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc(userProfileRef);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: ''
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        email: userProfile.email || user?.email || '',
        phoneNumber: userProfile.phoneNumber || user?.phoneNumber || ''
      });
    } else if (user) {
        form.reset({
        ...form.getValues(),
        email: user.email || '',
        phoneNumber: user.phoneNumber || ''
        });
    }
  }, [userProfile, user, form]);
  
  function onSubmit(data: ProfileFormValues) {
    if (!userProfileRef) return;
    
    setDocumentNonBlocking(userProfileRef, data, { merge: true });

    toast({
      title: 'تم تحديث الملف الشخصي',
      description: 'تم حفظ تغييراتك بنجاح.',
    });
  }

  return (
    <AppLayout>
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">إعدادات الملف الشخصي</CardTitle>
          <CardDescription>
            قم بإدارة معلومات حسابك وتفضيلاتك.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="flex items-center space-x-6 rtl:space-x-reverse">
                <Avatar className="h-20 w-20">
                  {user?.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || ''} />}
                  <AvatarFallback>
                    {userProfile?.firstName ? userProfile.firstName.charAt(0) : user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" type="button">تغيير الصورة</Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم الأول</FormLabel>
                      <FormControl>
                        <Input placeholder="اسمك الأول" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم الأخير</FormLabel>
                      <FormControl>
                        <Input placeholder="اسمك الأخير" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="بريدك الإلكتروني" {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="رقم هاتفك" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">حفظ التغييرات</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
