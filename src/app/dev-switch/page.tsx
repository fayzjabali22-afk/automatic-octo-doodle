'use client';

import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserProfile } from '@/hooks/use-user-profile';
import { ArrowLeftRight, User, Ship } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function Unauthorized() {
    const router = useRouter();
    useEffect(() => {
        const timer = setTimeout(() => {
            router.replace('/dashboard');
        }, 3000);
        return () => clearTimeout(timer);
    }, [router]);
    
    return (
        <div className="flex h-full items-center justify-center text-center p-8">
            <div className="flex flex-col items-center gap-4">
                <h1 className="text-2xl font-bold text-destructive">Unauthorized</h1>
                <p className="text-muted-foreground max-w-md">
                    This page is for developer use only. Redirecting...
                </p>
            </div>
        </div>
    );
}

export default function DevSwitchPage() {
    const router = useRouter();
    const { user, isLoading } = useUserProfile();

    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex h-full items-center justify-center">Loading...</div>
            </AppLayout>
        );
    }

    if (user?.email !== 'dev@safar.com') {
        return (
            <AppLayout>
                <Unauthorized />
            </AppLayout>
        );
    }
    
    return (
        <AppLayout>
            <div className="container mx-auto max-w-lg p-4 md:p-8">
                <Card className="shadow-2xl border-accent">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-accent/20 p-3 rounded-full w-fit">
                            <ArrowLeftRight className="h-8 w-8 text-accent" />
                        </div>
                        <CardTitle className="mt-4 text-2xl">Developer Interface Switch</CardTitle>
                        <CardDescription>
                            Select which user interface you would like to proceed to.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button 
                            variant="outline" 
                            size="lg" 
                            className="h-24 flex-col gap-2"
                            onClick={() => router.push('/dashboard')}
                        >
                            <User className="h-6 w-6" />
                            <span className="font-bold">Traveler View</span>
                        </Button>
                        <Button 
                            variant="outline" 
                            size="lg" 
                            className="h-24 flex-col gap-2"
                            onClick={() => router.push('/carrier')}
                        >
                            <Ship className="h-6 w-6" />
                             <span className="font-bold">Carrier View</span>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
