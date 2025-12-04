'use client';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, Pencil } from "lucide-react";
import Link from "next/link";

export function PaymentInstructionsDisplay() {
    const { profile, isLoading } = useUserProfile();

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-16 w-full" />
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-10 w-32" />
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    تعليمات الدفع الحالية
                </CardTitle>
                <CardDescription>
                    هذه هي التعليمات التي يراها المسافرون لدفع العربون لك مباشرة.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {profile?.paymentInformation ? (
                    <div className="p-4 bg-muted rounded-md border border-dashed">
                        <p className="whitespace-pre-wrap">{profile.paymentInformation}</p>
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground p-8">
                        <p className="font-bold">لم يتم إضافة تعليمات دفع بعد.</p>
                        <p className="text-sm mt-1">اذهب إلى ملفك الشخصي لإضافة التعليمات.</p>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button asChild>
                    <Link href="/profile">
                        <Pencil className="ml-2 h-4 w-4" />
                        تعديل التعليمات في الملف الشخصي
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
    