'use client';
// This is a placeholder for the trips management page in the admin dashboard.
// It will be implemented in a future step.

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function AdminTripsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>إدارة الرحلات</CardTitle>
                <CardDescription>
                    عرض وتعديل جميع الرحلات في النظام.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground">
                 <Construction className="h-16 w-16 mb-4" />
                 <h3 className="text-lg font-bold">قيد الإنشاء</h3>
                 <p className="text-sm">هذه الشاشة ستكون متاحة في المراحل القادمة من التطوير.</p>
            </CardContent>
        </Card>
    )
}
