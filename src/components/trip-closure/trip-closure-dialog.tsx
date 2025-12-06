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
import { AlertCircle, Clock, Star } from 'lucide-react';
import type { Trip } from '@/lib/data';

interface TripClosureDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onRate: () => void;
  onReport: () => void;
  trip: Trip | null;
}

export function TripClosureDialog({ isOpen, onOpenChange, onRate, onReport, trip }: TripClosureDialogProps) {
  if (!trip) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إجراءات إنهاء الرحلة</DialogTitle>
          <DialogDescription>
            لقد اكتملت رحلتك من {trip.origin} إلى {trip.destination}. ما هو الإجراء الذي تود اتخاذه؟
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <Button size="lg" onClick={onRate} className="h-auto py-3">
            <div className="flex flex-col items-start w-full">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                <span className="font-bold text-base">تقييم وإغلاق الرحلة</span>
              </div>
              <p className="text-xs text-right opacity-80 whitespace-normal">
                شاركنا رأيك في التجربة وأغلق الرحلة نهائياً.
              </p>
            </div>
          </Button>

          <Button size="lg" variant="secondary" onClick={() => onOpenChange(false)} className="h-auto py-3">
             <div className="flex flex-col items-start w-full">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span className="font-bold text-base">ليس الآن</span>
              </div>
               <p className="text-xs text-right opacity-80 whitespace-normal">
                سيقوم النظام بتذكيرك لاحقاً لإغلاق الرحلة.
              </p>
            </div>
          </Button>

           <Button size="lg" variant="outline" onClick={onReport} className="h-auto py-3">
             <div className="flex flex-col items-start w-full">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span className="font-bold text-base">الإبلاغ عن مشكلة</span>
              </div>
               <p className="text-xs text-right opacity-80 whitespace-normal">
                واجهت مشكلة أثناء الرحلة؟ أبلغنا بذلك.
              </p>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
