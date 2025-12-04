'use client';

import { DashboardStats } from '@/components/carrier/dashboard-stats';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { BankDetailsForm } from '@/components/carrier/bank-details-form';
import { PaymentInstructionsDisplay } from '@/components/carrier/payment-instructions-display';

export default function OverviewPage() {
    return (
        <div className="space-y-8">
            <DashboardStats />
            <PaymentInstructionsDisplay />
             <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200">
                <Info className="h-4 w-4 !text-blue-500" />
                <AlertTitle className="font-bold">مرحلة تجريبية</AlertTitle>
                <AlertDescription>
                   الأرقام المعروضة في هذه الشاشة هي لأغراض العرض التوضيحي فقط في المرحلة الحالية من تطوير التطبيق.
                </AlertDescription>
            </Alert>
        </div>
    )
}

    