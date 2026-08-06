import { createTheme } from '@mui/material/styles';

/** Dashboard palette matching the Figma design: deep navy, classic gold, white sheets. */
export const NAVY = '#122441';
export const NAVY_DEEP = '#0b1730';
export const SIDEBAR_BG = '#0e1c38';
export const GOLD = '#c9a24b';
export const GOLD_SOFT = '#e3cf9e';
export const LINK_BLUE = '#2563eb';
export const PAGE_BG = '#eef1f5';

export const SERIF = '"Cormorant Garamond", Georgia, serif';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: NAVY, light: '#1b3661', dark: NAVY_DEEP },
    secondary: { main: GOLD, light: GOLD_SOFT, dark: '#a5813a' },
    background: { default: PAGE_BG, paper: '#ffffff' },
    text: { primary: '#1a2233', secondary: '#6b7482' },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    h1: { fontFamily: SERIF, fontWeight: 600 },
    h2: { fontFamily: SERIF, fontWeight: 600 },
    h3: { fontFamily: SERIF, fontWeight: 600 },
    h4: { fontFamily: SERIF, fontWeight: 600 },
    h5: { fontFamily: SERIF, fontWeight: 700 },
    h6: { fontFamily: SERIF, fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 9, paddingInline: 18 },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', fullWidth: true },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 9,
            background: '#fff',
            '& fieldset': { borderColor: '#e2e6ec' },
            '&:hover fieldset': { borderColor: '#c9d0da' },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
});

/** White form card, soft shadow, rounded — the design's card surface. */
export const cardSx = {
  bgcolor: '#fff',
  borderRadius: 3.5,
  border: '1px solid #e8ebf0',
  boxShadow: '0 6px 24px rgba(18,36,65,0.06)',
  p: { xs: 2, md: 3 },
} as const;
