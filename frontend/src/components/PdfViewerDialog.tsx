import { Box, Button, Dialog, DialogContent, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import { GOLD, NAVY } from '../theme';

interface Props {
  open: boolean;
  blobUrl: string | null;
  quoteId: string;
  onClose: () => void;
}

/** Embedded PDF viewer with Download and Print actions. */
export default function PdfViewerDialog({ open, blobUrl, quoteId, onClose }: Props) {
  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `Carewell-Quote-${quoteId}.pdf`;
    a.click();
  };

  const handlePrint = () => {
    if (!blobUrl) return;
    const win = window.open(blobUrl, '_blank');
    win?.addEventListener('load', () => win.print());
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        // overflow: hidden clips every child (header bar, iframe) to these
        // rounded corners consistently — without it, the embedded PDF
        // viewer's own square edges can visually poke past the curve.
        paper: { sx: { height: '92vh', borderRadius: 3, overflow: 'hidden' } },
      }}
    >
      <Box
        sx={{
          bgcolor: NAVY,
          px: 3,
          py: 1.6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `2px solid ${GOLD}`,
        }}
      >
        <Typography sx={{ color: '#fff', fontWeight: 700 }}>
          Quotation <Box component="span" sx={{ color: GOLD }}>{quoteId}</Box>
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            onClick={handleDownload}
            startIcon={<DownloadIcon />}
            sx={{ color: '#122441', bgcolor: GOLD, '&:hover': { bgcolor: '#e3cf9e' } }}
          >
            Download PDF
          </Button>
          <Button
            onClick={handlePrint}
            startIcon={<PrintIcon />}
            sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}
            variant="outlined"
          >
            Print PDF
          </Button>
          <IconButton onClick={onClose} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>
      <DialogContent sx={{ p: 0, bgcolor: '#3c4556' }}>
        {blobUrl && (
          <iframe
            title="Quote PDF"
            src={blobUrl}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
