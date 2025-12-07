'use client';

import { ReactNode } from "react";

export default function CarrierBookingsLayout({ children }: { children: ReactNode }) {
    return (
        <div className="space-y-4 w-full">
            <header>
                <h1 className="text-xl md:text-2xl font-bold">طلبات الحجز والموافقة</h1>
                <p className="text-muted-foreground text-sm md:text-base">
                    قم بتأكيد أو رفض طلبات الحجز الواردة من المسافرين لرحلاتك المجدولة.
                </p>
            </header>
            <main>
                {children}
            </main>
        </div>
    )
}
