

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role?: 'traveler' | 'carrier';
};

export type CarrierProfile = {
  id: string;
  name: string;
  contactEmail: string;
  phoneNumber?: string;
  averageRating?: number;
}

export type Trip = {
  id: string;
  userId: string;
  carrierId?: string; // Optional until a carrier accepts
  carrierName?: string;
  carrierPhoneNumber?: string;
  origin: string;
  destination: string;
  departureDate: string; // ISO 8601 format: 'YYYY-MM-DDTHH:mm:ssZ'
  arrivalDate?: string;
  status: 'Planned' | 'In-Transit' | 'Completed' | 'Cancelled' | 'Awaiting-Offers';
  cargoDetails?: string;
  vehicleType?: string;
  vehicleCategory?: 'small' | 'bus';
  vehicleModelYear?: number;
  availableSeats?: number;
  passengers?: number;
  // New fields to track the booking process
  acceptedOfferId?: string | null;
  currentBookingId?: string | null;
};

export type Booking = {
    id: string;
    tripId: string;
    userId: string;
    carrierId: string;
    seats: number;
    status: 'Confirmed' | 'Pending-Payment' | 'Cancelled' | 'Completed' | 'Pending-Carrier-Confirmation';
    totalPrice: number;
};


export type Offer = {
    id: string;
    tripId: string;
    carrierId: string;
    price: number;
    notes?: string;
    status: 'Pending' | 'Accepted' | 'Rejected';
    createdAt: string; // ISO 8601 format
};

export type Notification = {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'new_offer' | 'booking_confirmed' | 'trip_update' | 'payment_reminder';
    isRead: boolean;
    createdAt: string; // ISO 8601 format
    link?: string;
};


export const userProfile: UserProfile = {
  id: 'user123',
  firstName: 'Fayz',
  lastName: 'Al-Harbi',
  email: 'fayz.alharbi@example.com',
};

// --- MOCK DATA FOR DEVELOPMENT ---

export const mockCarriers: CarrierProfile[] = [
    { id: 'carrier01', name: 'شركة النقل السريع', contactEmail: 'nq.saree3@email.com', averageRating: 4.8 },
    { id: 'carrier02', name: 'سفريات الأمان', contactEmail: 'alaman.travel@email.com', averageRating: 4.5 },
    { id: 'carrier03', name: 'الناقل الدولي', contactEmail: 'international.carrier@email.com', averageRating: 4.2 },
    { id: 'carrier04', name: 'الجبالي للنقل', contactEmail: 'jebali.transport@email.com', averageRating: 4.0 },
];

// Create a trip that is explicitly awaiting offers
const tripAwaitingOffers: Trip = {
    id: 'TRIP-AWAITING-001',
    userId: 'user123',
    origin: 'amman',
    destination: 'riyadh',
    departureDate: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString(),
    status: 'Awaiting-Offers',
    passengers: 2
};


export const tripHistory: Trip[] = [
  tripAwaitingOffers,
  {
    id: 'TRIP001',
    userId: 'user123',
    carrierName: 'شركة النقل السريع',
    carrierPhoneNumber: '+966501234567',
    origin: 'riyadh',
    destination: 'amman',
    departureDate: '2024-07-20T10:00:00Z',
    status: 'Planned',
    cargoDetails: 'Electronics',
    vehicleType: 'GMC Yukon',
    vehicleCategory: 'small',
    vehicleModelYear: 2023,
    availableSeats: 3,
  },
  {
    id: 'TRIP011',
    userId: 'user123',
    carrierName: 'سفريات الأمان',
    carrierPhoneNumber: '+966555555555',
    origin: 'jeddah',
    destination: 'amman',
    departureDate: '2024-07-20T14:00:00Z',
    status: 'Planned',
    cargoDetails: 'Personal Items',
    vehicleType: 'Hyundai Staria',
    vehicleCategory: 'small',
    vehicleModelYear: 2024,
    availableSeats: 7,
  },
  {
    id: 'TRIP002',
    userId: 'user123',
    carrierName: 'سفريات الأمان',
    carrierPhoneNumber: '+966555555555',
    origin: 'jeddah',
    destination: 'cairo',
    departureDate: '2024-07-22T18:30:00Z',
    status: 'Planned',
    cargoDetails: 'Textiles',
    vehicleType: 'Mercedes-Benz Sprinter',
    vehicleCategory: 'bus',
    vehicleModelYear: 2022,
    availableSeats: 8,
  },
    {
    id: 'TRIP012',
    userId: 'user123',
    carrierName: 'الناقل الدولي',
    carrierPhoneNumber: '+966588884444',
    origin: 'riyadh',
    destination: 'cairo',
    departureDate: '2024-07-22T20:00:00Z',
    status: 'Planned',
    cargoDetails: 'General Goods',
    vehicleType: 'Toyota Coaster',
    vehicleCategory: 'bus',
    vehicleModelYear: 2021,
    availableSeats: 15,
  },
  {
    id: 'TRIP003',
    userId: 'user123',
    carrierName: 'الناقل الدولي',
    carrierPhoneNumber: '+966588884444',
    origin: 'dammam',
    destination: 'dubai',
    departureDate: '2024-07-25T09:15:00Z',
    status: 'Planned',
    cargoDetails: 'Building Materials',
    vehicleType: 'Toyota HiAce',
    vehicleCategory: 'bus',
    vehicleModelYear: 2024,
    availableSeats: 5,
  },
    {
    id: 'TRIP004',
    userId: 'user123',
    carrierName: 'شركة النقل السريع',
    carrierPhoneNumber: '+966501234567',
    origin: 'riyadh',
    destination: 'dubai',
    departureDate: '2024-07-28T14:00:00Z',
    status: 'Planned',
    cargoDetails: 'Furniture',
    vehicleType: 'Hyundai Staria',
    vehicleCategory: 'small',
    vehicleModelYear: 2023,
    availableSeats: 6,
  },
  {
    id: 'TRIP005',
    userId: 'user123',
    carrierName: 'شركة النقل السريع',
    carrierPhoneNumber: '+966501234567',
    origin: 'riyadh',
    destination: 'amman',
    departureDate: '2024-08-01T11:00:00Z',
    status: 'Completed',
    cargoDetails: 'Personal Belongings',
    vehicleType: 'GMC Yukon',
    vehicleCategory: 'small',
    vehicleModelYear: 2023,
    availableSeats: 2,
  },
  {
    id: 'TRIP006',
    userId: 'user123',
    carrierName: 'شركة النقل السريع',
    carrierPhoneNumber: '+966501234567',
    origin: 'damascus',
    destination: 'amman',
    departureDate: '2024-08-02T15:00:00Z',
    status: 'Cancelled',
    cargoDetails: 'Documents',
    vehicleType: 'GMC Yukon',
    vehicleCategory: 'small',
    vehicleModelYear: 2023,
    availableSeats: 7,
  }
];

export const mockOffers: Offer[] = [
    {
        id: 'offer01',
        tripId: 'TRIP-AWAITING-001',
        carrierId: 'carrier01', // شركة النقل السريع
        price: 100,
        status: 'Pending',
        notes: 'يمكننا توفير مقاعد مريحة ووجبة خفيفة خلال الرحلة.',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'offer02',
        tripId: 'TRIP-AWAITING-001',
        carrierId: 'carrier02', // سفريات الأمان
        price: 95,
        status: 'Pending',
        notes: 'لدينا رحلات يومية، السعر قابل للتفاوض البسيط.',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'offer03',
        tripId: 'TRIP-AWAITING-001',
        carrierId: 'carrier03', // الناقل الدولي
        price: 110,
        status: 'Pending',
        notes: 'نضمن لك الوصول في الموعد المحدد.',
        createdAt: new Date().toISOString(),
    }
];
