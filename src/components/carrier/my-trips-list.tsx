'use client';
import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Trip } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarX, ArrowRight, Calendar, Users, CircleDollarSign, CheckCircle, Clock, XCircle, MoreVertical, Pencil, Ban, Ship, List, AlertTriangle, UsersRound } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '../ui/button';
import { EditTripDialog } from './edit-trip-dialog';
import { PassengersListDialog } from './passengers-list-dialog';
import { useToast } from '@/hooks/use-toast';


// --- MOCK DATA FOR SIMULATION ---
const mockActiveTrips: Trip[] = [
    {
        id: 'mock_planned_1',
        userId: 'carrier_user_id',
        carrierId: 'carrier_user_id',
        origin: 'amman',
        destination: 'riyadh',
        departureDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Planned',
        price: 80,
        currency: 'JOD',
        availableSeats: 3,
        vehicleType: 'GMC Yukon 2023',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        bookingIds: ['booking_A1', 'booking_A2'],
    },
    {
        id: 'mock_in_transit_1',
        userId: 'carrier_user_id',
        carrierId: 'carrier_user_id',
        origin: 'jeddah',
        destination: 'damascus',
        departureDate: new Date().toISOString(),
        status: 'In-Transit',
        price: 120,
        currency: 'SAR',
        availableSeats: 1,
        vehicleType: 'Toyota Coaster 2022',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        bookingIds: ['booking_B1'],
    },
     {
        id: 'mock_planned_2',
        userId: 'carrier_user_id',
        carrierId: 'carrier_user_id',
        origin: 'cairo',
        destination: 'amman',
        departureDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Planned',
        price: 95,
        currency: 'JOD',
        availableSeats: 4,
        vehicleType: 'Mercedes-Benz Sprinter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        bookingIds: [],
    }
];
// --- END MOCK DATA ---


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
  'In-Transit': { text: 'قيد التنفيذ', icon: Ship, className: 'bg-yellow-100 text-yellow-800' },
  'Completed': { text: 'مكتملة', icon: CheckCircle, className: 'bg-green-100 text-green-800' },
  'Cancelled': { text: 'ملغاة', icon: XCircle, className: 'bg-red-100 text-red-800' },
};

function TripListItem({ trip, onEdit, onManagePassengers, onInitiateTransfer }: { trip: Trip, onEdit: (trip: Trip) => void, onManagePassengers: (trip: Trip) => void, onInitiateTransfer: (trip: Trip) => void }) {
    const statusInfo = statusMap[trip.status] || { text: trip.status, icon: CircleDollarSign, className: 'bg-gray-100 text-gray-800' };
    const [formattedDate, setFormattedDate] = useState('');

    useEffect(() => {
        setFormattedDate(safeDateFormat(trip.departureDate));
    }, [trip.departureDate]);

    // A trip can be modified or its passengers transferred if it is 'Planned'.
    const isActionable = trip.status === 'Planned';

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full p-3 border-b md:border md:rounded-lg bg-card shadow-sm transition-shadow hover:shadow-md">
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4">
                <div className="col-span-2 sm:col-span-1 flex flex-col">
                    <span className="text-sm font-bold text-foreground flex items-center gap-1">
                        {getCityName(trip.origin)} <ArrowRight className="h-4 w-4 text-muted-foreground" /> {getCityName(trip.destination)}
                    </span>
                    <span className="text-xs text-muted-foreground">{trip.vehicleType}</span>
                </div>
                 <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{formattedDate || <Skeleton className="h-4 w-24" />}</span>
                </div>
                 <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{trip.availableSeats} مقاعد</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold">
                    <CircleDollarSign className="h-4 w-4 text-green-500" />
                    <span>{trip.price} {trip.currency}</span>
                </div>
            </div>
             <div className="flex items-center gap-4 mt-3 sm:mt-0 sm:ml-4 rtl:sm:mr-4">
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
                        <DropdownMenuItem onClick={() => onEdit(trip)} disabled={!isActionable}>
                            <Pencil className="ml-2 h-4 w-4" />
                            <span>تعديل تفاصيل الرحلة</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onManagePassengers(trip)} disabled={!isActionable}>
                            <List className="ml-2 h-4 w-4" />
                            <span>إدارة قائمة الركاب</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                            className="text-orange-500 focus:text-orange-600" 
                            onClick={() => onInitiateTransfer(trip)}
                            disabled={!isActionable || !trip.bookingIds || trip.bookingIds.length === 0}
                        >
                            <UsersRound className="ml-2 h-4 w-4" />
                            <span>طلب نقل الركاب لناقل آخر</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

export function MyTripsList() {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isPassengersDialogOpen, setIsPassengersDialogOpen] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

    const { toast } = useToast();
    const isLoading = false;
    const trips = mockActiveTrips;

    const sortedTrips = useMemo(() => {
        if (!trips) return [];
        return [...trips].sort((a, b) => new Date(b.departureDate).getTime() - new Date(a.departureDate).getTime());
    }, [trips]);
    
    const handleEditClick = (trip: Trip) => {
        setSelectedTrip(trip);
        setIsEditDialogOpen(true);
    };

    const handleInitiateTransferClick = (trip: Trip) => {
         toast({
            variant: 'default',
            title: 'قيد الإنشاء',
            description: 'سيتم بناء واجهة نقل الركاب لناقل آخر قريباً.',
        });
    }

    const handleManagePassengersClick = (trip: Trip) => {
        setSelectedTrip(trip);
        setIsPassengersDialogOpen(true);
    }

    if (isLoading) {
        return (
          <div className="space-y-3 p-2 md:p-0">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        );
    }

    if (!sortedTrips || sortedTrips.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed rounded-lg bg-card/50 mx-2 md:mx-0">
            <CalendarX className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-bold">لا توجد رحلات نشطة حالياً</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              استخدم زر "تأسيس رحلة جديدة" لنشر أولى رحلاتك المتاحة للحجز.
            </p>
          </div>
        );
    }

    return (
        <>
            <div className="space-y-2 md:space-y-3">
                {sortedTrips.map((trip) => (
                    <TripListItem 
                        key={trip.id} 
                        trip={trip} 
                        onEdit={handleEditClick}
                        onInitiateTransfer={handleInitiateTransferClick}
                        onManagePassengers={handleManagePassengersClick}
                    />
                ))}
            </div>
            <EditTripDialog
                isOpen={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                trip={selectedTrip}
            />
            <PassengersListDialog
                isOpen={isPassengersDialogOpen}
                onOpenChange={setIsPassengersDialogOpen}
                trip={selectedTrip}
            />
        </>
    );
}
