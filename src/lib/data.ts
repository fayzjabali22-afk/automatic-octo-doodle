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
  origin: string;
  destination: string;
  departureDate: string;
  arrivalDate?: string;
  status: 'Planned' | 'In-Transit' | 'Completed' | 'Cancelled';
  cargoDetails: string;
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
    origin: 'Riyadh, SA',
    destination: 'Dubai, AE',
    departureDate: '2024-05-20T10:00:00Z',
    arrivalDate: '2024-05-21T12:00:00Z',
    status: 'Completed',
    cargoDetails: 'Electronics',
  },
  {
    id: 'TRIP002',
    userId: 'user123',
    origin: 'Jeddah, SA',
    destination: 'Cairo, EG',
    departureDate: '2024-05-22T18:30:00Z',
    status: 'In-Transit',
    cargoDetails: 'Textiles',
  },
  {
    id: 'TRIP003',
    userId: 'user123',
    origin: 'Dammam, SA',
    destination: 'Kuwait City, KW',
    departureDate: '2024-05-25T09:15:00Z',
    status: 'Planned',
    cargoDetails: 'Building Materials',
  },
];
