import { Box, Typography } from '@mui/material';
import type { Aircraft, PricingBreakdown, QuoteFormValues } from '../types';
import { formatMoney } from '../hooks/usePricing';
import { GOLD, NAVY_DEEP, SERIF } from '../theme';

interface Props {
  values: QuoteFormValues;
  aircraft: Aircraft | null;
  pricing: PricingBreakdown;
  preparedBy?: string;
  quoteRef: string;
}

const dash = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === '' ? '—' : String(v);

/** The quotation sheet — mirrors the generated PDF and the design's preview panel. */
export default function QuotePreview({ values, aircraft, pricing, preparedBy, quoteRef }: Props) {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const hasCustomer = values.customerName || values.company || values.phone || values.email;

  const currency = values.currency || 'USD';
  const money = (v: number) => formatMoney(v, currency);

  const rows: Array<{ desc: string; detail: string; amount: string }> = [
    { desc: 'Charter Flight Cost', detail: `${values.flightHours || 0} hrs × ${money(Number(values.hourlyRate) || 0)}/hr`, amount: money(pricing.flightCost) },
    { desc: 'Landing Charges', detail: 'Per sector', amount: money(pricing.landingCharges) },
    { desc: 'Handling Charges', detail: 'Ground services', amount: money(pricing.handlingCharges) },
    { desc: 'Fuel Surcharge', detail: `${values.flightHours || 0} hrs`, amount: money(pricing.fuelCharges) },
    { desc: 'Parking', detail: 'Overnight', amount: money(pricing.parkingCharges) },
  ];
  if (pricing.discount) rows.push({ desc: 'Discount', detail: 'Negotiated', amount: `− ${money(pricing.discount)}` });
  rows.push({ desc: 'Taxes & Levies', detail: `${values.gstPercent || 0}% applicable`, amount: money(pricing.gstAmount) });

  return (
    <Box sx={{ bgcolor: '#fff', borderRadius: 2.5, overflow: 'hidden', boxShadow: '0 10px 36px rgba(11,23,48,0.14)', fontSize: 13 }}>
      <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
        {/* Sheet header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 25, color: 'primary.main', lineHeight: 1.1 }}>
              ✈ CAREWELL <Box component="span" sx={{ color: GOLD }}>AVIATION</Box>
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.4 }}>
              Charter Operations · Executive Aviation Services
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 25, color: 'primary.main', lineHeight: 1.1 }}>
              QUOTATION
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', fontFamily: 'monospace' }}>{quoteRef}</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{today}</Typography>
          </Box>
        </Box>

        <Box sx={{ height: 3, bgcolor: GOLD, borderRadius: 2, my: 2.2 }} />

        {/* Prepared for / flight summary */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5, mb: 2.5 }}>
          <Box>
            <GoldLabel>Prepared For</GoldLabel>
            {hasCustomer ? (
              <>
                <KV k="Client" v={dash(values.customerName)} />
                <KV k="Company" v={dash(values.company)} />
                <KV k="Phone" v={dash(values.phone)} />
                <KV k="Email" v={dash(values.email)} />
              </>
            ) : (
              <Typography sx={{ fontSize: 13, color: '#9aa3af', fontStyle: 'italic' }}>
                Client details will appear here
              </Typography>
            )}
          </Box>
          <Box>
            <GoldLabel>Flight Summary</GoldLabel>
            <KV k="Route" v={values.departureAirport || values.arrivalAirport ? `${dash(values.departureAirport)} → ${dash(values.arrivalAirport)}` : '—'} />
            <KV k="Date" v={dash(values.departureDate)} />
            <KV k="Passengers" v={values.passengers ? String(values.passengers) : '—'} />
            <KV k="Aircraft" v={aircraft ? aircraft.name : '—'} />
            <KV k="Category" v={aircraft ? aircraft.category : dash(values.aircraftCategory)} />
          </Box>
        </Box>

        {/* Aircraft photo */}
        {aircraft && (
          <Box sx={{ borderRadius: 2, overflow: 'hidden', mb: 2.5, position: 'relative' }}>
            <Box component="img" src={aircraft.image} alt={aircraft.name} sx={{ width: '100%', height: 190, objectFit: 'cover', display: 'block' }} />
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                bgcolor: 'rgba(11,23,48,0.88)',
                px: 1.8,
                py: 0.9,
                display: 'flex',
                gap: 1.2,
                alignItems: 'baseline',
                flexWrap: 'wrap',
              }}
            >
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: GOLD, letterSpacing: 1 }}>
                {aircraft.category.toUpperCase()}
              </Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>
                {aircraft.manufacturer} {aircraft.name}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: '#c8d0dc' }}>
                {aircraft.max_passengers} pax · {aircraft.max_range_nm.toLocaleString()} nm · {aircraft.cruise_speed_kt} kt
              </Typography>
            </Box>
          </Box>
        )}

        {/* Cost breakdown */}
        <GoldLabel>Cost Breakdown</GoldLabel>
        <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #e8ebf0' }}>
          <Row head desc="Description" detail="Details" amount="Amount" />
          {rows.map((r, i) => (
            <Row key={r.desc} desc={r.desc} detail={r.detail} amount={r.amount} alt={i % 2 === 1} />
          ))}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.5, bgcolor: NAVY_DEEP }}>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 13.5, letterSpacing: 0.5 }}>GRAND TOTAL</Typography>
            <Typography sx={{ fontFamily: SERIF, color: GOLD, fontWeight: 700, fontSize: 21 }}>
              {money(pricing.grandTotal)}
            </Typography>
          </Box>
        </Box>

        {values.notes && (
          <>
            <GoldLabel sx={{ mt: 2.5 }}>Special Requirements</GoldLabel>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{values.notes}</Typography>
          </>
        )}

        {/* Terms */}
        <GoldLabel sx={{ mt: 2.5 }}>Terms &amp; Conditions</GoldLabel>
        <Box component="ol" sx={{ m: 0, pl: 2.2, color: 'text.secondary', fontSize: 12, lineHeight: 1.9 }}>
          <li>This quotation is valid for 72 hours from the date of issue.</li>
          <li>A 50% deposit is required upon confirmation of booking.</li>
          <li>Pricing is subject to change based on fuel price fluctuations beyond ±5%.</li>
          <li>Cancellation within 24 hours of departure is non-refundable.</li>
          <li>All prices are exclusive of applicable government fees and airport charges unless stated.</li>
        </Box>

        {/* Signatures */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mt: 3.5, pt: 2, borderTop: '1px solid #edf0f4' }}>
          <Box>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>Authorised Signature</Typography>
            <Typography sx={{ fontFamily: SERIF, fontSize: 21, color: 'text.primary', borderBottom: '1px solid #c6cdd6', pb: 0.5 }}>
              {preparedBy || 'Charter Consultant'}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>
              Charter Consultant · Carewell Aviation
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>Client Acceptance</Typography>
            <Box sx={{ height: 30, borderBottom: '1px solid #c6cdd6' }} />
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>Signature &amp; Date</Typography>
          </Box>
        </Box>
      </Box>

      {/* Footer strip */}
      <Box sx={{ bgcolor: NAVY_DEEP, px: 3, py: 1.2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 13, color: '#fff' }}>
          CAREWELL <Box component="span" sx={{ color: GOLD }}>AVIATION</Box>
        </Typography>
        <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.7)' }}>
          carewellaviation.com · +91 98741 64445 · {quoteRef}
        </Typography>
      </Box>
    </Box>
  );
}

function GoldLabel({ children, sx = {} }: { children: React.ReactNode; sx?: object }) {
  return (
    <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.4, color: GOLD, textTransform: 'uppercase', mb: 1, ...sx }}>
      {children}
    </Typography>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <Box sx={{ display: 'flex', mb: 0.55 }}>
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', width: 92, flexShrink: 0 }}>{k}</Typography>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.primary' }}>{v}</Typography>
    </Box>
  );
}

function Row({ desc, detail, amount, head = false, alt = false }: { desc: string; detail: string; amount: string; head?: boolean; alt?: boolean }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1.5fr 1.2fr 0.9fr',
        px: 2,
        py: head ? 1.1 : 1,
        bgcolor: head ? '#122441' : alt ? '#f4f6f9' : '#fff',
        alignItems: 'center',
      }}
    >
      <Typography sx={{ fontSize: head ? 12 : 12.5, fontWeight: head ? 700 : 700, color: head ? '#fff' : 'text.primary' }}>
        {desc}
      </Typography>
      <Typography sx={{ fontSize: head ? 12 : 12, fontWeight: head ? 700 : 400, color: head ? '#fff' : 'text.secondary', textAlign: 'center' }}>
        {detail}
      </Typography>
      <Typography sx={{ fontSize: head ? 12 : 12.5, fontWeight: 700, color: head ? '#fff' : 'text.primary', textAlign: 'right' }}>
        {amount}
      </Typography>
    </Box>
  );
}
