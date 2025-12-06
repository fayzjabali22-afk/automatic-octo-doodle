'use client';

import { ReactNode } from "react";

export default function CarrierRequestsLayout({ children }: { children: ReactNode }) {
    return (
        <div className="p-0 md:p-6 lg:p-8 space-y-4">
            <header className="p-4 md:p-0">
                <h1 className="text-xl md:text-2xl font-bold">سوق الطلبات العام</h1>
                <p className="text-muted-foreground text-sm md:text-base">
                    استعرض طلبات المسافرين العامة وقدم أفضل عروضك للفوز بالرحلة.
                </p>
            </header>
            <main className="px-2 md:px-0">
                {children}
            </main>
        </div>
    )
}
