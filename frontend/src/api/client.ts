import axios from 'axios';
import type { Aircraft, AIExtractionResult, Customer, GalleryImage, QuoteFormValues } from '../types';

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

export async function fetchAircraftById(id: string): Promise<Aircraft> {
  const { data } = await api.get<Aircraft>(`/aircraft/${id}`);
  return data;
}

export interface AircraftFieldsPayload {
  name?: string;
  manufacturer?: string;
  category?: string;
  hourly_rate?: number;
  max_passengers?: number;
  max_range_nm?: number;
  cruise_speed_kt?: number;
  description?: string;
  image?: string;
  gallery?: GalleryImage[];
}

export async function updateAircraft(id: string, payload: AircraftFieldsPayload): Promise<Aircraft> {
  const { data } = await api.patch<Aircraft>(`/aircraft/${id}`, payload);
  return data;
}

export async function createAircraft(payload: AircraftFieldsPayload & { name: string }): Promise<Aircraft> {
  const { data } = await api.post<Aircraft>('/aircraft', payload);
  return data;
}

export async function uploadAircraftImage(id: string, file: File): Promise<{ path: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<{ path: string }>(`/aircraft/${id}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/** Fired whenever an aircraft is created or edited, so any already-mounted
 * page showing fleet data (e.g. the quote page behind the details popup)
 * knows to refetch instead of showing stale data. */
export const AIRCRAFT_CHANGED_EVENT = 'carewell:aircraft-changed';

export function notifyAircraftChanged(): void {
  window.dispatchEvent(new Event(AIRCRAFT_CHANGED_EVENT));
}

export async function extractFromText(text: string): Promise<AIExtractionResult> {
  const { data } = await api.post<AIExtractionResult>('/ai/extract', { text });
  return data;
}

/** Maps camelCase form values into the backend's snake_case quote payload. */
export function toQuotePayload(values: QuoteFormValues, aircraftId: string | null, preparedBy?: string | null) {
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
      currency: values.currency || 'USD',
    },
    aircraft_id: aircraftId,
    notes: values.notes,
    terms: values.termsAndConditions,
    prepared_by: preparedBy || null,
  };
}

export async function generateQuotePdf(
  values: QuoteFormValues,
  aircraftId: string | null,
  preparedBy?: string | null,
): Promise<{ blobUrl: string; quoteId: string }> {
  const response = await api.post('/quotes/pdf', { quote: toQuotePayload(values, aircraftId, preparedBy) }, { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  return {
    blobUrl: URL.createObjectURL(blob),
    quoteId: response.headers['x-quote-id'] ?? 'AV-QUOTE',
  };
}

export async function fetchCustomers(): Promise<Customer[]> {
  const { data } = await api.get<Customer[]>('/customers');
  return data;
}

export interface CustomerFieldsPayload {
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  status?: string;
  quote_count?: number;
  total_value?: number;
  currency?: string;
  last_quote_date?: string;
}

export async function updateCustomer(id: string, payload: CustomerFieldsPayload): Promise<Customer> {
  const { data } = await api.patch<Customer>(`/customers/${id}`, payload);
  return data;
}

export async function deleteCustomer(id: string): Promise<void> {
  await api.delete(`/customers/${id}`);
}

/** Adds a customer by hand from the Customers page (no quote behind it). */
export async function createCustomer(payload: {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  status?: string;
}): Promise<Customer> {
  const { data } = await api.post<Customer>('/customers', payload);
  return data;
}

/** Opt-in save of the customer behind a just-generated quote. */
export async function addCustomerFromQuote(
  values: QuoteFormValues,
  totalValue: number,
): Promise<Customer> {
  const { data } = await api.post<Customer>('/customers/from-quote', {
    customer: {
      customer_name: values.customerName,
      company: values.company,
      phone: values.phone,
      email: values.email,
    },
    total_value: totalValue,
    currency: values.currency || 'USD',
  });
  return data;
}
