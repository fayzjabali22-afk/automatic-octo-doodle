export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
};

export type Trip = {
  id: string;
  userId: string;
  carrierName: string;
  carrierPhoneNumber: string;
  origin: string;
  destination: string;
  departureDate: string; // ISO 8601 format: 'YYYY-MM-DDTHH:mm:ssZ'
  arrivalDate?: string;
  status: 'Planned' | 'In-Transit' | 'Completed' | 'Cancelled' | 'Awaiting-Offers';
  cargoDetails: string;
  vehicleType: string;
  vehicleModelYear: number;
  availableSeats: number;
  passengers?: number;
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

export const tripHistory: Trip[] = [
  {
    id: 'TRIP001',
    userId: 'user123',
    carrierName: 'شركة النقل السريع',
    carrierPhoneNumber: '+966 50 123 4567',
    origin: 'riyadh',
    destination: 'amman',
    departureDate: '2024-07-20T10:00:00Z',
    status: 'Planned',
    cargoDetails: 'Electronics',
    vehicleType: 'GMC Yukon',
    vehicleModelYear: 2023,
    availableSeats: 3,
  },
  {
    id: 'TRIP002',
    userId: 'user123',
    carrierName: 'سفريات الأمان',
    carrierPhoneNumber: '+966 55 555 5555',
    origin: 'jeddah',
    destination: 'cairo',
    departureDate: '2024-07-22T18:30:00Z',
    status: 'Planned',
    cargoDetails: 'Textiles',
    vehicleType: 'Mercedes-Benz Sprinter',
    vehicleModelYear: 2022,
    availableSeats: 8,
  },
  {
    id: 'TRIP003',
    userId: 'user123',
    carrierName: 'الناقل الدولي',
    carrierPhoneNumber: '+966 58 888 4444',
    origin: 'dammam',
    destination: 'dubai',
    departureDate: '2024-07-25T09:15:00Z',
    status: 'Planned',
    cargoDetails: 'Building Materials',
    vehicleType: 'Toyota HiAce',
    vehicleModelYear: 2024,
    availableSeats: 5,
  },
    {
    id: 'TRIP004',
    userId: 'user123',
    carrierName: 'شركة النقل السريع',
    carrierPhoneNumber: '+966 50 123 4567',
    origin: 'riyadh',
    destination: 'dubai',
    departureDate: '2024-07-28T14:00:00Z',
    status: 'Planned',
    cargoDetails: 'Furniture',
    vehicleType: 'Hyundai Staria',
    vehicleModelYear: 2023,
    availableSeats: 6,
  },
  {
    id: 'TRIP005',
    userId: 'user123',
    carrierName: 'شركة النقل السريع',
    carrierPhoneNumber: '+966 50 123 4567',
    origin: 'riyadh',
    destination: 'amman',
    departureDate: '2024-08-01T11:00:00Z',
    status: 'Planned',
    cargoDetails: 'Personal Belongings',
    vehicleType: 'GMC Yukon',
    vehicleModelYear: 2023,
    availableSeats: 2,
  },
  {
    id: 'TRIP006',
    userId: 'user123',
    carrierName: 'شركة النقل السريع',
    carrierPhoneNumber: '+966 50 123 4567',
    origin: 'damascus',
    destination: 'amman',
    departureDate: '2024-08-02T15:00:00Z',
    status: 'Planned',
    cargoDetails: 'Documents',
    vehicleType: 'GMC Yukon',
    vehicleModelYear: 2023,
    availableSeats: 7,
  },
  {
    id: 'TRIP007',
    userId: 'user123',
    carrierName: 'سفريات الأمان',
    carrierPhoneNumber: '+966 55 555 5555',
    origin: 'cairo',
    destination: 'riyadh',
    departureDate: '2024-08-05T08:00:00Z',
    status: 'Planned',
    cargoDetails: 'General Goods',
    vehicleType: 'Mercedes-Benz Sprinter',
    vehicleModelYear: 2022,
    availableSeats: 1,
  },
  {
    id: 'TRIP008',
    userId: 'user123',
    carrierName: 'سفريات الأمان',
    carrierPhoneNumber: '+966 55 555 5555',
    origin: 'amman',
    destination: 'riyadh',
    departureDate: '2024-08-10T20:00:00Z',
    status: 'Planned',
    cargoDetails: 'Luggage',
    vehicleType: 'Mercedes-Benz Sprinter',
    vehicleModelYear: 2022,
    availableSeats: 10,
  },
];
