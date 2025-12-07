'use client';
import { AdminDashboardStats } from '@/components/admin/admin-dashboard-stats';
import { RecentUsers } from '@/components/admin/recent-users';
import { RecentTrips } from '@/components/admin/recent-trips';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">لوحة تحكم المدير الأعلى</h1>
        <p className="text-muted-foreground">نظرة شاملة على عمليات النظام.</p>
      </header>
      <AdminDashboardStats />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4">
            <RecentTrips />
        </div>
        <div className="lg:col-span-3">
            <RecentUsers />
        </div>
      </div>
    </div>
  );
}
