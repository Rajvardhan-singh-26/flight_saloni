import { useMemo } from 'react';
import { CURRENCIES } from '../types';
import type { PricingBreakdown, QuoteFormValues } from '../types';

/**
 * Client-side mirror of the backend pricing engine so the live preview
 * updates instantly on every keystroke without a network round-trip.
 */
export function usePricing(values: QuoteFormValues): PricingBreakdown {
  return useMemo(() => {
    const flightCost = (Number(values.flightHours) || 0) * (Number(values.hourlyRate) || 0);
    const landing = Number(values.landingCharges) || 0;
    const handling = Number(values.handlingCharges) || 0;
    const fuel = Number(values.fuelCharges) || 0;
    const parking = Number(values.parkingCharges) || 0;
    const discount = Number(values.discount) || 0;
    const gstPercent = Number(values.gstPercent) || 0;

    const subtotal = flightCost + landing + handling + fuel + parking;
    const discounted = Math.max(subtotal - discount, 0);
    const gstAmount = (discounted * gstPercent) / 100;
    const grandTotal = discounted + gstAmount;

    return {
      flightCost,
      landingCharges: landing,
      handlingCharges: handling,
      fuelCharges: fuel,
      parkingCharges: parking,
      subtotal,
      gstAmount,
      discount,
      grandTotal,
    };
  }, [values]);
}

export const CURRENCY_SYMBOLS: Record<string, string> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c.symbol]),
);

export const formatMoney = (v: number, currency: string = 'USD') => {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${symbol}${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};
