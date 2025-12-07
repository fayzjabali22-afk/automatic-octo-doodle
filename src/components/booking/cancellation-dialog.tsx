'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface CancellationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isCancelling: boolean;
  onConfirm: () => void;
}

export function CancellationDialog({ isOpen, onOpenChange, isCancelling, onConfirm }: CancellationDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            تأكيد إلغاء الحجز
          </AlertDialogTitle>
          <AlertDialogDescription>
            <p className="font-bold py-2">هل أنت متأكد من رغبتك في إلغاء هذا الحجز؟ وتقر أنك المسؤول وحدك عن هذا الإجراء.</p>
            <div className="p-3 text-destructive-foreground bg-destructive/80 rounded-lg text-sm space-y-1">
                <p className="font-bold">إقرار سياسة الإلغاء وخسارة العربون:</p>
                <ul className="list-disc pr-4 text-xs space-y-1">
                    <li>بإتمام هذا الإجراء، أنت تقر بمعرفتك وموافقتك المسبقة على قيمة العربون التي حددها الناقل، وتوافق على أن هذا المبلغ غير قابل للاسترداد في حالة الإلغاء من طرفك.</li>
                    <li>تطبيق "سفريات" هو وسيط فقط، ويخلي مسؤوليته بالكامل عن أي تبعات مالية أو قانونية تنتج عن هذا الإلغاء.</li>
                </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0 pt-4">
          <AlertDialogCancel disabled={isCancelling}>تراجع</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={isCancelling}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isCancelling ? (
                <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الإلغاء...
                </>
            ) : "أقر وأوافق، قم بالإلغاء"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
