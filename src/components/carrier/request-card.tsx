'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trip } from '@/lib/data';
import { Calendar, Users, Handshake, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { OfferDialog } from './offer-dialog';


const cities: { [key: string]: string } = {
    damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص',
    amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
    riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام',
    cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة',
    dubai: 'دبي', kuwait: 'الكويت'
};

const getCityName = (key: string) => cities[key] || key;

const safeDateFormat = (dateInput: any): string => {
  if (!dateInput) return 'غير محدد';
  try {
    const dateObj = new Date(dateInput);
    return dateObj.toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'تاريخ غير صالح';
  }
};


interface RequestCardProps {
    tripRequest: Trip;
}

export function RequestCard({ tripRequest }: RequestCardProps) {
    const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);

    return (
        <>
            <Card className="flex flex-col justify-between shadow-md hover:shadow-primary/20 transition-shadow duration-300">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between text-lg">
                        <span>
                            {getCityName(tripRequest.origin)} - {getCityName(tripRequest.destination)}
                        </span>
                        <Badge variant="outline">{tripRequest.status === 'Awaiting-Offers' ? 'جديد' : tripRequest.status}</Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 pt-1 text-xs">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {safeDateFormat(tripRequest.departureDate)}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-4 text-foreground">
                        <Users className="h-5 w-5 text-primary" />
                        <span>عدد الركاب المطلوب: <span className="font-bold">{tripRequest.passengers || 'غير محدد'}</span></span>
                    </div>
                    {tripRequest.cargoDetails && (
                        <div className="flex items-start gap-4 text-muted-foreground border-t pt-3">
                            <Info className="h-5 w-5 text-accent" />
                            <span>تفاصيل إضافية: <span className="font-semibold">{tripRequest.cargoDetails}</span></span>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="bg-muted/30 p-2">
                    <Button className="w-full" onClick={() => setIsOfferDialogOpen(true)}>
                        <Handshake className="ml-2 h-4 w-4" />
                        تقديم عرض
                    </Button>
                </CardFooter>
            </Card>
            <OfferDialog 
                isOpen={isOfferDialogOpen}
                onOpenChange={setIsOfferDialogOpen}
                trip={tripRequest}
            />
        </>
    );
}
