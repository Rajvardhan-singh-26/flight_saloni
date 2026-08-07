import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ViewColumnIcon from '@mui/icons-material/ViewColumnOutlined';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';

import DashboardLayout from '../components/DashboardLayout';
import { createCustomer, deleteCustomer, fetchCustomers, updateCustomer, type CustomerFieldsPayload } from '../api/client';
import { CURRENCY_SYMBOLS } from '../hooks/usePricing';
import { CUSTOMER_STATUSES, type Customer } from '../types';
import { cardSx, GOLD, NAVY, SERIF } from '../theme';

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  New: { bg: '#eef1f5', fg: '#4a5568' },
  Contacted: { bg: '#e8f0fe', fg: '#1a56c4' },
  Quoted: { bg: '#fdf2e3', fg: '#9a6a15' },
  Confirmed: { bg: '#e8f7ee', fg: '#1e7e42' },
  Lost: { bg: '#fbeae9', fg: '#b3261e' },
};

/** Editable free-text columns, in display order. Quotes / Business Done /
 * Last Quote are here too — they're normally maintained automatically from
 * generated quotes, but a salesperson can correct them by hand. */
const TEXT_FIELDS = [
  { key: 'name', label: 'Name', placeholder: 'Client name', type: 'text' },
  { key: 'company', label: 'Company', placeholder: 'Company', type: 'text' },
  { key: 'phone', label: 'Phone', placeholder: 'Phone', type: 'text' },
  { key: 'email', label: 'Email', placeholder: 'Email', type: 'text' },
  { key: 'quote_count', label: 'Quotes', placeholder: '0', type: 'number' },
  { key: 'total_value', label: 'Business Done', placeholder: '0', type: 'number' },
  { key: 'last_quote_date', label: 'Last Quote', placeholder: '', type: 'date' },
] as const;

type TextFieldKey = (typeof TEXT_FIELDS)[number]['key'];

/** Numeric columns must be coerced before they go back to the API. */
const NUMERIC_FIELDS = new Set<TextFieldKey>(['quote_count', 'total_value']);

// Status sits after the four contact fields, before the quote stats.
const ALL_COLUMNS = [
  ...TEXT_FIELDS.slice(0, 4).map((f) => ({ key: f.key as string, label: f.label })),
  { key: 'status', label: 'Status' },
  ...TEXT_FIELDS.slice(4).map((f) => ({ key: f.key as string, label: f.label })),
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);
  const [colMenuAnchor, setColMenuAnchor] = useState<HTMLElement | null>(null);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', company: '', phone: '', email: '', status: 'New' });
  // Local drafts so typing doesn't PATCH on every keystroke — committed on blur.
  const [drafts, setDrafts] = useState<Record<string, Partial<Record<TextFieldKey, string>>>>({});

  const visibleColumns = useMemo(() => ALL_COLUMNS.filter((c) => !hiddenCols.has(c.key)), [hiddenCols]);

  useEffect(() => {
    fetchCustomers()
      .then(setCustomers)
      .catch(() => setSnack('Could not load customers — is the backend running on port 8000?'))
      .finally(() => setLoading(false));
  }, []);

  const draftValue = (c: Customer, key: TextFieldKey) => drafts[c.id]?.[key] ?? String(c[key] ?? '');

  const setDraft = (id: string, key: TextFieldKey, value: string) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [key]: value } }));

  const commit = async (c: Customer, key: TextFieldKey) => {
    const next = drafts[c.id]?.[key];
    if (next === undefined || next === String(c[key] ?? '')) return;
    // Numeric columns go back as numbers, not strings, or the API rejects them.
    const value = NUMERIC_FIELDS.has(key) ? Number(next) || 0 : next;
    await save(c.id, { [key]: value } as CustomerFieldsPayload, () =>
      setDrafts((d) => ({ ...d, [c.id]: { ...d[c.id], [key]: String(c[key] ?? '') } })),
    );
  };

  const save = async (id: string, payload: CustomerFieldsPayload, onError?: () => void) => {
    setSavingId(id);
    try {
      const updated = await updateCustomer(id, payload);
      setCustomers((list) => list.map((c) => (c.id === id ? updated : c)));
      setDrafts((d) => ({ ...d, [id]: {} }));
    } catch {
      setSnack('Could not save changes.');
      onError?.();
    } finally {
      setSavingId(null);
    }
  };

  const handleAdd = async () => {
    if (!newCustomer.name.trim()) {
      setSnack('Enter a name for the customer.');
      return;
    }
    setAdding(true);
    try {
      const created = await createCustomer(newCustomer);
      setCustomers((list) => [created, ...list]);
      setAddOpen(false);
      setNewCustomer({ name: '', company: '', phone: '', email: '', status: 'New' });
      setSnack(`${created.name} added to customers.`);
    } catch {
      setSnack('Could not add that customer.');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    const target = confirmDelete;
    setConfirmDelete(null);
    if (!target) return;
    try {
      await deleteCustomer(target.id);
      setCustomers((list) => list.filter((c) => c.id !== target.id));
      setSnack(`${target.name} removed from customers.`);
    } catch {
      setSnack('Could not remove that customer.');
    }
  };

  const handleDownloadCsv = () => {
    const escape = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const cell = (c: Customer, key: string) =>
      key === 'total_value' ? `${c.currency} ${c.total_value}` : String(c[key as keyof Customer] ?? '');
    const header = visibleColumns.map((col) => col.label).join(',');
    const rows = customers.map((c) => visibleColumns.map((col) => escape(cell(c, col.key))).join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carewell-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderCell = (c: Customer, key: string) => {
    const textField = TEXT_FIELDS.find((f) => f.key === key);
    if (textField) {
      const isMoney = textField.key === 'total_value';
      return (
        <TextField
          size="small"
          type={textField.type}
          value={draftValue(c, textField.key)}
          onChange={(e) => setDraft(c.id, textField.key, e.target.value)}
          onBlur={() => commit(c, textField.key)}
          disabled={savingId === c.id}
          placeholder={textField.placeholder}
          fullWidth
          slotProps={{
            htmlInput: {
              min: textField.type === 'number' ? 0 : undefined,
              step: isMoney ? 'any' : undefined,
              style: textField.type === 'number' ? { textAlign: 'right' } : undefined,
            },
            // Show the currency alongside the money figure so the number
            // isn't ambiguous while it's being edited.
            input: isMoney
              ? {
                  startAdornment: (
                    <Box component="span" sx={{ fontSize: 12, color: 'text.secondary', mr: 0.6 }}>
                      {CURRENCY_SYMBOLS[c.currency] ?? c.currency}
                    </Box>
                  ),
                }
              : undefined,
          }}
        />
      );
    }
    if (key === 'status') {
      return (
        <TextField
          select
          size="small"
          value={c.status}
          onChange={(e) => save(c.id, { status: e.target.value })}
          disabled={savingId === c.id}
          fullWidth
          slotProps={{
            select: {
              renderValue: (v) => (
                <Box
                  sx={{
                    display: 'inline-block', px: 1, py: 0.2, borderRadius: 1, fontSize: 12, fontWeight: 700,
                    bgcolor: STATUS_COLORS[v as string]?.bg ?? '#eef1f5',
                    color: STATUS_COLORS[v as string]?.fg ?? '#4a5568',
                  }}
                >
                  {v as string}
                </Box>
              ),
            },
          }}
        >
          {CUSTOMER_STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
      );
    }
    return null;
  };

  return (
    <DashboardLayout>
      <Box sx={{ flex: 1, p: { xs: 2, md: 3.5 } }}>
        <Box sx={cardSx}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <PeopleAltOutlinedIcon sx={{ color: GOLD, fontSize: 21 }} />
                <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 21, color: 'text.primary' }}>
                  Customers
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>
                Every field is editable — click a cell to change it. Business Done totals the grand total of each
                saved quotation.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                onClick={(e) => setColMenuAnchor(e.currentTarget)}
                startIcon={<ViewColumnIcon sx={{ fontSize: 18 }} />}
                variant="outlined"
                sx={{ borderColor: '#d6dbe3', color: 'text.primary' }}
              >
                Columns
              </Button>
              <Menu anchorEl={colMenuAnchor} open={!!colMenuAnchor} onClose={() => setColMenuAnchor(null)}>
                {ALL_COLUMNS.map((col) => (
                  <MenuItem
                    key={col.key}
                    onClick={() =>
                      setHiddenCols((prev) => {
                        const next = new Set(prev);
                        if (next.has(col.key)) next.delete(col.key);
                        else next.add(col.key);
                        return next;
                      })
                    }
                  >
                    <Checkbox checked={!hiddenCols.has(col.key)} size="small" sx={{ p: 0, mr: 1 }} />
                    <ListItemText primaryTypographyProps={{ fontSize: 14 }}>{col.label}</ListItemText>
                  </MenuItem>
                ))}
              </Menu>
              <Button
                onClick={handleDownloadCsv}
                disabled={customers.length === 0}
                startIcon={<DownloadIcon sx={{ fontSize: 18 }} />}
                variant="outlined"
                sx={{ borderColor: '#d6dbe3', color: 'text.primary' }}
              >
                Download CSV
              </Button>
              <Button
                onClick={() => setAddOpen(true)}
                startIcon={<PersonAddAltIcon sx={{ fontSize: 18 }} />}
                sx={{ color: '#122441', bgcolor: GOLD, '&:hover': { bgcolor: '#dbb96a' } }}
              >
                Add Customer
              </Button>
            </Box>
          </Box>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={26} sx={{ color: GOLD }} />
            </Box>
          )}

          {!loading && customers.length === 0 && (
            <Typography sx={{ fontSize: 13.5, color: '#9aa3af', fontStyle: 'italic', py: 4, textAlign: 'center' }}>
              No customers yet — generate a quotation and choose “Add to customers” when prompted.
            </Typography>
          )}

          {!loading && customers.length > 0 && (
            <TableContainer sx={{ borderRadius: 2, border: '1px solid #e8ebf0', overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: NAVY }}>
                    {visibleColumns.map((col) => (
                      <TableCell key={col.key} sx={{ color: '#fff', fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap' }}>
                        {col.label}
                      </TableCell>
                    ))}
                    <TableCell sx={{ width: 48 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customers.map((c, i) => (
                    <TableRow key={c.id} sx={{ bgcolor: i % 2 === 1 ? '#f8f9fb' : '#fff' }}>
                      {visibleColumns.map((col) => (
                        <TableCell
                          key={col.key}
                          sx={{
                            minWidth: NUMERIC_FIELDS.has(col.key as TextFieldKey)
                              ? 120
                              : col.key === 'last_quote_date'
                                ? 150
                                : TEXT_FIELDS.some((f) => f.key === col.key)
                                  ? 150
                                  : undefined,
                          }}
                        >
                          {renderCell(c, col.key)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Tooltip title="Remove customer">
                          <IconButton size="small" onClick={() => setConfirmDelete(c)} sx={{ color: '#b3261e' }}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Box>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 19 }}>Add Customer</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>
            <TextField
              label="Name"
              required
              autoFocus
              size="small"
              value={newCustomer.name}
              onChange={(e) => setNewCustomer((v) => ({ ...v, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Company"
              size="small"
              value={newCustomer.company}
              onChange={(e) => setNewCustomer((v) => ({ ...v, company: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Phone"
              size="small"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer((v) => ({ ...v, phone: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              size="small"
              value={newCustomer.email}
              onChange={(e) => setNewCustomer((v) => ({ ...v, email: e.target.value }))}
              fullWidth
            />
            <TextField
              select
              label="Status"
              size="small"
              value={newCustomer.status}
              onChange={(e) => setNewCustomer((v) => ({ ...v, status: e.target.value }))}
              fullWidth
            >
              {CUSTOMER_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddOpen(false)} disabled={adding} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={adding}
            startIcon={adding ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ color: '#122441', bgcolor: GOLD, '&:hover': { bgcolor: '#dbb96a' } }}
          >
            Add Customer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle sx={{ fontFamily: SERIF, fontWeight: 700 }}>Remove customer?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 14 }}>
            {confirmDelete?.name} will be removed from your customer list. Quotations already generated for them
            are not affected.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDelete(null)} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button onClick={handleDelete} sx={{ color: '#fff', bgcolor: '#b3261e', '&:hover': { bgcolor: '#8f1e18' } }}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={4200}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnack(null)} severity="info" variant="filled" sx={{ bgcolor: '#122441' }}>
          {snack}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
