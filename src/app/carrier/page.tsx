'use client';

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function CarrierDashboardPage() {
  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">بوابة الناقل</h1>
        <p className="text-muted-foreground">مرحباً بك في لوحة التحكم الخاصة بك.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>نظام الناقل قيد الإنشاء</CardTitle>
          <CardDescription>
            هذه هي الصفحة الرئيسية لنظام الناقل. سيتم إضافة لوحة التحكم والوظائف الأخرى هنا قريباً.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
