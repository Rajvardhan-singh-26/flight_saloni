import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, InputAdornment, TextField, Typography } from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import { motion } from 'framer-motion';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { signup } from '../api/client';
import { GOLD, LINK_BLUE } from '../theme';

const MotionBox = motion.create(Box);

/** Request an account. Signup never signs you in — a sales executive has to
 * approve the account first, which the success state makes explicit. */
export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [post, setPost] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signup({ name, post, email, password });
      setSubmitted(true);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'Could not create the account. Is the backend running?');
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
          maxWidth: 440,
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

        {submitted ? (
          <Box sx={{ textAlign: 'center' }}>
            <MarkEmailReadOutlinedIcon sx={{ fontSize: 46, color: GOLD, mb: 1 }} />
            <Typography variant="h5" sx={{ color: 'primary.main', mb: 1 }}>
              Request submitted
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 14, mb: 3, lineHeight: 1.7 }}>
              Your account for <strong>{email}</strong> has been created and is awaiting approval by a sales
              executive. You'll be able to sign in as soon as it's approved.
            </Typography>
            <Button fullWidth variant="contained" onClick={() => navigate('/login')} sx={{ py: 1.2 }}>
              Back to Sign In
            </Button>
          </Box>
        ) : (
          <>
            <Typography variant="h5" sx={{ textAlign: 'center', color: 'primary.main', mb: 0.5 }}>
              Request Access
            </Typography>
            <Typography sx={{ textAlign: 'center', color: 'text.secondary', fontSize: 13.5, mb: 3.5 }}>
              New accounts are reviewed by a sales executive before activation.
            </Typography>

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.2 }}>
              <TextField
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineIcon sx={{ fontSize: 19 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                label="Post / Job Title"
                placeholder="e.g. Charter Consultant"
                value={post}
                onChange={(e) => setPost(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeOutlinedIcon sx={{ fontSize: 19 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
                helperText="At least 8 characters"
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
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <HowToRegIcon />}
                sx={{ py: 1.3, bgcolor: 'primary.main', '&:hover': { bgcolor: '#1b3661' } }}
              >
                {loading ? 'Submitting…' : 'Request Access'}
              </Button>
            </Box>

            <Typography sx={{ textAlign: 'center', color: 'text.secondary', fontSize: 13, mt: 3 }}>
              Already have an account?{' '}
              <Box
                component={RouterLink}
                to="/login"
                sx={{ color: LINK_BLUE, fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                Sign in
              </Box>
            </Typography>
          </>
        )}
      </MotionBox>
    </Box>
  );
}
