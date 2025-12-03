'use client';

import { ReactNode } from "react";

export default function CarrierWalletLayout({ children }: { children: ReactNode }) {
    return (
        <div className="p-2 md:p-6 lg:p-8 space-y-4">
            <header className="px-2">
                <h1 className="text-2xl md:text-3xl font-bold">المحفظة المالية</h1>
                <p className="text-muted-foreground text-sm md:text-base">
                    أدرْ رصيدك وقم بإعداد معلومات استقبال الأموال.
                </p>
            </header>
            <main>
                {children}
            </main>
        </div>
    )
}
