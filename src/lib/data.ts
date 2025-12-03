

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role?: 'traveler' | 'carrier' | 'admin';
  createdAt?: any;
  updatedAt?: any;
};

export type CarrierProfile = {
  id: string;
  name: string;
  contactEmail: string;
  phoneNumber?: string;
  averageRating?: number;
  createdAt?: any;
  updatedAt?: any;
}

export type Trip = {
  id: string;
  userId: string;
  carrierId?: string; // Optional until a carrier accepts
  carrierName?: string;
  origin: string;
  destination: string;
  departureDate: string; // ISO 8601 format: 'YYYY-MM-DDTHH:mm:ssZ'
  arrivalDate?: string;
  status: 'Planned' | 'In-Transit' | 'Completed' | 'Cancelled' | 'Awaiting-Offers' | 'Pending-Carrier-Confirmation';
  cargoDetails?: string;
  passengers?: number;
  // Fields for scheduled trips
  price?: number;
  availableSeats?: number;
  depositPercentage?: number;
  vehicleType?: string;
  vehicleCategory?: 'small' | 'bus';
  // New fields to track the booking process
  acceptedOfferId?: string | null;
  bookingIds?: string[]; // Changed from currentBookingId
  createdAt?: any;
  updatedAt?: any;
};

export type Booking = {
    id: string;
    tripId: string;
    userId: string;
    carrierId: string;
    seats: number;
    passengersDetails: { name: string; type: 'adult' | 'child' }[];
    status: 'Confirmed' | 'Pending-Payment' | 'Cancelled' | 'Completed' | 'Pending-Carrier-Confirmation';
    totalPrice: number;
    createdAt?: any;
    updatedAt?: any;
};


export type Offer = {
    id: string;
    tripId: string;
    carrierId: string;
    price: number;
    notes?: string;
    status: 'Pending' | 'Accepted' | 'Rejected';
    createdAt: string; // ISO 8601 format
    // Vehicle details provided in the offer
    vehicleType?: string;
    vehicleCategory?: 'small' | 'bus';
    vehicleModelYear?: number;
    availableSeats?: number;
    // New deposit field
    depositPercentage?: number;
};

export type Notification = {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'new_offer' | 'booking_confirmed' | 'trip_update' | 'payment_reminder' | 'new_booking_request' | 'rating_request';
    isRead: boolean;
    createdAt: string; // ISO 8601 format
    link?: string;
};

export type Chat = {
  id: string;
  tripId: string;
  participants: string[];
  lastMessage: string;
  updatedAt: string; // ISO 8601 format
};

export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: string; // ISO 8601 format
};


export const userProfile: UserProfile = {
  id: 'user123',
  firstName: 'Fayz',
  lastName: 'Al-Harbi',
  email: 'fayz.alharbi@example.com',
  role: 'traveler',
};

// --- MOCK DATA FOR DEVELOPMENT ---

export const mockCarriers: CarrierProfile[] = [
    { id: 'carrier01', name: 'شركة النقل السريع', contactEmail: 'nq.saree3@email.com', averageRating: 4.8 },
    { id: 'carrier02', name: 'سفريات الأمان', contactEmail: 'alaman.travel@email.com', averageRating: 4.5 },
    { id: 'carrier03', name: 'الناقل الدولي', contactEmail: 'international.carrier@email.com', averageRating: 4.2 },
    { id: 'carrier04', name: 'الجبالي للنقل', contactEmail: 'jebali.transport@email.com', averageRating: 4.0 },
];

export const scheduledTrips: Trip[] = [
    {
        id: 'TRIP-SCHEDULED-001',
        userId: 'user123',
        carrierId: 'carrier01',
        carrierName: 'شركة النقل السريع',
        origin: 'riyadh',
        destination: 'amman',
        departureDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        status: 'Planned',
        price: 120,
        availableSeats: 3,
        depositPercentage: 25,
        vehicleType: 'GMC Yukon 2023',
        vehicleCategory: 'small',
    },
    {
        id: 'TRIP-SCHEDULED-002',
        userId: 'user456',
        carrierId: 'carrier02',
        carrierName: 'سفريات الأمان',
        origin: 'cairo',
        destination: 'jeddah',
        departureDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        status: 'Planned',
        price: 250,
        availableSeats: 5,
        depositPercentage: 20,
        vehicleType: 'Mercedes Sprinter 2022',
        vehicleCategory: 'bus',
    },
     {
        id: 'TRIP-SCHEDULED-003',
        userId: 'user789',
        carrierId: 'carrier03',
        carrierName: 'الناقل الدولي',
        origin: 'damascus',
        destination: 'amman',
        departureDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        status: 'Planned',
        price: 80,
        availableSeats: 6,
        depositPercentage: 30,
        vehicleType: 'Hyundai Staria 2024',
        vehicleCategory: 'small',
    },
];

export const tripHistory: Trip[] = scheduledTrips;

export const mockOffers: Offer[] = [
    {
        id: 'offer01',
        tripId: 'TRIP-AWAITING-001',
        carrierId: 'carrier01', // شركة النقل السريع
        price: 100,
        status: 'Pending',
        notes: 'يمكننا توفير مقاعد مريحة ووجبة خفيفة خلال الرحلة.',
        createdAt: new Date().toISOString(),
        vehicleType: 'GMC Yukon',
        vehicleCategory: 'small',
        vehicleModelYear: 2023,
        availableSeats: 7,
        depositPercentage: 20,
    },
    {
        id: 'offer02',
        tripId: 'TRIP-AWAITING-001',
        carrierId: 'carrier02', // سفريات الأمان
        price: 95,
        status: 'Pending',
        notes: 'لدينا رحلات يومية، السعر قابل للتفاوض البسيط.',
        createdAt: new Date().toISOString(),
        vehicleType: 'Hyundai Staria',
        vehicleCategory: 'small',
        vehicleModelYear: 2024,
        availableSeats: 8,
        depositPercentage: 15,
    },
    {
        id: 'offer03',
        tripId: 'TRIP-AWAITING-001',
        carrierId: 'carrier03', // الناقل الدولي
        price: 110,
        status: 'Pending',
        notes: 'نضمن لك الوصول في الموعد المحدد.',
        createdAt: new Date().toISOString(),
        vehicleType: 'Mercedes-Benz Sprinter',
        vehicleCategory: 'bus',
        vehicleModelYear: 2022,
        availableSeats: 12,
        depositPercentage: 25,
    }
];
