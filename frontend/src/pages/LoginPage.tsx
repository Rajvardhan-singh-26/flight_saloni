import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LoginIcon from '@mui/icons-material/Login';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { login } from '../api/client';
import { GOLD } from '../theme';

const MotionBox = motion.create(Box);

/** Salesperson sign-in. Credentials are validated by the backend against .env. */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || '/quote';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background:
          'radial-gradient(1000px 500px at 80% 15%, rgba(201,162,75,0.14), transparent 60%),' +
          'radial-gradient(800px 480px at 12% 85%, rgba(27,54,97,0.5), transparent 65%),' +
          'linear-gradient(180deg, #122441 0%, #0d1e3c 55%, #0b1730 100%)',
      }}
    >
      <MotionBox
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        sx={{
          width: '100%',
          maxWidth: 420,
          p: { xs: 3, sm: 4.5 },
          borderRadius: 4,
          background: 'rgba(255,255,255,0.96)',
          boxShadow: '0 24px 70px rgba(2,16,38,0.45)',
          borderTop: `4px solid ${GOLD}`,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <BrandLogo />
        </Box>
        <Typography variant="h5" sx={{ textAlign: 'center', color: 'primary.main', mb: 0.5 }}>
          Sales Portal
        </Typography>
        <Typography sx={{ textAlign: 'center', color: 'text.secondary', fontSize: 13.5, mb: 3.5 }}>
          Sign in to prepare charter quotations for your clients.
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.2 }}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon sx={{ fontSize: 19 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ fontSize: 19 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          {error && (
            <Alert severity="error" variant="outlined">
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <LoginIcon />}
            sx={{ py: 1.3, bgcolor: 'primary.main', '&:hover': { bgcolor: '#1b3661' } }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </Box>

        <Typography sx={{ textAlign: 'center', color: 'text.secondary', fontSize: 11.5, mt: 3 }}>
          Access is limited to authorized Carewell Aviation sales staff.
        </Typography>
      </MotionBox>
    </Box>
  );
}
