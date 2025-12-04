'use client';
import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Trip } from '@/lib/data';
import { Loader2, Send, Zap, Calendar, Search, RefreshCw, X } from 'lucide-react';
import { addDays, subDays, isSameDay } from 'date-fns';
import { ScheduledTripCard } from '../scheduled-trip-card';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


interface SmartResubmissionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tripRequest: Trip;
  allScheduledTrips: Trip[];
}

export function SmartResubmissionDialog({
  isOpen,
  onOpenChange,
  tripRequest,
  allScheduledTrips,
}: SmartResubmissionDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { exactMatches, nearbyMatches } = useMemo(() => {
    if (!tripRequest) return { exactMatches: [], nearbyMatches: [] };

    const requestDate = new Date(tripRequest.departureDate);
    const twoDaysBefore = subDays(requestDate, 2);
    const twoDaysAfter = addDays(requestDate, 2);

    const exact: Trip[] = [];
    const nearby: Trip[] = [];

    allScheduledTrips.forEach(trip => {
      const tripDate = new Date(trip.departureDate);
      const isMatch = trip.origin === tripRequest.origin &&
                      trip.destination === tripRequest.destination &&
                      (trip.availableSeats || 0) >= (tripRequest.passengers || 1);

      if (!isMatch) return;

      if (isSameDay(requestDate, tripDate)) {
        exact.push(trip);
      } else if (tripDate >= twoDaysBefore && tripDate <= twoDaysAfter) {
        nearby.push(trip);
      }
    });

    return { exactMatches: exact, nearbyMatches: nearby };
  }, [tripRequest, allScheduledTrips]);

  const handleRepublish = () => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      toast({
        title: 'محاكاة: تم إعادة نشر طلبك بنجاح!',
        description: 'تم تحديث طلبك وإرسال تنبيهات جديدة للناقلين.',
      });
      setIsSubmitting(false);
      onOpenChange(false);
    }, 1500);
  };
  
  const handleBookNow = (trip: Trip) => {
    toast({
        title: 'محاكاة: جاري توجيهك للحجز',
        description: `سيتم فتح نافذة الحجز لهذه الرحلة مع الناقل ${trip.carrierName}.`
    })
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-accent" />
            إعادة التوجيه الذكي لطلبك
          </DialogTitle>
          <DialogDescription>
            طلبك لم يتلق عروضاً بعد. يمكنك حجز رحلة مجدولة مباشرة أو إعادة نشر طلبك.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="exact" className="w-full flex-grow flex flex-col min-h-0">
            <div className="px-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="exact">
                        <Search className="ml-2 h-4 w-4" />
                        رحلات مطابقة
                    </TabsTrigger>
                    <TabsTrigger value="nearby">
                        <Calendar className="ml-2 h-4 w-4" />
                        رحلات بتاريخ قريب
                    </TabsTrigger>
                </TabsList>
            </div>
            
            <ScrollArea className="flex-grow mt-4">
                <TabsContent value="exact" className="px-6 space-y-4 m-0">
                    {exactMatches.length > 0 ? (
                        exactMatches.map(trip => (
                            <ScheduledTripCard key={trip.id} trip={trip} onBookNow={handleBookNow} context="dashboard" />
                        ))
                    ) : (
                         <div className="text-center py-16 text-muted-foreground">
                            <p className="font-bold">لا توجد رحلات مجدولة مطابقة تماماً لطلبك.</p>
                            <p className="text-sm mt-1">جرب البحث في التواريخ القريبة أو أعد نشر طلبك.</p>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="nearby" className="px-6 space-y-4 m-0">
                     {nearbyMatches.length > 0 ? (
                        nearbyMatches.map(trip => (
                           <ScheduledTripCard key={trip.id} trip={trip} onBookNow={handleBookNow} context="dashboard" />
                        ))
                    ) : (
                         <div className="text-center py-16 text-muted-foreground">
                            <p className="font-bold">لا توجد رحلات مجدولة في التواريخ القريبة.</p>
                            <p className="text-sm mt-1">يمكنك إعادة نشر طلبك لتنبيه الناقلين بتاريخك المحدد.</p>
                        </div>
                    )}
                </TabsContent>
            </ScrollArea>
        </Tabs>
        
        <DialogFooter className="p-4 border-t bg-background flex flex-col sm:flex-row gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
             <X className="ml-2 h-4 w-4" />
             إغلاق
          </Button>
          <Button
            type="button"
            onClick={handleRepublish}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري النشر...</>
            ) : (
              <><RefreshCw className="ml-2 h-4 w-4" /> إعادة نشر الطلب وتنبيه الناقلين</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
