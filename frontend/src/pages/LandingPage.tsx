import { Box, Button, Container, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import DiamondIcon from '@mui/icons-material/Diamond';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VerifiedIcon from '@mui/icons-material/Verified';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { GOLD } from '../theme';

const MotionBox = motion.create(Box);

const highlights = [
  { icon: <FlightTakeoffIcon />, title: 'Global Fleet', text: 'Seven curated aircraft, from turboprops to ultra-long-range jets.' },
  { icon: <AccessTimeIcon />, title: 'Quotes in Seconds', text: 'AI-assisted quoting turns a request into a client-ready PDF in under a minute.' },
  { icon: <DiamondIcon />, title: 'White-Glove Service', text: 'Bespoke catering, ground transport, and concierge on every charter.' },
  { icon: <VerifiedIcon />, title: 'Certified Operators', text: 'Every aircraft flown by accredited crews with impeccable safety records.' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0b1730', color: '#fff', overflow: 'hidden' }}>
      {/* Hero */}
      <Box
        sx={{
          position: 'relative',
          minHeight: '86vh',
          display: 'flex',
          flexDirection: 'column',
          background:
            'radial-gradient(1200px 600px at 75% 20%, rgba(201,162,75,0.16), transparent 60%),' +
            'radial-gradient(900px 500px at 15% 80%, rgba(27,54,97,0.5), transparent 65%),' +
            'linear-gradient(180deg, #122441 0%, #0d1e3c 55%, #0b1730 100%)',
        }}
      >
        {/* Star field */}
        {[...Array(26)].map((_, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              width: i % 5 === 0 ? 3 : 2,
              height: i % 5 === 0 ? 3 : 2,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.5)',
              top: `${(i * 37) % 90}%`,
              left: `${(i * 53) % 97}%`,
              opacity: 0.15 + ((i * 13) % 40) / 100,
            }}
          />
        ))}

        <Container maxWidth="lg" sx={{ pt: 4, position: 'relative', zIndex: 2 }}>
          <BrandLogo light />
        </Container>

        <Container
          maxWidth="lg"
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
            py: { xs: 8, md: 0 },
          }}
        >
          <Box sx={{ maxWidth: 640 }}>
            <MotionBox initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <Typography sx={{ letterSpacing: 5, color: GOLD, fontWeight: 600, fontSize: 13, mb: 2 }}>
                THE WINGS OF IMAGINATION
              </Typography>
              <Typography
                variant="h1"
                sx={{ fontSize: { xs: 44, md: 68 }, lineHeight: 1.06, mb: 3 }}
              >
                Elevate Every
                <Box component="span" sx={{ color: GOLD, fontStyle: 'italic' }}> Journey</Box>
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: 18, lineHeight: 1.7, mb: 5, maxWidth: 520 }}>
                Carewell Aviation crafts seamless private aviation experiences. Request a charter,
                and receive a polished quotation before your coffee cools.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  size="large"
                  variant="contained"
                  onClick={() => navigate('/quote')}
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    bgcolor: GOLD,
                    color: '#122441',
                    fontSize: 16,
                    px: 4,
                    py: 1.5,
                    '&:hover': { bgcolor: '#e3cf9e' },
                    boxShadow: '0 8px 30px rgba(201,162,75,0.35)',
                  }}
                >
                  Generate Charter Quote
                </Button>
                <Button
                  size="large"
                  variant="outlined"
                  onClick={() => navigate('/quote')}
                  sx={{
                    color: '#fff',
                    borderColor: 'rgba(255,255,255,0.35)',
                    px: 4,
                    '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.06)' },
                  }}
                >
                  View Fleet
                </Button>
              </Stack>
            </MotionBox>
          </Box>
        </Container>

        {/* Hero jet artwork */}
        <MotionBox
          initial={{ opacity: 0, x: 120 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.1, delay: 0.2 }}
          sx={{
            position: 'absolute',
            right: { xs: '2%', md: '4%' },
            top: { xs: 'auto', md: '22%' },
            bottom: { xs: '2%', md: 'auto' },
            width: { xs: '70%', md: '42%' },
            zIndex: 1,
            pointerEvents: 'none',
            display: { xs: 'none', sm: 'block' },
          }}
        >
          <Box
            component="img"
            src="/aircraft/hero.jpg"
            alt="Private jet on the tarmac"
            sx={{
              width: '100%',
              borderRadius: 4,
              border: `1px solid rgba(201,162,75,0.4)`,
              boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
              display: 'block',
            }}
          />
        </MotionBox>
      </Box>

      {/* Highlights */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 11 } }}>
        <Typography variant="h3" sx={{ textAlign: 'center', fontSize: { xs: 30, md: 40 }, mb: 1 }}>
          The Carewell Standard
        </Typography>
        <Typography sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', mb: 7 }}>
          Precision, discretion, and uncompromising comfort.
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
          }}
        >
          {highlights.map((h, i) => (
            <MotionBox
              key={h.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              sx={{
                p: 3.5,
                borderRadius: 3.5,
                background: 'rgba(255,255,255,0.045)',
                border: '1px solid rgba(255,255,255,0.09)',
                backdropFilter: 'blur(14px)',
              }}
            >
              <Box sx={{ color: GOLD, mb: 1.5, '& svg': { fontSize: 30 } }}>{h.icon}</Box>
              <Typography sx={{ fontWeight: 700, mb: 0.8 }}>{h.title}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.62)', fontSize: 14, lineHeight: 1.65 }}>
                {h.text}
              </Typography>
            </MotionBox>
          ))}
        </Box>
      </Container>

      {/* Footer */}
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', py: 4 }}>
        <Container maxWidth="lg" sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
          <BrandLogo light compact />
          <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
            © {new Date().getFullYear()} Carewell Aviation · commercials@carewellaviation.com
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
