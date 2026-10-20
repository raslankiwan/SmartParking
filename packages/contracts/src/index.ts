export * from "./localization.js";
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  balanceCents: number;
  balances: Record<string, number>;
  balanceDigits: Record<string, number>;
  role: "driver" | "admin";
  createdAt: Date | string;
}
export interface Street {
  id: string;
  name: string;
  city: string;
  countryCode: string;
  currency: string;
  timeZone: string;
  latitude?: number;
  longitude?: number;
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
  currency: string;
  timeZone: string;
  streetName?: string;
  city?: string;
  countryCode?: string;
}
