import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, TextField, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { AnimatePresence, motion } from 'framer-motion';
import { extractFromText } from '../api/client';
import type { AIExtractionResult } from '../types';
import { cardSx, GOLD, SERIF } from '../theme';

const EXAMPLE =
  'Mr. Sharma requires a private charter from Delhi to Mumbai on 15 August for six passengers. ' +
  'Preferred aircraft is a midsize jet. Estimated flying time is 2.5 hours.';

interface Props {
  onExtracted: (result: AIExtractionResult) => void;
}

/** "AI Quote Assistant" card — paste a request, the LLM fills the form. */
export default function AIRequestForm({ onExtracted }: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleExtract = async () => {
    setLoading(true);
    setError(null);
    setDone(false);
    try {
      const result = await extractFromText(text);
      onExtracted(result);
      setDone(true);
    } catch {
      setError('Extraction failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ ...cardSx, border: `1px solid ${GOLD}55`, background: 'linear-gradient(135deg, #fffdf7, #fff)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1 }}>
        <AutoAwesomeIcon sx={{ color: GOLD, fontSize: 21 }} />
        <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 21, color: 'text.primary' }}>
          AI Quote Assistant
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 13.5, color: 'text.secondary', mb: 1.5 }}>
        Paste the client's request in plain language — AI fills the entire form and picks a matching aircraft.{' '}
        <Box
          component="span"
          onClick={() => setText(EXAMPLE)}
          sx={{ color: GOLD, fontWeight: 700, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
        >
          Try an example
        </Box>
      </Typography>

      <TextField
        value={text}
        onChange={(e) => setText(e.target.value)}
        multiline
        minRows={3}
        placeholder="e.g. Mr. Sharma requires a charter from Delhi to Mumbai on 15 August for six passengers…"
        fullWidth
      />

      <Button
        variant="contained"
        disabled={text.trim().length < 5 || loading}
        onClick={handleExtract}
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
        sx={{
          mt: 1.5,
          bgcolor: 'primary.main',
          px: 3,
          py: 1.1,
          '&:hover': { bgcolor: 'primary.light' },
        }}
      >
        {loading ? 'Extracting…' : 'Extract with AI'}
      </Button>

      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Alert severity="success" variant="outlined" sx={{ mt: 1.5 }}>
              Details extracted and applied — review the form below.
            </Alert>
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Alert severity="error" variant="outlined" sx={{ mt: 1.5 }}>
              {error}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
