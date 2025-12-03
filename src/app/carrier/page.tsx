'use client';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardStats } from '@/components/carrier/dashboard-stats';
import { QuickActions } from '@/components/carrier/quick-actions';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function CarrierDashboardPage() {
  const { profile, isLoading } = useUserProfile();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 18) return 'مساء الخير';
    return 'مساء الخير';
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {isLoading ? (
              <Skeleton className="h-9 w-48" />
            ) : (
              `${getGreeting()}، ${profile?.firstName || 'أيها الناقل'}`
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            هذه هي غرفة عملياتك. نأمل لك يوماً مثمراً.
          </p>
        </div>
        <div className="text-sm text-muted-foreground font-medium bg-card border px-3 py-1 rounded-md">
          {new Date().toLocaleDateString('ar-SA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </header>

      {/* Main Content */}
      <div className="space-y-8">
        {/* Stats Section */}
        <DashboardStats />

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
