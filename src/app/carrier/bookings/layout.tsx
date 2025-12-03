'use client';

import { ReactNode } from "react";

export default function CarrierBookingsLayout({ children }: { children: ReactNode }) {
    return (
        <div className="p-2 md:p-6 lg:p-8 space-y-4">
            <header className="px-2">
                <h1 className="text-2xl md:text-3xl font-bold">طلبات الموافقة</h1>
                <p className="text-muted-foreground text-sm md:text-base">
                    قم بتأكيد أو رفض طلبات الحجز الواردة من المسافرين.
                </p>
            </header>
            <main>
                {children}
            </main>
        </div>
    )
}
