'use client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, DownloadCloud, Wallet } from "lucide-react";

export function WalletBalanceCard() {
    return (
        <Card className="w-full shadow-xl bg-gradient-to-tr from-primary via-blue-800 to-indigo-900 text-primary-foreground border-0">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Wallet className="h-6 w-6" />
                    <span>نظرة عامة على الرصيد</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
                <div className="p-4 rounded-lg bg-black/20 backdrop-blur-sm">
                    <h3 className="text-sm font-semibold text-white/80">الرصيد القابل للسحب</h3>
                    <p className="text-4xl font-bold tracking-tighter">0.00</p>
                    <p className="text-xs text-white/70">دينار أردني</p>
                </div>
                <div className="p-4 rounded-lg bg-black/20 backdrop-blur-sm">
                    <h3 className="text-sm font-semibold text-white/80">الرصيد المعلق</h3>
                    <p className="text-4xl font-bold tracking-tighter">0.00</p>
                    <p className="text-xs text-white/70">دينار أردني</p>
                </div>
            </CardContent>
            <CardFooter className="p-4 flex justify-between items-center">
                 <p className="text-xs text-white/60">آخر تحديث: الآن</p>
                <Button variant="secondary" disabled>
                    <DownloadCloud className="ml-2 h-4 w-4" />
                    طلب سحب الأموال
                </Button>
            </CardFooter>
        </Card>
    );
}
