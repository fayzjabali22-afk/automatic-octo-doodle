'use client';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';
import { QuickActions } from '@/components/carrier/quick-actions';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useState, useEffect } from 'react';

export default function CarrierDashboardPage() {
  const { profile, isLoading } = useUserProfile();
  const [greeting, setGreeting] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    // This effect runs only on the client, after hydration, preventing mismatches.
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'صباح الخير';
      if (hour < 18) return 'مساء الخير';
      return 'مساء الخير';
    };

    setGreeting(getGreeting());
    setCurrentDate(new Date().toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }));
  }, []); // Empty dependency array ensures it runs once on mount

  return (
    <div className="p-2 md:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isLoading ? (
              <Skeleton className="h-9 w-48" />
            ) : (
              // Display greeting only after it's been set on the client
              greeting ? `${greeting}، ${profile?.firstName || 'أيها الناقل'}` : <Skeleton className="h-9 w-48" />
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            هذه هي غرفة عملياتك. نأمل لك يوماً مثمراً.
          </p>
        </div>
        <div className="text-sm text-muted-foreground font-medium bg-card border px-3 py-1.5 rounded-md min-w-[180px] text-center">
          {currentDate ? currentDate : <Skeleton className="h-5 w-full" />}
        </div>
      </header>

      {/* Main Content */}
      <div className="space-y-8">
        
        {/* Quick Actions Section */}
        <QuickActions />

        {/* Legal Disclaimer */}
        <Alert variant="default" className="bg-card/50 border-accent/30">
          <AlertCircle className="h-4 w-4 text-accent" />
          <AlertTitle className="text-accent font-bold">تنويه قانوني</AlertTitle>
          <AlertDescription className="text-muted-foreground text-xs">
            نود تذكيركم بأن تطبيق "Safar Carrier" يعمل كوسيط لتسهيل التواصل بين الناقلين والمسافرين. التطبيق غير مسؤول عن أي اتفاقات أو تعاملات تتم خارج المنصة. يرجى التأكد من الالتزام بالقوانين واللوائح المحلية المنظمة لعمليات النقل.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
