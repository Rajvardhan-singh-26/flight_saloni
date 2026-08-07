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
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { login } from '../api/client';
import { GOLD, LINK_BLUE } from '../theme';

const MotionBox = motion.create(Box);

/** Salesperson sign-in, backed by Supabase Auth. Accounts must be approved by
 * a sales executive before they can sign in. */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || '/quote';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  // "Awaiting approval" isn't a credentials failure — show it as info, not error.
  const [pending, setPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPending(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const res = (err as { response?: { status?: number; data?: { detail?: string } } })?.response;
      if (!res) {
        // No response at all — the request never completed. Reporting this as
        // "invalid password" would send people hunting for the wrong problem.
        setError(
          'Could not reach the server. It may be starting up (free hosting sleeps when idle) — ' +
            'wait a minute and try again.',
        );
      } else if (res.status === 403) {
        setPending(res.data?.detail || 'Your account is awaiting approval by a sales executive.');
      } else if (res.status >= 500) {
        setError(res.data?.detail || 'The server hit an error. Check the backend logs.');
      } else {
        setError(res.data?.detail || 'Invalid email or password.');
      }
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
          {pending && (
            <Alert severity="info" variant="outlined">
              {pending}
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

        <Typography sx={{ textAlign: 'center', color: 'text.secondary', fontSize: 13, mt: 3 }}>
          Don't have an account?{' '}
          <Box
            component={RouterLink}
            to="/signup"
            sx={{ color: LINK_BLUE, fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Request access
          </Box>
        </Typography>

        <Typography sx={{ textAlign: 'center', color: 'text.secondary', fontSize: 11.5, mt: 1.5 }}>
          Access is limited to authorized Carewell Aviation sales staff.
        </Typography>
      </MotionBox>
    </Box>
  );
}
