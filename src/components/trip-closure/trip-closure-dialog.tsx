
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Trip } from '@/lib/data';

interface TripClosureDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onRate: () => void;
  onReport: () => void;
  trip: Trip | null;
}

// NOTE: This component is now DEPRECATED as of the new carrier-centric flow.
// It will be removed in a future phase. For now, it remains to avoid breaking imports.
// The new logic is handled by the carrier in `TripCompletionDialog`.

export function TripClosureDialog({ isOpen, onOpenChange, onRate, onReport, trip }: TripClosureDialogProps) {
  if (!trip) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إجراءات إنهاء الرحلة</DialogTitle>
          <DialogDescription>
            هذه النافذة قيد الإيقاف. سيتم إدارة إغلاق الرحلة من طرف الناقل قريباً.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
           <p className="text-center text-muted-foreground text-sm p-4 border border-dashed rounded-md">
              المنطق الجديد يعطي الصلاحية للناقل لإنهاء الرحلة.
           </p>
        </div>
         <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
                إغلاق
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
