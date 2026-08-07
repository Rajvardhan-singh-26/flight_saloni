import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import ShareIcon from '@mui/icons-material/ShareOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import RefreshIcon from '@mui/icons-material/Autorenew';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FlightIcon from '@mui/icons-material/Flight';
import AddIcon from '@mui/icons-material/Add';
import { useForm, useWatch } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';

import DashboardLayout from '../components/DashboardLayout';
import AIRequestForm from '../components/AIRequestForm';
import AircraftCard from '../components/AircraftCard';
import { CustomerCard, FlightCard, PricingCard, SectionCard, TermsCard } from '../components/ManualEntryForm';
import QuotePreview from '../components/QuotePreview';
import PdfViewerDialog from '../components/PdfViewerDialog';

import { addCustomerFromQuote, AIRCRAFT_CHANGED_EVENT, fetchAircraft, generateQuotePdf, getSession } from '../api/client';
import { formatMoney, usePricing } from '../hooks/usePricing';
import { DEFAULT_FORM_VALUES, type Aircraft, type AIExtractionResult, type QuoteFormValues } from '../types';
import { GOLD, NAVY_DEEP, SERIF } from '../theme';

export default function QuoteGeneratorPage() {
  const session = getSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [fleet, setFleet] = useState<Aircraft[]>([]);
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState('');
  const [pdfOpen, setPdfOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  const [shareAnchor, setShareAnchor] = useState<HTMLElement | null>(null);
  const [askAddCustomer, setAskAddCustomer] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const [leftWidthPct, setLeftWidthPct] = useState(46);

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
  // Points at the backend's persisted copy (not the local blob URL, which
  // only exists in this browser tab) so it's a real link others can open.
  const shareLink = quoteId ? `${window.location.origin}/api/quotes/${quoteId}/pdf` : null;

  useEffect(() => {
    const loadFleet = (isInitial: boolean) => {
      fetchAircraft()
        .then((list) => {
          setFleet(list);
          if (isInitial) {
            // Pre-select the midsize workhorse like the design's default state.
            const hawker = list.find((a) => a.id === 'hawker-900xp') ?? list[0];
            if (hawker) {
              setSelectedAircraft(hawker);
              setValue('aircraftCategory', hawker.category);
              setValue('hourlyRate', hawker.hourly_rate);
            }
          } else {
            // Keep the current selection, but refresh it with any edits
            // (rate/name/etc.) made from the aircraft details popup.
            setSelectedAircraft((prev) => (prev ? list.find((a) => a.id === prev.id) ?? prev : prev));
          }
        })
        .catch(() => setSnack('Could not load fleet — is the backend running on port 8000?'));
    };

    loadFleet(true);
    const onAircraftChanged = () => loadFleet(false);
    window.addEventListener(AIRCRAFT_CHANGED_EVENT, onAircraftChanged);
    return () => window.removeEventListener(AIRCRAFT_CHANGED_EVENT, onAircraftChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectAircraft = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft);
    setValue('aircraftCategory', aircraft.category);
    setValue('hourlyRate', aircraft.hourly_rate);
  };

  const handleExtracted = (r: AIExtractionResult) => {
    if (r.customer_name) setValue('customerName', r.customer_name);
    // Company/phone/email matter beyond the form: the backend keys its
    // customer directory on email (falling back to phone), so without these
    // an AI-extracted quote would never produce a customer record.
    if (r.company) setValue('company', r.company);
    if (r.phone) setValue('phone', r.phone);
    if (r.email) setValue('email', r.email);
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
      const { blobUrl, quoteId: id } = await generateQuotePdf(values, selectedAircraft?.id ?? null, session?.name);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(blobUrl);
      setQuoteId(id);
      if (openAfter === 'view') setPdfOpen(true);
      if (openAfter === 'print') {
        const win = window.open(blobUrl, '_blank');
        win?.addEventListener('load', () => win.print());
      }
      if (openAfter === 'silent') setSnack(`Quotation ${id} regenerated.`);
      // Saving to the customer directory is opt-in — prompt once per quote,
      // and only when there's something identifiable to file it under.
      if (values.customerName.trim() || values.email.trim() || values.phone.trim()) {
        setAskAddCustomer(true);
      }
    } catch {
      setSnack('PDF generation failed — is the backend running on port 8000?');
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirmAddCustomer = async () => {
    setSavingCustomer(true);
    try {
      await addCustomerFromQuote(values, pricing.grandTotal);
      setAskAddCustomer(false);
      setSnack('Saved to Customers.');
    } catch {
      setSnack('Could not add this customer.');
    } finally {
      setSavingCustomer(false);
    }
  };

  const scrollCarousel = (dir: 1 | -1) => {
    carouselRef.current?.scrollBy({ left: dir * 270, behavior: 'smooth' });
  };

  const handleAddAircraft = () => {
    // backgroundLocation keeps this page mounted behind the popup, same as
    // AircraftCard's "View details" link.
    navigate('/aircraft/new', { state: { backgroundLocation: location } });
  };

  const handleShareClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!shareLink) {
      setSnack('Download or print the quotation first, then share it.');
      return;
    }
    setShareAnchor(e.currentTarget);
  };

  const handleCopyLink = () => {
    if (shareLink) navigator.clipboard?.writeText(shareLink).catch(() => {});
    setSnack('Quotation link copied to clipboard.');
    setShareAnchor(null);
  };

  const handleEmailShare = () => {
    if (!shareLink) return;
    const subject = encodeURIComponent(`Charter Quotation ${displayRef}`);
    const body = encodeURIComponent(`Please find your charter quotation here:\n${shareLink}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShareAnchor(null);
  };

  // Drag-to-resize the split between the form column and the preview panel.
  // Mirrors the aircraft popup's drag pattern: mutate DOM width directly
  // while dragging for smoothness, commit to state only on release.
  const handleSplitDrag = () => {
    const container = splitContainerRef.current;
    const leftPanel = leftPanelRef.current;
    if (!container || !leftPanel) return;
    const rect = container.getBoundingClientRect();
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const clampPct = (px: number) => Math.min(72, Math.max(26, (px / rect.width) * 100));

    const onMove = (ev: PointerEvent) => {
      const pct = clampPct(ev.clientX - rect.left);
      leftPanel.style.width = `${pct}%`;
    };
    const onUp = (ev: PointerEvent) => {
      setLeftWidthPct(clampPct(ev.clientX - rect.left));
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <DashboardLayout>
      <Box
        ref={splitContainerRef}
        sx={{
          flex: 1,
          display: { xs: 'block', lg: 'flex' },
          alignItems: 'stretch',
          minHeight: 0,
        }}
      >
        {/* LEFT: form column — width is drag-adjustable on desktop via the divider */}
        <Box
          ref={leftPanelRef}
          sx={{
            width: { xs: '100%', lg: `${leftWidthPct}%` },
            flexShrink: 0,
            minWidth: 0,
            height: { lg: 'calc(100vh - 65px)' },
            overflowY: { lg: 'auto' },
            p: { xs: 2, md: 3 },
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
          }}>
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

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
                <Button
                  onClick={handleAddAircraft}
                  startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                  size="small"
                  sx={{ color: '#122441', bgcolor: GOLD, '&:hover': { bgcolor: '#dbb96a' } }}
                >
                  Add Aircraft
                </Button>
              </Box>
            </Box>
          </SectionCard>

          <PricingCard control={control} />
          <TermsCard control={control} />
        </Box>

        {/* Drag handle — resizes the split between the form and preview columns */}
        <Box
          onPointerDown={handleSplitDrag}
          sx={{
            display: { xs: 'none', lg: 'flex' },
            width: 7,
            flexShrink: 0,
            cursor: 'col-resize',
            bgcolor: '#e2e6ec',
            position: 'relative',
            '&:hover': { bgcolor: GOLD },
            '&:active': { bgcolor: GOLD },
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: '0 -4px',
            },
          }}
        />

        {/* RIGHT: preview panel */}
        <Box
          sx={{
            bgcolor: '#e6eaf0',
            flex: 1,
            minWidth: 0,
            height: { lg: 'calc(100vh - 65px)' },
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Dark action toolbar — pinned; only the sheet below it scrolls */}
          <Box
            sx={{
              bgcolor: NAVY_DEEP,
              px: { xs: 2, md: 3 },
              py: 1.4,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
              flexShrink: 0,
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
            <ToolbarButton icon={<ShareIcon sx={{ fontSize: 17 }} />} label="Share" onClick={handleShareClick} />
            <Menu anchorEl={shareAnchor} open={!!shareAnchor} onClose={() => setShareAnchor(null)}>
              <MenuItem onClick={handleEmailShare}>
                <ListItemIcon>
                  <EmailOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Email quotation</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleCopyLink}>
                <ListItemIcon>
                  <LinkOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Copy link</ListItemText>
              </MenuItem>
            </Menu>
            <ToolbarButton icon={<RefreshIcon sx={{ fontSize: 18 }} />} label="Regenerate" onClick={() => generate('silent')} disabled={generating} />
          </Box>

          {/* Sheet — the only part of the right panel that scrolls */}
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: { xs: 2, md: 3.5 } }}>
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

      {/* Opt-in prompt: file this quote's client into the Customers tab. */}
      <Dialog open={askAddCustomer} onClose={() => setAskAddCustomer(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 19 }}>Add to Customers?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 14 }}>
            Save <strong>{values.customerName || values.email || values.phone}</strong> to your Customers list,
            along with this quotation's value of{' '}
            <strong>{formatMoney(pricing.grandTotal, values.currency || 'USD')}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAskAddCustomer(false)} disabled={savingCustomer} sx={{ color: 'text.secondary' }}>
            Not now
          </Button>
          <Button
            onClick={handleConfirmAddCustomer}
            disabled={savingCustomer}
            startIcon={savingCustomer ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ color: '#122441', bgcolor: GOLD, '&:hover': { bgcolor: '#dbb96a' } }}
          >
            Add customer
          </Button>
        </DialogActions>
      </Dialog>

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
  icon: React.ReactNode; label: string; onClick: (e: React.MouseEvent<HTMLElement>) => void; disabled?: boolean; primary?: boolean;
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
