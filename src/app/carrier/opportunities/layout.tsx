'use client';

import { ReactNode } from "react";

export default function CarrierOpportunitiesLayout({ children }: { children: ReactNode }) {
    return (
        <div className="p-4 md:px-6 lg:px-8 space-y-4">
            <header>
                <h1 className="text-xl md:text-2xl font-bold">مركز الفرص</h1>
                <p className="text-muted-foreground text-sm md:text-base">
                    استعرض كل الفرص المتاحة من السوق العام والطلبات المباشرة في مكان واحد.
                </p>
            </header>
            <main>
                {children}
            </main>
        </div>
    )
}
