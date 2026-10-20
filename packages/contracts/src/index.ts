export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  balanceCents: number;
  role: "driver" | "admin";
  createdAt: Date | string;
}
export interface Street {
  id: string;
  name: string;
  city: string;
  image: string;
  enabled: boolean;
}
export interface Zone {
  id: string;
  streetId: string;
  name: string;
  distance: number;
  hourlyRate: number;
  enabled: boolean;
  legacyId?: number;
}
export interface Spot {
  id: string;
  zoneId: string;
  name: string;
  distance: number;
  occupied: boolean;
  enabled: boolean;
  reservationId: string | null;
}
export interface Reservation {
  id: string;
  userId: string;
  spotId: string;
  zoneId: string;
  vehiclePlate: string;
  status: "active" | "completed" | "cancelled";
  createdAt: Date | string;
  endedAt?: Date | string;
  hourlyRate: number;
  hours: number;
  confirmed: boolean;
  expiresAt: Date | string;
  paidCents: number;
}
