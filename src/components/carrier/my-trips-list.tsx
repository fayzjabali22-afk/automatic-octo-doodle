'use client';
import { useFirestore, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Trip } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarX, ArrowRight, Calendar, Users, CircleDollarSign, CheckCircle, Clock, XCircle, MoreVertical } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '../ui/button';

const cities: { [key: string]: string } = {
    damascus: 'دمشق', aleppo: 'حلب', homs: 'حمص',
    amman: 'عمّان', irbid: 'إربد', zarqa: 'الزرقاء',
    riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام',
    cairo: 'القاهرة', alexandria: 'الاسكندرية', giza: 'الجيزة',
};

const getCityName = (key: string) => cities[key] || key;

const safeDateFormat = (dateInput: any): string => {
  if (!dateInput) return 'غير محدد';
  try {
    const dateObj = new Date(dateInput);
    return dateObj.toLocaleDateString('ar-SA', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return 'تاريخ غير صالح'; }
};

const statusMap: Record<string, { text: string; icon: React.ElementType; className: string }> = {
  'Planned': { text: 'مجدولة', icon: Clock, className: 'bg-blue-100 text-blue-800' },
  'In-Transit': { text: 'قيد التنفيذ', icon: ArrowRight, className: 'bg-yellow-100 text-yellow-800' },
  'Completed': { text: 'مكتملة', icon: CheckCircle, className: 'bg-green-100 text-green-800' },
  'Cancelled': { text: 'ملغاة', icon: XCircle, className: 'bg-red-100 text-red-800' },
};


function TripListItem({ trip }: { trip: Trip }) {
    const statusInfo = statusMap[trip.status] || { text: trip.status, icon: CircleDollarSign, className: 'bg-gray-100 text-gray-800' };

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full p-3 border rounded-lg bg-card shadow-sm transition-shadow hover:shadow-md">
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4">
                <div className="col-span-2 sm:col-span-1 flex flex-col">
                    <span className="text-sm font-bold text-foreground flex items-center gap-1">
                        {getCityName(trip.origin)} <ArrowRight className="h-4 w-4 text-muted-foreground" /> {getCityName(trip.destination)}
                    </span>
                    <span className="text-xs text-muted-foreground">{trip.vehicleType}</span>
                </div>
                 <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{safeDateFormat(trip.departureDate)}</span>
                </div>
                 <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{trip.availableSeats} مقاعد</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold">
                    <CircleDollarSign className="h-4 w-4 text-green-500" />
                    <span>{trip.price} د.أ</span>
                </div>
            </div>
             <div className="flex items-center gap-4 mt-3 sm:mt-0 sm:mr-4">
                <Badge className={cn("py-1 px-3 text-xs", statusInfo.className)}>
                    <statusInfo.icon className="ml-1 h-3 w-3" />
                    {statusInfo.text}
                </Badge>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                             <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem>تعديل التفاصيل</DropdownMenuItem>
                        <DropdownMenuItem>عرض الحجوزات</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500">إلغاء الرحلة</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

export function MyTripsList() {
    const firestore = useFirestore();
    const { user } = useUser();

    const tripsQuery = useMemoFirebase(() => 
        firestore && user
        ? query(
            collection(firestore, 'trips'),
            where('carrierId', '==', user.uid),
            orderBy('departureDate', 'desc')
          )
        : null,
    [firestore, user]);

    const { data: trips, isLoading } = useCollection<Trip>(tripsQuery);

    if (isLoading) {
        return (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        );
    }

    if (!trips || trips.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed rounded-lg bg-card/50">
            <CalendarX className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-bold">لم تقم بإضافة أي رحلات مجدولة بعد</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              استخدم زر "إضافة رحلة جديدة" لنشر أول رحلاتك المتاحة للحجز.
            </p>
          </div>
        );
    }

    return (
        <div className="space-y-2">
            {trips.map((trip) => <TripListItem key={trip.id} trip={trip} />)}
        </div>
    );
}
