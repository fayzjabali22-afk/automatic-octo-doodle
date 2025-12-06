'use client';
import { useState } from 'react';
import { MyTripsList } from '@/components/carrier/my-trips-list';

export default function CarrierTripsPage() {
    return (
        // PWA Compliance: No horizontal padding on mobile (p-0), but keep it for larger screens (md:p-6 lg:p-8)
        <div className="p-0 md:p-6 lg:p-8 space-y-4">
            <header className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 rounded-b-lg md:rounded-lg bg-card shadow-sm border-b md:border">
                <div className="text-center sm:text-right w-full sm:w-auto">
                    <h1 className="text-xl md:text-2xl font-bold">رحلاتي النشطة والمجدولة</h1>
                    <p className="text-muted-foreground text-xs md:text-sm">
                        أدرْ رحلاتك الحالية وقيد التنفيذ. الرحلات السابقة تجدها في الأرشيف.
                    </p>
                </div>
            </header>
            
            <main className="px-2 md:px-0">
                <MyTripsList />
            </main>
        </div>
    );
}
