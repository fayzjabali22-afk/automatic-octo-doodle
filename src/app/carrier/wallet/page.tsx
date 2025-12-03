'use client';
import { WalletBalanceCard } from "@/components/carrier/wallet-balance-card";
import { BankDetailsForm } from "@/components/carrier/bank-details-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function WalletPage() {
    return (
        <div className="space-y-8">
            <WalletBalanceCard />
            <BankDetailsForm />
            <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200">
                <Info className="h-4 w-4 !text-blue-500" />
                <AlertTitle className="font-bold">مرحلة تجريبية</AlertTitle>
                <AlertDescription>
                    نظام المحفظة والدفع قيد التطوير حالياً. لا يمكن سحب أو إيداع أموال حقيقية في هذه المرحلة. سيتم تفعيل المعاملات المالية قريباً.
                </AlertDescription>
            </Alert>
        </div>
    );
}
