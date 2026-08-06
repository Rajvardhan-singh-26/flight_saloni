import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { Aircraft } from '../types';
import { formatMoney } from '../hooks/usePricing';
import { GOLD, LINK_BLUE, SERIF } from '../theme';

interface Props {
  aircraft: Aircraft;
  selected: boolean;
  onSelect: (aircraft: Aircraft) => void;
  currency?: string;
}

/** Photo card from the design: image, gold category, serif name, specs line, rate, view-details link. */
export default function AircraftCard({ aircraft, selected, onSelect, currency = 'USD' }: Props) {
  return (
    <Box
      onClick={() => onSelect(aircraft)}
      sx={{
        cursor: 'pointer',
        borderRadius: 3,
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
        width: 250,
        scrollSnapAlign: 'start',
        bgcolor: '#fff',
        border: selected ? `2px solid ${GOLD}` : '1px solid #e5e8ee',
        boxShadow: selected ? '0 8px 26px rgba(201,162,75,0.30)' : '0 3px 14px rgba(18,36,65,0.07)',
        transition: 'box-shadow .2s, border-color .2s, transform .2s',
        '&:hover': { transform: 'translateY(-3px)' },
      }}
    >
      {selected && (
        <CheckCircleIcon
          sx={{ position: 'absolute', top: 9, right: 9, zIndex: 2, color: GOLD, bgcolor: '#fff', borderRadius: '50%', fontSize: 22 }}
        />
      )}
      <Box
        component="img"
        src={aircraft.image}
        alt={aircraft.name}
        sx={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
      />
      <Box sx={{ p: 1.8 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: GOLD, mb: 0.2 }}>{aircraft.category}</Typography>
        <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 18.5, color: 'primary.main', lineHeight: 1.15 }}>
          {aircraft.name}
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.4 }}>
          {aircraft.max_passengers} pax · {aircraft.max_range_nm.toLocaleString()} nm
        </Typography>
        <Typography sx={{ fontWeight: 800, fontSize: 15.5, color: 'text.primary', mt: 0.7 }}>
          {formatMoney(aircraft.hourly_rate, currency)}
          <Box component="span" sx={{ fontWeight: 500, fontSize: 12, color: 'text.secondary' }}>
            /hr
          </Box>
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: LINK_BLUE, mt: 0.6, fontWeight: 500 }}>View details →</Typography>
      </Box>
    </Box>
  );
}
