'use client';

import { ReactNode } from "react";

export default function CarrierOverviewLayout({ children }: { children: ReactNode }) {
    return (
        <div className="p-2 md:p-6 lg:p-8 space-y-4">
            <header className="px-2">
                <h1 className="text-2xl md:text-3xl font-bold">النظرة السريعة</h1>
                <p className="text-muted-foreground text-sm md:text-base">
                    تابع ملخص أدائك وإحصائياتك الرئيسية من هنا.
                </p>
            </header>
            <main>
                {children}
            </main>
        </div>
    )
}
