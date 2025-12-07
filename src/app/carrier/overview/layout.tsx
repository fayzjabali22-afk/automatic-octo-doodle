'use client';

import { ReactNode } from "react";

export default function CarrierOverviewLayout({ children }: { children: ReactNode }) {
    return (
        <div className="space-y-4 w-full">
            <header>
                <h1 className="text-xl md:text-2xl font-bold">النظرة السريعة</h1>
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
