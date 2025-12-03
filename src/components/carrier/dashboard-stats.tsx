'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Briefcase, Users, PackageSearch } from 'lucide-react';

const stats = [
  {
    title: 'طلبات تنتظر العروض',
    value: '0',
    description: 'طلبات جديدة في السوق',
    icon: PackageSearch,
  },
  {
    title: 'حجوزاتي المؤكدة',
    value: '0',
    description: 'الرحلات القادمة المخطط لها',
    icon: Briefcase,
  },
  {
    title: 'عدد الركاب',
    value: '0',
    description: 'إجمالي الركاب في رحلاتك',
    icon: Users,
  },
  {
    title: 'الرصيد (قيد الانتظار)',
    value: '0.00 د.أ',
    description: 'الأرباح من الرحلات المكتملة',
    icon: DollarSign,
  },
];

export function DashboardStats() {
  return (
    <div>
        <h2 className="text-xl font-bold mb-4">نظرة سريعة</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
            <Card key={stat.title} className="hover:bg-card/80 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
            </Card>
        ))}
        </div>
    </div>
  );
}
