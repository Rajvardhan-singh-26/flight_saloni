import { Box, Chip, Typography } from '@mui/material';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';

import DashboardLayout from '../components/DashboardLayout';
import { cardSx, GOLD, SERIF } from '../theme';

interface Props {
  title: string;
  /** One line on what this section will do once it's built. */
  description: string;
  icon: React.ReactNode;
  /** Optional bullets outlining what's planned. */
  planned?: string[];
}

/** Placeholder for sections that are navigable but not built yet, so the
 * sidebar never leads to a dead end. */
export default function ComingSoonPage({ title, description, icon, planned = [] }: Props) {
  return (
    <DashboardLayout>
      <Box sx={{ flex: 1, p: { xs: 2, md: 3.5 } }}>
        <Box sx={{ ...cardSx, textAlign: 'center', py: { xs: 6, md: 9 }, maxWidth: 620, mx: 'auto' }}>
          <Box
            sx={{
              width: 74,
              height: 74,
              borderRadius: '50%',
              bgcolor: '#fdf8ec',
              border: `1px solid ${GOLD}55`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2.5,
              '& svg': { fontSize: 34, color: GOLD },
            }}
          >
            {icon}
          </Box>

          <Chip
            icon={<ConstructionOutlinedIcon sx={{ fontSize: 16 }} />}
            label="Coming Soon"
            size="small"
            sx={{ bgcolor: GOLD, color: '#122441', fontWeight: 700, letterSpacing: 0.4, mb: 1.8, '& .MuiChip-icon': { color: '#122441' } }}
          />

          <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 27, color: 'primary.main', mb: 1 }}>
            {title}
          </Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.75, maxWidth: 420, mx: 'auto' }}>
            {description}
          </Typography>

          {planned.length > 0 && (
            <Box
              sx={{
                mt: 3.5,
                pt: 3,
                borderTop: '1px solid #edf0f4',
                display: 'inline-flex',
                flexDirection: 'column',
                gap: 1,
                textAlign: 'left',
              }}
            >
              <Typography sx={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.2, color: GOLD, textTransform: 'uppercase', mb: 0.4 }}>
                Planned
              </Typography>
              {planned.map((item) => (
                <Box key={item} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2 }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: GOLD, mt: '7px', flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>{item}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </DashboardLayout>
  );
}
