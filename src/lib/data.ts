'use client';
// src/lib/data.ts

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role?: 'traveler' | 'carrier' | 'admin';
  // Carrier-specific fields are now part of the main user profile
  // for simplicity in a single-document model.
  vehicleType?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleCapacity?: number;
  vehicleImageUrls?: string[]; // UPDATED: Array for vehicle images
  primaryRoute?: {
    origin: string;
    destination: string;
  };
  paymentInformation?: string; // Flexible text field for payment instructions
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
  vehicleType?: string;
  vehicleCategory?: 'small' | 'bus';
  vehicleCapacity?: number;
  vehicleImageUrls?: string[]; // UPDATED: Array for vehicle images
  primaryRoute?: CarrierSpecialization;
  paymentInformation?: string;
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
  estimatedDurationHours?: number;
  status: 'Planned' | 'In-Transit' | 'Completed' | 'Cancelled' | 'Awaiting-Offers' | 'Pending-Carrier-Confirmation';
  cargoDetails?: string;
  passengers?: number;
  price?: number;
  currency?: string;
  availableSeats?: number;
  depositPercentage?: number;
  acceptedOfferId?: string | null;
  bookingIds?: string[];
  createdAt?: any;
  updatedAt?: any;
  durationHours?: number; // Added field for trip duration
  conditions?: string; // Carrier's conditions for the trip
  vehicleType?: string; // Denormalized from CarrierProfile
  vehicleImageUrls?: string[]; // Denormalized for quick access
  meetingPoint?: string; // Precise meeting point address
  meetingPointLink?: string; // Optional Google Maps link for the meeting point
  vehicleCategory?: 'small' | 'bus';
  // Fields for trip requests
  requestType?: 'General' | 'Direct';
  targetCarrierId?: string;
  preferredVehicle?: 'any' | 'small' | 'bus';
  isShared?: boolean;
  targetPrice?: number;
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
  currency?: 'JOD' | 'SAR' | 'USD';
  createdAt?: any;
  updatedAt?: any;
  cancelledBy?: 'carrier' | 'traveler';
  cancellationReason?: string;
};

export type Offer = {
  id: string;
  tripId: string;
  carrierId: string;
  price: number;
  currency?: string;
  notes?: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  createdAt: string;
  vehicleType?: string;
  vehicleCategory?: 'small' | 'bus';
  vehicleModelYear?: number;
  availableSeats?: number;
  depositPercentage?: number;
  conditions?: string; // Carrier's conditions for the offer
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

export type Rating = {
    id: string;
    tripId: string;
    carrierId: string;
    userId: string;
    ratingValue: number;
    details: {
        vehicleQuality: number;
        vehicleCleanliness: number;
        driverCourtesy: number;
        drivingProfessionalism: number;
        specificationCredibility: number;
    };
    comment?: string;
    createdAt: string;
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
