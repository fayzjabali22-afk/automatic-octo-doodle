'use client';
import { useState } from 'react';
import { MyTripsList } from '@/components/carrier/my-trips-list';

export default function CarrierTripsPage() {
    return (
        <div className="p-2 md:p-6 lg:p-8 space-y-4">
            <header className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 rounded-lg bg-card shadow-sm border">
                <div className="text-right w-full sm:w-auto">
                    <h1 className="text-xl md:text-2xl font-bold">رحلاتي المجدولة</h1>
                    <p className="text-muted-foreground text-xs md:text-sm">
                        أدرْ رحلاتك المنشورة، وتابع الحجوزات، وعدّل المقاعد المتاحة.
                    </p>
                </div>
            </header>
            
            <main>
                <MyTripsList />
            </main>
        </div>
    );
}
