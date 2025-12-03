'use client';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';

export default function CarrierDashboardPage() {
  const { profile, isLoading } = useUserProfile();

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Secure Carrier Zone - Access Granted</h1>
        {isLoading ? (
            <Skeleton className="h-6 w-48 mt-2" />
        ) : (
             <p className="text-muted-foreground text-lg">
                Welcome {profile?.firstName}
            </p>
        )}
      </header>
    </div>
  );
}
