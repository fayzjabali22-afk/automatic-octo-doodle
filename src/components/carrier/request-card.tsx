'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trip } from '@/lib/data';
import { Calendar, Users, Handshake, Info, ArrowRight, CircleDollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { cn } from '@/lib/utils';


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
    // Format to show day and month
    return dateObj.toLocaleDateString('ar-SA', {
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'تاريخ غير صالح';
  }
};


interface RequestCardProps {
    tripRequest: Trip;
    onOffer: (trip: Trip) => void;
}

export function RequestCard({ tripRequest, onOffer }: RequestCardProps) {

    return (
        <div className={cn(
            "flex flex-col sm:flex-row sm:items-center sm:justify-between",
            "w-full p-4 border rounded-lg shadow-sm transition-shadow duration-300 hover:shadow-primary/20 bg-card"
        )}>
            <div className="flex-1 mb-4 sm:mb-0">
                {/* Destination */}
                <div className="flex items-center gap-2 font-bold text-lg text-foreground">
                    <span>{getCityName(tripRequest.origin)}</span>
                    <ArrowRight className="h-5 w-5 text-primary" />
                    <span>{getCityName(tripRequest.destination)}</span>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                    <div className="flex items-center gap-1 font-semibold">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{safeDateFormat(tripRequest.departureDate)}</span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold">
                        <Users className="h-3.5 w-3.5" />
                        <span>{tripRequest.passengers || 1} راكب</span>
                    </div>
                     {tripRequest.targetPrice && (
                        <div className="flex items-center gap-1 font-semibold text-green-600">
                            <CircleDollarSign className="h-3.5 w-3.5" />
                            <span>الميزانية: ~{tripRequest.targetPrice} {tripRequest.currency || 'د.أ'}</span>
                        </div>
                     )}
                </div>
            </div>

            {/* Action Button */}
            <div className="flex-shrink-0">
                 <Button className="w-full sm:w-auto" onClick={() => onOffer(tripRequest)}>
                    <Handshake className="ml-2 h-4 w-4" />
                    تقديم عرض
                </Button>
            </div>
        </div>
    );
}
