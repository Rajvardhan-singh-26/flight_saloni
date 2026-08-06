import axios from 'axios';
import type { Aircraft, AIExtractionResult, QuoteFormValues } from '../types';

const api = axios.create({ baseURL: '/api' });

export interface Salesperson {
  token: string;
  name: string;
  email: string;
  role: string;
}

const SESSION_KEY = 'carewell.salesperson';

export async function login(email: string, password: string): Promise<Salesperson> {
  const { data } = await api.post<Salesperson>('/auth/login', { email, password });
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  return data;
}

export function getSession(): Salesperson | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Salesperson;
  } catch {
    return null;
  }
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function fetchAircraft(): Promise<Aircraft[]> {
  const { data } = await api.get<Aircraft[]>('/aircraft');
  return data;
}

export async function extractFromText(text: string): Promise<AIExtractionResult> {
  const { data } = await api.post<AIExtractionResult>('/ai/extract', { text });
  return data;
}

/** Maps camelCase form values into the backend's snake_case quote payload. */
export function toQuotePayload(values: QuoteFormValues, aircraftId: string | null) {
  return {
    customer: {
      customer_name: values.customerName,
      company: values.company,
      phone: values.phone,
      email: values.email,
    },
    flight: {
      departure_airport: values.departureAirport,
      arrival_airport: values.arrivalAirport,
      departure_date: values.departureDate || null,
      passengers: Number(values.passengers) || 1,
      aircraft_category: values.aircraftCategory,
      flight_hours: Number(values.flightHours) || 0,
    },
    charges: {
      hourly_rate: Number(values.hourlyRate) || 0,
      landing_charges: Number(values.landingCharges) || 0,
      handling_charges: Number(values.handlingCharges) || 0,
      fuel_charges: Number(values.fuelCharges) || 0,
      parking_charges: Number(values.parkingCharges) || 0,
      gst_percent: Number(values.gstPercent) || 0,
      discount: Number(values.discount) || 0,
    },
    aircraft_id: aircraftId,
    notes: values.notes,
  };
}

export async function generateQuotePdf(
  values: QuoteFormValues,
  aircraftId: string | null,
): Promise<{ blobUrl: string; quoteId: string }> {
  const response = await api.post('/quotes/pdf', { quote: toQuotePayload(values, aircraftId) }, { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  return {
    blobUrl: URL.createObjectURL(blob),
    quoteId: response.headers['x-quote-id'] ?? 'AV-QUOTE',
  };
}
