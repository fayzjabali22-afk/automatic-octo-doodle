'use client';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';

export default function CarrierDashboardPage() {
  const { profile, isLoading } = useUserProfile();

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">بوابة الناقل - المنطقة الآمنة</h1>
        {isLoading ? (
            <Skeleton className="h-6 w-48 mt-2" />
        ) : (
             <p className="text-muted-foreground text-lg">
                مرحباً بك يا {profile?.firstName}
            </p>
        )}
      </header>
       <p>Carrier Portal - Secure Zone. Welcome {profile?.name}</p>
    </div>
  );
}
