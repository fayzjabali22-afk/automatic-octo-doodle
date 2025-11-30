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
  status: 'Planned' | 'In-Transit' | 'Completed' | 'Cancelled';
  cargoDetails: string;
  vehicleType: string;
  vehicleModelYear: number;
  availableSeats: number;
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
    origin: 'Riyadh, SA',
    destination: 'Dubai, AE',
    departureDate: '2024-05-20T10:00:00Z',
    arrivalDate: '2024-05-21T12:00:00Z',
    status: 'Completed',
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
    origin: 'Jeddah, SA',
    destination: 'Cairo, EG',
    departureDate: '2024-05-22T18:30:00Z',
    status: 'In-Transit',
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
    origin: 'Dammam, SA',
    destination: 'Kuwait City, KW',
    departureDate: '2024-05-25T09:15:00Z',
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
    origin: 'Riyadh, SA',
    destination: 'Dubai, AE',
    departureDate: '2024-05-20T14:00:00Z',
    status: 'Planned',
    cargoDetails: 'Furniture',
    vehicleType: 'Hyundai Staria',
    vehicleModelYear: 2023,
    availableSeats: 6,
  },
];
