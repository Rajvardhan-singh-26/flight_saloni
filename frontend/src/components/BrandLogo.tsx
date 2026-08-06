import { Box, Typography } from '@mui/material';
import FlightIcon from '@mui/icons-material/Flight';
import { GOLD, SERIF } from '../theme';

interface Props {
  light?: boolean;
  compact?: boolean;
}

/** Serif wordmark: "CAREWELL" + gold "AVIATION", with the gold plane badge from the design. */
export default function BrandLogo({ light = false, compact = false }: Props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.3 }}>
      <Box
        sx={{
          width: compact ? 32 : 38,
          height: compact ? 32 : 38,
          borderRadius: 2.2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: light ? 'rgba(201,162,75,0.12)' : '#122441',
          border: `1.5px solid ${GOLD}`,
        }}
      >
        <FlightIcon sx={{ fontSize: compact ? 17 : 20, color: GOLD, transform: 'rotate(45deg)' }} />
      </Box>
      <Typography
        sx={{
          fontFamily: SERIF,
          fontWeight: 700,
          fontSize: compact ? 19 : 22,
          letterSpacing: 1.4,
          lineHeight: 1,
          color: light ? '#fff' : 'primary.main',
        }}
      >
        CAREWELL{' '}
        <Box component="span" sx={{ color: GOLD }}>
          AVN
        </Box>
      </Typography>
    </Box>
  );
}
