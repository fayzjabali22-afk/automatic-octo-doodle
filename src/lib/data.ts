// src/lib/data.ts

export type BankDetails = {
  bankName: string;
  accountHolderName: string;
  iban: string;
};

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role?: 'traveler' | 'carrier' | 'admin';
  bankDetails?: BankDetails; 
  createdAt?: any;
  updatedAt?: any;
};

export type CarrierSpecialization = {
    from: string;
    to: string;
}

export type CarrierProfile = {
  id: string;
  name: string;
  contactEmail: string;
  phoneNumber?: string;
  averageRating?: number;
  photoURL?: string;
  vehicleCategory?: 'small' | 'bus';
  primaryRoute?: CarrierSpecialization;
  createdAt?: any;
  updatedAt?: any;
};

export type Trip = {
  id: string;
  userId: string;
  carrierId?: string;
  carrierName?: string;
  origin: string;
  destination: string;
  departureDate: string;
  arrivalDate?: string;
  status: 'Planned' | 'In-Transit' | 'Completed' | 'Cancelled' | 'Awaiting-Offers' | 'Pending-Carrier-Confirmation';
  cargoDetails?: string;
  passengers?: number;
  price?: number;
  availableSeats?: number;
  depositPercentage?: number;
  vehicleType?: string;
  vehicleCategory?: 'small' | 'bus';
  acceptedOfferId?: string | null;
  bookingIds?: string[];
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
  createdAt: string;
  vehicleType?: string;
  vehicleCategory?: 'small' | 'bus';
  vehicleModelYear?: number;
  availableSeats?: number;
  depositPercentage?: number;
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'new_offer' | 'booking_confirmed' | 'trip_update' | 'payment_reminder' | 'new_booking_request' | 'rating_request';
  isRead: boolean;
  createdAt: string;
  link?: string;
};

export type Chat = {
  id: string;
  tripId: string;
  participants: string[];
  lastMessage: string;
  updatedAt: string;
};

export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: string;
};
    
    