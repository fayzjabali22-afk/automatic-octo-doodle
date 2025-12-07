'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Briefcase, Users, PackageSearch } from 'lucide-react';

const stats = [
  {
    title: 'إجمالي المستخدمين',
    value: '152',
    icon: Users,
  },
  {
    title: 'إجمالي الناقلين',
    value: '23',
    icon: Briefcase,
  },
  {
    title: 'إجمالي الرحلات',
    value: '89',
    icon: PackageSearch,
  },
  {
    title: 'إجمالي الأرباح (محاكاة)',
    value: '1,250 د.أ',
    icon: DollarSign,
  },
];

export function AdminDashboardStats() {
  return (
    <div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
            <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
            </Card>
        ))}
        </div>
    </div>
  );
}
