'use client';

import { ReactNode } from "react";

export default function CarrierOverviewLayout({ children }: { children: ReactNode }) {
    return (
        <div className="p-0 md:p-6 lg:p-8 space-y-4">
            <header className="p-4 md:p-0">
                <h1 className="text-xl md:text-2xl font-bold">النظرة السريعة</h1>
                <p className="text-muted-foreground text-sm md:text-base">
                    تابع ملخص أدائك وإحصائياتك الرئيسية من هنا.
                </p>
            </header>
            <main className="px-2 md:px-0">
                {children}
            </main>
        </div>
    )
}
