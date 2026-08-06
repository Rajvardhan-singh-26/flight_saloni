/** Shared domain types mirroring the backend Pydantic models. */

export interface Aircraft {
  id: string;
  name: string;
  manufacturer: string;
  category: string;
  hourly_rate: number;
  max_passengers: number;
  max_range_nm: number;
  cruise_speed_kt: number;
  image: string;
  accent: string;
  description: string;
}

export interface QuoteFormValues {
  customerName: string;
  company: string;
  phone: string;
  email: string;
  departureAirport: string;
  arrivalAirport: string;
  departureDate: string;
  passengers: number;
  aircraftCategory: string;
  flightHours: number;
  hourlyRate: number;
  landingCharges: number;
  handlingCharges: number;
  fuelCharges: number;
  parkingCharges: number;
  gstPercent: number;
  discount: number;
  currency: string;
  notes: string;
}

export interface PricingBreakdown {
  flightCost: number;
  landingCharges: number;
  handlingCharges: number;
  fuelCharges: number;
  parkingCharges: number;
  subtotal: number;
  gstAmount: number;
  discount: number;
  grandTotal: number;
}

export interface AIExtractionResult {
  customer_name: string | null;
  departure_airport: string | null;
  arrival_airport: string | null;
  departure_date: string | null;
  passengers: number | null;
  aircraft_category: string | null;
  flight_hours: number | null;
  raw_notes: string | null;
}

export const AIRCRAFT_CATEGORIES = [
  'Light Jet',
  'Turboprop',
  'Midsize Jet',
  'Super Midsize Jet',
  'Heavy Jet',
  'Ultra Long Range',
] as const;

export const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar' },
] as const;

export const DEFAULT_FORM_VALUES: QuoteFormValues = {
  customerName: '',
  company: '',
  phone: '',
  email: '',
  departureAirport: '',
  arrivalAirport: '',
  departureDate: '',
  passengers: 1,
  aircraftCategory: '',
  flightHours: 2.5,
  hourlyRate: 0,
  landingCharges: 850,
  handlingCharges: 920,
  fuelCharges: 450,
  parkingCharges: 350,
  gstPercent: 18,
  discount: 0,
  currency: 'USD',
  notes: '',
};
