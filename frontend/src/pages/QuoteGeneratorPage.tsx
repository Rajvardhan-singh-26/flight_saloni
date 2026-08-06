import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, IconButton, Snackbar, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import ShareIcon from '@mui/icons-material/ShareOutlined';
import RefreshIcon from '@mui/icons-material/Autorenew';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FlightIcon from '@mui/icons-material/Flight';
import { useForm, useWatch } from 'react-hook-form';

import DashboardLayout from '../components/DashboardLayout';
import AIRequestForm from '../components/AIRequestForm';
import AircraftCard from '../components/AircraftCard';
import { CustomerCard, FlightCard, PricingCard, SectionCard } from '../components/ManualEntryForm';
import QuotePreview from '../components/QuotePreview';
import PdfViewerDialog from '../components/PdfViewerDialog';

import { fetchAircraft, generateQuotePdf, getSession } from '../api/client';
import { usePricing } from '../hooks/usePricing';
import { DEFAULT_FORM_VALUES, type Aircraft, type AIExtractionResult, type QuoteFormValues } from '../types';
import { GOLD, NAVY_DEEP } from '../theme';

export default function QuoteGeneratorPage() {
  const session = getSession();
  const [fleet, setFleet] = useState<Aircraft[]>([]);
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState('');
  const [pdfOpen, setPdfOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const { control, setValue, getValues } = useForm<QuoteFormValues>({
    defaultValues: DEFAULT_FORM_VALUES,
    mode: 'onChange',
  });

  const watched = useWatch({ control });
  const values = useMemo(
    () => ({ ...DEFAULT_FORM_VALUES, ...getValues(), ...watched }) as QuoteFormValues,
    [watched, getValues],
  );
  const pricing = usePricing(values);
  const displayRef = quoteId || `QT-${new Date().getFullYear()}-DRAFT`;

  useEffect(() => {
    fetchAircraft()
      .then((list) => {
        setFleet(list);
        // Pre-select the midsize workhorse like the design's default state.
        const hawker = list.find((a) => a.id === 'hawker-900xp') ?? list[0];
        if (hawker) {
          setSelectedAircraft(hawker);
          setValue('aircraftCategory', hawker.category);
          setValue('hourlyRate', hawker.hourly_rate);
        }
      })
      .catch(() => setSnack('Could not load fleet — is the backend running on port 8000?'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectAircraft = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft);
    setValue('aircraftCategory', aircraft.category);
    setValue('hourlyRate', aircraft.hourly_rate);
  };

  const handleExtracted = (r: AIExtractionResult) => {
    if (r.customer_name) setValue('customerName', r.customer_name);
    if (r.departure_airport) setValue('departureAirport', r.departure_airport);
    if (r.arrival_airport) setValue('arrivalAirport', r.arrival_airport);
    if (r.departure_date) setValue('departureDate', r.departure_date);
    if (r.passengers) setValue('passengers', r.passengers);
    if (r.aircraft_category) setValue('aircraftCategory', r.aircraft_category);
    if (r.flight_hours) setValue('flightHours', r.flight_hours);
    if (r.aircraft_category) {
      const match = fleet.find((a) => a.category === r.aircraft_category);
      if (match) handleSelectAircraft(match);
    }
    setSnack('AI extraction complete — review the details below.');
  };

  const generate = async (openAfter: 'view' | 'print' | 'silent' = 'view') => {
    setGenerating(true);
    try {
      const { blobUrl, quoteId: id } = await generateQuotePdf(values, selectedAircraft?.id ?? null);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(blobUrl);
      setQuoteId(id);
      if (openAfter === 'view') setPdfOpen(true);
      if (openAfter === 'print') {
        const win = window.open(blobUrl, '_blank');
        win?.addEventListener('load', () => win.print());
      }
      if (openAfter === 'silent') setSnack(`Quotation ${id} regenerated.`);
    } catch {
      setSnack('PDF generation failed — is the backend running on port 8000?');
    } finally {
      setGenerating(false);
    }
  };

  const scrollCarousel = (dir: 1 | -1) => {
    carouselRef.current?.scrollBy({ left: dir * 270, behavior: 'smooth' });
  };

  return (
    <DashboardLayout>
      <Box
        sx={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 0.95fr) minmax(0, 1.05fr)' },
          gap: 0,
          alignItems: 'start',
        }}
      >
        {/* LEFT: form column */}
        <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <AIRequestForm onExtracted={handleExtracted} />
          <CustomerCard control={control} />
          <FlightCard control={control} />

          {/* Aircraft selection carousel */}
          <SectionCard
            icon={<FlightIcon sx={{ transform: 'rotate(45deg)' }} />}
            title="Aircraft Selection"
          >
            <Box sx={{ gridColumn: '1 / -1', position: 'relative' }}>
              <Box sx={{ position: 'absolute', top: -52, right: 0, display: 'flex', gap: 1 }}>
                <IconButton onClick={() => scrollCarousel(-1)} size="small" sx={{ border: '1px solid #e2e6ec', bgcolor: '#fff' }}>
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <IconButton onClick={() => scrollCarousel(1)} size="small" sx={{ border: '1px solid #e2e6ec', bgcolor: '#fff' }}>
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Box>
              <Box
                ref={carouselRef}
                sx={{
                  display: 'flex',
                  gap: 2,
                  overflowX: 'auto',
                  scrollSnapType: 'x mandatory',
                  pb: 1,
                  '&::-webkit-scrollbar': { height: 6 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: '#d6dbe3', borderRadius: 3 },
                }}
              >
                {fleet.map((a) => (
                  <AircraftCard
                    key={a.id}
                    aircraft={a}
                    selected={selectedAircraft?.id === a.id}
                    onSelect={handleSelectAircraft}
                    currency={values.currency}
                  />
                ))}
                {fleet.length === 0 && (
                  <Typography sx={{ color: 'text.secondary', fontSize: 13.5, fontStyle: 'italic', py: 3 }}>
                    Loading fleet…
                  </Typography>
                )}
              </Box>
            </Box>
          </SectionCard>

          <PricingCard control={control} />
        </Box>

        {/* RIGHT: preview panel */}
        <Box
          sx={{
            bgcolor: '#e6eaf0',
            minHeight: { lg: 'calc(100vh - 65px)' },
            position: { lg: 'sticky' },
            top: { lg: 65 },
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Dark action toolbar */}
          <Box
            sx={{
              bgcolor: NAVY_DEEP,
              px: { xs: 2, md: 3 },
              py: 1.4,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 'auto', color: 'rgba(255,255,255,0.75)' }}>
              <DescriptionOutlinedIcon sx={{ fontSize: 17 }} />
              <Typography sx={{ fontSize: 13.5, fontFamily: 'monospace' }}>{displayRef}</Typography>
              <Typography sx={{ fontSize: 13, display: { xs: 'none', sm: 'block' } }}>· Charter Quotation</Typography>
            </Box>
            <ToolbarButton
              icon={generating ? <CircularProgress size={15} color="inherit" /> : <DownloadIcon sx={{ fontSize: 18 }} />}
              label="Download"
              onClick={() => generate('view')}
              disabled={generating}
              primary
            />
            <ToolbarButton icon={<PrintIcon sx={{ fontSize: 18 }} />} label="Print" onClick={() => generate('print')} disabled={generating} />
            <ToolbarButton
              icon={<ShareIcon sx={{ fontSize: 17 }} />}
              label="Share"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href).catch(() => {});
                setSnack('Share link copied to clipboard.');
              }}
            />
            <ToolbarButton icon={<RefreshIcon sx={{ fontSize: 18 }} />} label="Regenerate" onClick={() => generate('silent')} disabled={generating} />
          </Box>

          {/* Sheet */}
          <Box sx={{ p: { xs: 2, md: 3.5 }, overflowY: 'auto' }}>
            <QuotePreview
              values={values}
              aircraft={selectedAircraft}
              pricing={pricing}
              preparedBy={session?.name}
              quoteRef={displayRef}
            />
          </Box>
        </Box>
      </Box>

      <PdfViewerDialog open={pdfOpen} blobUrl={pdfUrl} quoteId={quoteId} onClose={() => setPdfOpen(false)} />

      <Snackbar
        open={!!snack}
        autoHideDuration={4200}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnack(null)} severity="info" variant="filled" sx={{ bgcolor: '#122441' }}>
          {snack}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}

function ToolbarButton({
  icon, label, onClick, disabled = false, primary = false,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; primary?: boolean;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      startIcon={icon}
      size="small"
      sx={{
        color: primary ? '#122441' : 'rgba(255,255,255,0.85)',
        bgcolor: primary ? GOLD : 'transparent',
        px: 1.6,
        fontSize: 13.5,
        '&:hover': { bgcolor: primary ? '#dbb96a' : 'rgba(255,255,255,0.08)' },
      }}
    >
      {label}
    </Button>
  );
}
