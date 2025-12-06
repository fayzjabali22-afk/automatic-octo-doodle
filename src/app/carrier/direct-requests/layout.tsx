'use client';

import { ReactNode } from "react";

export default function CarrierDirectRequestsLayout({ children }: { children: ReactNode }) {
    return (
        <div className="p-2 md:p-6 lg:p-8 space-y-4">
            <header className="px-2 md:px-0">
                <h1 className="text-2xl md:text-3xl font-bold">الطلبات المباشرة</h1>
                <p className="text-muted-foreground text-sm md:text-base">
                    الطلبات الموجهة لك خصيصاً. قم بالموافقة وتحديد السعر أو الاعتذار عنها.
                </p>
            </header>
            <main>
                {children}
            </main>
        </div>
    )
}
