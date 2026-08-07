import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, MenuItem, Snackbar, TextField, Typography } from '@mui/material';
import FlightIcon from '@mui/icons-material/Flight';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';

import DashboardLayout from '../components/DashboardLayout';
import { AIRCRAFT_CHANGED_EVENT, fetchAircraft } from '../api/client';
import { formatMoney } from '../hooks/usePricing';
import { AIRCRAFT_CATEGORIES, CURRENCIES, type Aircraft } from '../types';
import { cardSx, GOLD, LINK_BLUE, SERIF } from '../theme';

/** Fleet catalogue — every aircraft, each opening the same editable details
 * popup used from the quote page's aircraft carousel. */
export default function AircraftPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [fleet, setFleet] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    const load = () =>
      fetchAircraft()
        .then(setFleet)
        .catch(() => setSnack('Could not load the fleet — is the backend running on port 8000?'))
        .finally(() => setLoading(false));
    load();
    // Refresh when an aircraft is added/edited in the popup over this page.
    window.addEventListener(AIRCRAFT_CHANGED_EVENT, load);
    return () => window.removeEventListener(AIRCRAFT_CHANGED_EVENT, load);
  }, []);

  // backgroundLocation keeps this page mounted behind the details popup, so
  // it stays visible and its scroll position survives.
  const openDetails = (id: string) =>
    navigate(`/aircraft/${id}`, { state: { backgroundLocation: location } });

  const shown = category ? fleet.filter((a) => a.category === category) : fleet;

  return (
    <DashboardLayout>
      <Box sx={{ flex: 1, p: { xs: 2, md: 3.5 } }}>
        <Box sx={cardSx}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <FlightIcon sx={{ color: GOLD, fontSize: 21, transform: 'rotate(45deg)' }} />
                <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 21, color: 'text.primary' }}>
                  Aircraft Fleet
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>
                {fleet.length} aircraft. Click any one to edit its details, pricing and gallery — the same editor
                used from the quote page.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                select
                size="small"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                sx={{ minWidth: 170 }}
              >
                <MenuItem value="">All categories</MenuItem>
                {AIRCRAFT_CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                sx={{ minWidth: 110 }}
              >
                {CURRENCIES.map((c) => (
                  <MenuItem key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                onClick={() => openDetails('new')}
                startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                sx={{ color: '#122441', bgcolor: GOLD, '&:hover': { bgcolor: '#dbb96a' } }}
              >
                Add Aircraft
              </Button>
            </Box>
          </Box>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={26} sx={{ color: GOLD }} />
            </Box>
          )}

          {!loading && shown.length === 0 && (
            <Typography sx={{ fontSize: 13.5, color: '#9aa3af', fontStyle: 'italic', py: 4, textAlign: 'center' }}>
              {fleet.length === 0 ? 'No aircraft in the fleet yet.' : 'No aircraft in this category.'}
            </Typography>
          )}

          {!loading && shown.length > 0 && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                gap: 2.5,
              }}
            >
              {shown.map((a) => (
                <Box
                  key={a.id}
                  onClick={() => openDetails(a.id)}
                  sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    bgcolor: '#fff',
                    border: '1px solid #e5e8ee',
                    boxShadow: '0 3px 14px rgba(18,36,65,0.07)',
                    cursor: 'pointer',
                    transition: 'box-shadow .2s, transform .2s',
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 10px 28px rgba(18,36,65,0.14)' },
                  }}
                >
                  {a.image ? (
                    <Box component="img" src={a.image} alt={a.name} sx={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <Box sx={{ width: '100%', height: 150, bgcolor: '#e6eaf0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography sx={{ color: '#9aa3af', fontSize: 12.5, fontStyle: 'italic' }}>No photo yet</Typography>
                    </Box>
                  )}
                  <Box sx={{ p: 2 }}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: GOLD, letterSpacing: 0.8 }}>
                      {(a.category || 'UNCATEGORISED').toUpperCase()}
                    </Typography>
                    <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 19, color: 'primary.main', lineHeight: 1.2 }}>
                      {a.manufacturer} {a.name}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>
                      {a.max_passengers} pax · {a.max_range_nm.toLocaleString()} nm · {a.cruise_speed_kt} kt
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.2 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 16, color: 'text.primary' }}>
                        {formatMoney(a.hourly_rate, currency)}
                        <Box component="span" sx={{ fontWeight: 500, fontSize: 12, color: 'text.secondary' }}>
                          /hr
                        </Box>
                      </Typography>
                      <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.4, fontSize: 12.5, color: LINK_BLUE, fontWeight: 500 }}>
                        <EditIcon sx={{ fontSize: 15 }} /> Edit
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 11.5, color: '#9aa3af', mt: 0.8 }}>
                      {a.gallery.length > 0 ? `${a.gallery.length} gallery image${a.gallery.length === 1 ? '' : 's'}` : 'No gallery images'}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>

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
