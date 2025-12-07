'use client';
import { useState, useMemo, useEffect, Fragment } from 'react';
import { useFirestore, useCollection, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc, writeBatch, serverTimestamp, getDocs, updateDoc } from 'firebase/firestore';
import { Trip, Chat, Booking } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarX, ArrowRight, Calendar, Users, CircleDollarSign, CheckCircle, Clock, XCircle, MoreVertical, Pencil, Ban, Ship, List, AlertTriangle, UsersRound, PlayCircle, StopCircle, MessageSquare, Flag } from 'lucide-react';
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
import { EditTripDialog, EditTripFormValues } from './edit-trip-dialog';
import { PassengersListDialog } from './passengers-list-dialog';
import { useToast } from '@/hooks/use-toast';
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
import Link from 'next/link';
import { BookingActionCard } from './booking-action-card';
import { Separator } from '../ui/separator';
import { TripCompletionDialog } from './trip-completion-dialog';
import { TransferRequestDialog } from './transfer-request-dialog';


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

function TripListItem({ trip, pendingBookings, onEdit, onManagePassengers, onInitiateTransfer, onUpdateStatus, unreadCount, onCompleteTrip }: { trip: Trip, pendingBookings?: Booking[], onEdit: (trip: Trip) => void, onManagePassengers: (trip: Trip) => void, onInitiateTransfer: (trip: Trip) => void, onUpdateStatus: (trip: Trip, newStatus: Trip['status']) => void, unreadCount: number, onCompleteTrip: (trip: Trip) => void }) {
    const statusInfo = statusMap[trip.status] || { text: trip.status, icon: CircleDollarSign, className: 'bg-gray-100 text-gray-800' };
    const [formattedDate, setFormattedDate] = useState('');

    useEffect(() => {
        setFormattedDate(safeDateFormat(trip.departureDate));
    }, [trip.departureDate]);
    
    const isPlanned = trip.status === 'Planned';
    const isInTransit = trip.status === 'In-Transit';

    return (
        <div className="w-full border md:rounded-lg bg-card shadow-sm transition-shadow hover:shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3">
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
                <div className="flex items-center gap-2 mt-3 sm:mt-0 sm:ml-4 rtl:sm:mr-4">
                    <Badge className={cn("py-1 px-3 text-xs", statusInfo.className)}>
                        <statusInfo.icon className="ml-1 h-3 w-3" />
                        {statusInfo.text}
                    </Badge>
                     <Button asChild variant="outline" size="icon" className="h-8 w-8 relative">
                       <Link href={`/carrier/trips/${trip.id}`}>
                            <MessageSquare className="h-4 w-4" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                    {unreadCount}
                                </span>
                            )}
                       </Link>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                 <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                             <DropdownMenuItem onClick={() => onUpdateStatus(trip, 'In-Transit')} disabled={!isPlanned}>
                                <PlayCircle className="ml-2 h-4 w-4 text-green-500" />
                                <span>بدء الرحلة</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onCompleteTrip(trip)} disabled={!isInTransit} className="font-bold text-primary">
                                <Flag className="ml-2 h-4 w-4" />
                                <span>الوصول وإنهاء الرحلة</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onEdit(trip)} disabled>
                                <Pencil className="ml-2 h-4 w-4" />
                                <span>تعديل تفاصيل الرحلة (معطل مؤقتاً)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onManagePassengers(trip)}>
                                <List className="ml-2 h-4 w-4" />
                                <span>إدارة قائمة الركاب</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                className="text-orange-500 focus:text-orange-600" 
                                onClick={() => onInitiateTransfer(trip)}
                                disabled={!isPlanned || !trip.bookingIds || trip.bookingIds.length === 0}
                            >
                                <UsersRound className="ml-2 h-4 w-4" />
                                <span>طلب نقل الركاب لناقل آخر</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                className="text-red-500 focus:text-red-600"
                                onClick={() => onUpdateStatus(trip, 'Cancelled')}
                                disabled={!isPlanned}
                            >
                                <Ban className="ml-2 h-4 w-4" />
                                <span>إلغاء الرحلة (اضطراري)</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {pendingBookings && pendingBookings.length > 0 && (
                <div className="p-3 bg-primary/5">
                    <h4 className="text-sm font-bold mb-2 text-primary">طلبات حجز جديدة لهذه الرحلة ({pendingBookings.length})</h4>
                    <div className="space-y-3">
                        {pendingBookings.map(booking => (
                            <BookingActionCard key={booking.id} booking={booking} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

interface MyTripsListProps {
    trips: Trip[];
    pendingBookingsMap: Map<string, Booking[]>;
}

export function MyTripsList({ trips, pendingBookingsMap }: MyTripsListProps) {
    const firestore = useFirestore();
    const { user } = useUser();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isPassengersDialogOpen, setIsPassengersDialogOpen] = useState(false);
    const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
    const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [tripToUpdate, setTripToUpdate] = useState<{trip: Trip, newStatus: Trip['status']} | null>(null);
    const { toast } = useToast();

    const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
    const [selectedTripForCompletion, setSelectedTripForCompletion] = useState<Trip | null>(null);

    const chatIds = useMemo(() => trips?.map(t => t.id) || [], [trips]);
    const chatsQuery = useMemo(() => {
        if (!firestore || chatIds.length === 0) return null;
        return query(collection(firestore, 'chats'), where('id', 'in', chatIds));
    }, [firestore, chatIds]);
    const { data: chats } = useCollection<Chat>(chatsQuery);

    const unreadCounts = useMemo(() => {
        const counts: { [tripId: string]: number } = {};
        if (chats && user) {
            chats.forEach(chat => {
                if (chat.unreadCounts && chat.unreadCounts[user.uid]) {
                    counts[chat.id] = chat.unreadCounts[user.uid];
                }
            });
        }
        return counts;
    }, [chats, user]);
    
    const sortedTrips = useMemo(() => {
        if (!trips) return [];
        // Sort trips to show those with pending bookings first, then by date.
        return [...trips].sort((a, b) => {
            const aHasPending = pendingBookingsMap.has(a.id);
            const bHasPending = pendingBookingsMap.has(b.id);
            if (aHasPending && !bHasPending) return -1;
            if (!aHasPending && bHasPending) return 1;
            return new Date(b.departureDate).getTime() - new Date(a.departureDate).getTime();
        });
    }, [trips, pendingBookingsMap]);
    
    const handleEditClick = (trip: Trip) => {
        setSelectedTrip(trip);
        setIsEditDialogOpen(true);
    };

    const handleConfirmEdit = async (trip: Trip, data: EditTripFormValues) => {
        if (!firestore) return;
    
        const tripRef = doc(firestore, 'trips', trip.id);
        const bookingsQuery = query(collection(firestore, 'bookings'), where('tripId', '==', trip.id), where('status', '==', 'Confirmed'));
    
        try {
            const batch = writeBatch(firestore);
    
            // 1. Update the trip document
            batch.update(tripRef, { 
                price: data.price,
                availableSeats: data.availableSeats,
                departureDate: data.departureDate.toISOString(),
                updatedAt: serverTimestamp()
            });
    
            // 2. Fetch all confirmed bookings for this trip
            const bookingsSnapshot = await getDocs(bookingsQuery);
    
            // 3. Create a notification for each booked user
            bookingsSnapshot.forEach(bookingDoc => {
                const booking = bookingDoc.data() as Booking;
                const notificationRef = doc(collection(firestore, 'notifications'));
                batch.set(notificationRef, {
                    userId: booking.userId,
                    title: 'تحديث هام بخصوص رحلتك',
                    message: `قام الناقل بتعديل تفاصيل رحلتك من ${getCityName(trip.origin)} إلى ${getCityName(trip.destination)}. الرجاء مراجعة التفاصيل المحدثة.`,
                    type: 'trip_update',
                    isRead: false,
                    link: `/history`,
                    createdAt: serverTimestamp(),
                });
            });
    
            // 4. Commit all changes at once
            await batch.commit();
    
            toast({
                title: 'تم تحديث الرحلة بنجاح',
                description: 'تم إعلام جميع المسافرين المؤكدين بالتغييرات الجديدة.',
            });
            setIsEditDialogOpen(false);
    
        } catch (error) {
            console.error("Failed to update trip and notify users:", error);
            toast({
                variant: 'destructive',
                title: 'فشل تحديث الرحلة',
                description: 'حدث خطأ أثناء حفظ التغييرات وإرسال الإشعارات.',
            });
            throw error; // Re-throw to prevent dialog from closing
        }
    };

    const handleInitiateTransferClick = (trip: Trip) => {
        setSelectedTrip(trip);
        setIsTransferDialogOpen(true);
    }

    const handleManagePassengersClick = (trip: Trip) => {
        setSelectedTrip(trip);
        setIsPassengersDialogOpen(true);
    }
    
    const handleUpdateStatus = (trip: Trip, newStatus: Trip['status']) => {
        setTripToUpdate({ trip, newStatus });
        if (newStatus === 'Cancelled') {
            setIsCancelConfirmOpen(true);
        } else {
            confirmUpdateStatus();
        }
    };
    
    const handleOpenCompletionDialog = (trip: Trip) => {
        setSelectedTripForCompletion(trip);
        setIsCompletionDialogOpen(true);
    };

    const handleConfirmCompletion = async (trip: Trip, returnDate: Date | null) => {
        if (!firestore || !user) return;
        
        const batch = writeBatch(firestore);
        
        // 1. Mark current trip as Completed
        const currentTripRef = doc(firestore, 'trips', trip.id);
        batch.update(currentTripRef, { status: 'Completed', updatedAt: serverTimestamp() });

        // 2. Close the chat for the trip
        const chatRef = doc(firestore, 'chats', trip.id);
        batch.update(chatRef, { isClosed: true });

        // 3. If a return date is set, create a new return trip
        if (returnDate) {
            const newTripRef = doc(collection(firestore, 'trips'));
            const returnTripData: Partial<Trip> = {
                ...trip,
                origin: trip.destination,
                destination: trip.origin,
                departureDate: returnDate.toISOString(),
                status: 'Planned',
                bookingIds: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            delete returnTripData.id;
            batch.set(newTripRef, returnTripData);
        }

        // 4. Fetch confirmed bookings to send notifications
        const bookingsQuery = query(
            collection(firestore, 'bookings'),
            where('tripId', '==', trip.id),
            where('status', '==', 'Confirmed')
        );

        try {
            const bookingsSnapshot = await getDocs(bookingsQuery);
            bookingsSnapshot.forEach(bookingDoc => {
                const booking = bookingDoc.data() as Booking;
                const notificationRef = doc(collection(firestore, 'notifications'));
                batch.set(notificationRef, {
                    userId: booking.userId,
                    title: `اكتملت رحلتك! نرجو تقييم تجربتك.`,
                    message: `لقد وصلت رحلتك من ${getCityName(trip.origin)} إلى ${getCityName(trip.destination)}. تقييمك يساعدنا على تحسين الخدمة.`,
                    type: 'rating_request',
                    isRead: false,
                    link: `/history`,
                    createdAt: serverTimestamp(),
                });
            });
            
            // Commit all batched writes
            await batch.commit();

            toast({
                title: 'تم إنهاء الرحلة بنجاح!',
                description: returnDate ? 'تمت جدولة رحلة العودة وإرسال طلبات التقييم.' : 'تم إرسال طلبات التقييم للمسافرين.',
            });

        } catch (error) {
            console.error("Failed to complete trip and send notifications:", error);
            toast({
                variant: 'destructive',
                title: 'فشل إنهاء الرحلة',
                description: 'حدث خطأ أثناء تحديث البيانات.'
            });
        }
    };


    const confirmUpdateStatus = async () => {
        const trip = tripToUpdate?.trip;
        const newStatus = tripToUpdate?.newStatus;

        if (!firestore || !trip || !newStatus) return;

        const tripRef = doc(firestore, 'trips', trip.id);
        
        try {
            const batch = writeBatch(firestore);
            batch.update(tripRef, { status: newStatus });
            
            // If cancelling, notify passengers
            if (newStatus === 'Cancelled' && trip.bookingIds) {
                 const bookingsQuery = query(collection(firestore, 'bookings'), where('tripId', '==', trip.id));
                 const bookingsSnapshot = await getDocs(bookingsQuery);
                 bookingsSnapshot.forEach(bookingDoc => {
                    const booking = bookingDoc.data() as Booking;
                    const notificationRef = doc(collection(firestore, 'notifications'));
                    batch.set(notificationRef, {
                        userId: booking.userId,
                        title: 'إلغاء رحلة محجوزة',
                        message: `نعتذر، لقد قام الناقل بإلغاء رحلتك من ${getCityName(trip.origin)} إلى ${getCityName(trip.destination)}.`,
                        type: 'trip_update',
                        isRead: false,
                        link: '/history',
                        createdAt: serverTimestamp(),
                    });
                    batch.update(bookingDoc.ref, { status: 'Cancelled', cancelledBy: 'carrier' });
                 });
            }

            await batch.commit();
        
            let toastTitle = '';
            if (newStatus === 'In-Transit') toastTitle = 'تم بدء الرحلة بنجاح!';
            else if (newStatus === 'Cancelled') toastTitle = 'تم إلغاء الرحلة بنجاح.';

            toast({ title: toastTitle });
        } catch (error) {
            toast({ title: 'فشل تحديث الحالة', variant: 'destructive' });
        }

        setIsCancelConfirmOpen(false);
        setTripToUpdate(null);
    };

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
            <div className="space-y-3">
                {sortedTrips.map((trip) => (
                    <TripListItem 
                        key={trip.id} 
                        trip={trip} 
                        pendingBookings={pendingBookingsMap.get(trip.id)}
                        onEdit={handleEditClick}
                        onInitiateTransfer={handleInitiateTransferClick}
                        onManagePassengers={handleManagePassengersClick}
                        onUpdateStatus={handleUpdateStatus}
                        unreadCount={unreadCounts[trip.id] || 0}
                        onCompleteTrip={handleOpenCompletionDialog}
                    />
                ))}
            </div>
            <EditTripDialog
                isOpen={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                trip={selectedTrip}
                onConfirm={handleConfirmEdit}
            />
            <PassengersListDialog
                isOpen={isPassengersDialogOpen}
                onOpenChange={setIsPassengersDialogOpen}
                trip={selectedTrip}
            />
            <TripCompletionDialog
                isOpen={isCompletionDialogOpen}
                onOpenChange={setIsCompletionDialogOpen}
                trip={selectedTripForCompletion}
                onConfirm={handleConfirmCompletion}
            />
            <TransferRequestDialog
                isOpen={isTransferDialogOpen}
                onOpenChange={setIsTransferDialogOpen}
                trip={selectedTrip}
            />
             <AlertDialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
                <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                           <AlertTriangle className="h-6 w-6 text-destructive" />
                           تأكيد الإلغاء الاضطراري
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            إلغاء الرحلة سيؤدي لإلغاء جميع الحجوزات المرتبطة بها وإرسال إشعارات للمسافرين. هذا الإجراء نهائي ولا يمكن التراجع عنه. هل أنت متأكد؟
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0 pt-4">
                        <AlertDialogCancel onClick={() => setTripToUpdate(null)}>تراجع</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmUpdateStatus} className="bg-destructive hover:bg-destructive/90">
                           نعم، قم بالإلغاء
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
