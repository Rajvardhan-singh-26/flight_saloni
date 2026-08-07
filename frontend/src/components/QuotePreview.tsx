import { useLayoutEffect, useMemo, useRef, useState } from 'react';
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

// A4 at 96 CSS px/inch (210mm × 297mm) — pages are sized to this so they
// read as actual sheets, not an arbitrarily-tall panel.
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const SHEET_PADDING_PX = 28; // matches the body's p: { md: 3.5 } (3.5 × 8px)

type Section = { key: string; node: React.ReactNode };

/** The quotation sheet — mirrors the generated PDF, including real pagination:
 * each body section is measured, then bin-packed across as many A4 pages as
 * needed, with the brand header and footer strip repeated on every page —
 * the same way the PDF's page template repeats them. */
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

  const showGallery = !!aircraft && aircraft.gallery.length >= 2 && aircraft.gallery.length % 2 === 0;

  // Header + footer are identical on every page (mirrors the PDF's repeated
  // page chrome), defined once and reused both for measuring and display.
  const headerNode = (
    <>
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
    </>
  );

  const footerNode = (
    <Box sx={{ bgcolor: NAVY_DEEP, px: 3, py: 1.2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
      <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 13, color: '#fff' }}>
        CAREWELL <Box component="span" sx={{ color: GOLD }}>AVIATION</Box>
      </Typography>
      <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.7)' }}>
        carewellaviation.com · +91 98741 64445 · {quoteRef}
      </Typography>
    </Box>
  );

  // Body sections, in flow order. Each is treated as an indivisible block for
  // pagination — matching the PDF, where e.g. Terms + Signatures are wrapped
  // in KeepTogether so they never split across pages either.
  const sections: Section[] = useMemo(() => {
    const list: Section[] = [];

    list.push({
      key: 'summary',
      node: (
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
      ),
    });

    if (aircraft) {
      list.push({
        key: 'photo',
        node: (
          <Box sx={{ overflow: 'hidden', mb: 2.5, position: 'relative' }}>
            <Box component="img" src={aircraft.image} alt={aircraft.name} sx={{ width: '100%', height: 190, objectFit: 'cover', display: 'block' }} />
            <Box
              sx={{
                position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(11,23,48,0.88)',
                px: 1.8, py: 0.9, display: 'flex', gap: 1.2, alignItems: 'baseline', flexWrap: 'wrap',
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
        ),
      });
    }

    if (showGallery && aircraft) {
      list.push({
        key: 'gallery',
        node: (
          <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(aircraft.gallery.length, 4)}, 1fr)`, gap: 1, mb: 2.5 }}>
            {aircraft.gallery.slice(0, 4).map((img, i) => (
              <Box key={img.url + i}>
                <Box
                  component="img"
                  src={img.url}
                  alt={img.caption || `Gallery ${i + 1}`}
                  sx={{ width: '100%', height: 72, objectFit: 'cover', display: 'block', border: '1px solid #e8ebf0' }}
                />
                {img.caption && (
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', textAlign: 'center', mt: 0.4, lineHeight: 1.3 }}>
                    {img.caption}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        ),
      });
    }

    list.push({
      key: 'costs',
      node: (
        <>
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
        </>
      ),
    });

    if (values.notes) {
      list.push({
        key: 'notes',
        node: (
          <Box sx={{ mt: 2.5 }}>
            <GoldLabel>Special Requirements</GoldLabel>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{values.notes}</Typography>
          </Box>
        ),
      });
    }

    const termLines = (values.termsAndConditions || '').split('\n').map((l) => l.trim()).filter(Boolean);
    list.push({
      key: 'terms-sig',
      node: (
        <Box sx={{ mt: 2.5 }}>
          <GoldLabel>Terms &amp; Conditions</GoldLabel>
          <Box component="ol" sx={{ m: 0, pl: 2.2, color: 'text.secondary', fontSize: 12, lineHeight: 1.9 }}>
            {termLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </Box>
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
      ),
    });

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, aircraft, pricing, preparedBy, quoteRef, showGallery]);

  // Measure the header, footer, and each section once (off-screen), then
  // bin-pack section keys into pages so each page's content actually fits
  // within an A4 sheet's body height — no content ever overlaps another.
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [pages, setPages] = useState<string[][]>([sections.map((s) => s.key)]);

  useLayoutEffect(() => {
    const headerH = headerRef.current?.offsetHeight ?? 90;
    const footerH = footerRef.current?.offsetHeight ?? 44;
    const bodyBudget = A4_HEIGHT_PX - headerH - footerH - SHEET_PADDING_PX * 2;

    const packed: string[][] = [[]];
    let remaining = bodyBudget;
    for (const s of sections) {
      const h = sectionRefs.current[s.key]?.offsetHeight ?? 0;
      const current = packed[packed.length - 1];
      if (h > remaining && current.length > 0) {
        packed.push([]);
        remaining = bodyBudget;
      }
      packed[packed.length - 1].push(s.key);
      remaining -= h;
    }

    setPages((prev) => {
      const same = prev.length === packed.length && prev.every((p, i) => p.length === packed[i].length && p.every((k, j) => k === packed[i][j]));
      return same ? prev : packed;
    });
  }, [sections]);

  const sectionByKey = new Map(sections.map((s) => [s.key, s.node]));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      {/* Off-screen measuring pass — same width/padding as a real page so the
          measured heights match what's actually rendered below. The outer
          height:0 + overflow:hidden fully contains it (no scroll-area
          blowout from the child content's true, uncapped height). */}
      <Box sx={{ height: 0, overflow: 'hidden' }} aria-hidden>
        <Box sx={{ width: A4_WIDTH_PX - SHEET_PADDING_PX * 2 }}>
          <Box ref={headerRef}>{headerNode}</Box>
          {sections.map((s) => (
            <Box key={s.key} ref={(el: HTMLDivElement | null) => { sectionRefs.current[s.key] = el; }}>
              {s.node}
            </Box>
          ))}
          <Box ref={footerRef}>{footerNode}</Box>
        </Box>
      </Box>

      {pages.map((pageKeys, pageIndex) => (
        <Box key={pageIndex} sx={{ width: A4_WIDTH_PX, maxWidth: '100%', position: 'relative' }}>
          {pages.length > 1 && (
            <Typography sx={{ position: 'absolute', top: -22, right: 0, fontSize: 11, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.3 }}>
              Page {pageIndex + 1} of {pages.length}
            </Typography>
          )}
          <Box sx={{ bgcolor: '#fff', borderRadius: 2.5, overflow: 'hidden', boxShadow: '0 10px 36px rgba(11,23,48,0.14)', fontSize: 13 }}>
            <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
              {headerNode}
              {pageKeys.map((key) => (
                <Box key={key}>{sectionByKey.get(key)}</Box>
              ))}
            </Box>
            {footerNode}
          </Box>
        </Box>
      ))}
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
