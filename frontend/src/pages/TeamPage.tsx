import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import CheckIcon from '@mui/icons-material/Check';
import BlockIcon from '@mui/icons-material/Block';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import DashboardLayout from '../components/DashboardLayout';
import { approveUser, fetchUsers, getSession, rejectUser, revokeUser, type UserProfile } from '../api/client';
import { cardSx, GOLD, NAVY, SERIF } from '../theme';

/** Admin-only: approve, revoke or reject the accounts people sign up with. */
export default function TeamPage() {
  const session = getSession();
  const isAdmin = session?.role === 'admin';
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  const load = () =>
    fetchUsers()
      .then(setUsers)
      .catch(() => setSnack('Could not load the team list.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (isAdmin) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const act = async (id: string, fn: () => Promise<unknown>, message: string) => {
    setBusyId(id);
    try {
      await fn();
      await load();
      setSnack(message);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setSnack(detail || 'That action failed.');
    } finally {
      setBusyId(null);
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <Box sx={{ flex: 1, p: { xs: 2, md: 3.5 } }}>
          <Box sx={cardSx}>
            <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 21, mb: 1 }}>Team</Typography>
            <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
              Only a sales executive can review and approve account requests.
            </Typography>
          </Box>
        </Box>
      </DashboardLayout>
    );
  }

  const pending = users.filter((u) => !u.approved);
  const active = users.filter((u) => u.approved);

  const renderTable = (rows: UserProfile[], showApprove: boolean) => (
    <TableContainer sx={{ borderRadius: 2, border: '1px solid #e8ebf0', overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: NAVY }}>
            {['Name', 'Post', 'Email', 'Role', 'Requested', ''].map((h, i) => (
              <TableCell key={i} sx={{ color: '#fff', fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap' }}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((u, i) => (
            <TableRow key={u.id} sx={{ bgcolor: i % 2 === 1 ? '#f8f9fb' : '#fff' }}>
              <TableCell sx={{ fontSize: 13, fontWeight: 700 }}>{u.name || '—'}</TableCell>
              <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{u.post || '—'}</TableCell>
              <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{u.email}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={u.role}
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    bgcolor: u.role === 'admin' ? '#fdf2e3' : '#eef1f5',
                    color: u.role === 'admin' ? '#9a6a15' : '#4a5568',
                  }}
                />
              </TableCell>
              <TableCell sx={{ fontSize: 12.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {u.created_at ? u.created_at.slice(0, 10) : '—'}
              </TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                {busyId === u.id ? (
                  <CircularProgress size={16} sx={{ color: GOLD }} />
                ) : showApprove ? (
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Button
                      size="small"
                      startIcon={<CheckIcon sx={{ fontSize: 16 }} />}
                      onClick={() => act(u.id, () => approveUser(u.id), `${u.email} approved.`)}
                      sx={{ color: '#122441', bgcolor: GOLD, '&:hover': { bgcolor: '#dbb96a' } }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small"
                      startIcon={<DeleteOutlineIcon sx={{ fontSize: 16 }} />}
                      onClick={() => act(u.id, () => rejectUser(u.id), `${u.email} rejected.`)}
                      sx={{ color: '#b3261e' }}
                    >
                      Reject
                    </Button>
                  </Box>
                ) : (
                  u.email !== session?.email && (
                    <Button
                      size="small"
                      startIcon={<BlockIcon sx={{ fontSize: 16 }} />}
                      onClick={() => act(u.id, () => revokeUser(u.id), `${u.email} access revoked.`)}
                      sx={{ color: '#b3261e' }}
                    >
                      Revoke
                    </Button>
                  )
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <DashboardLayout>
      <Box sx={{ flex: 1, p: { xs: 2, md: 3.5 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Box sx={cardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 0.5 }}>
            <GroupsOutlinedIcon sx={{ color: GOLD, fontSize: 21 }} />
            <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 21, color: 'text.primary' }}>
              Pending Approvals
            </Typography>
            {pending.length > 0 && (
              <Chip size="small" label={pending.length} sx={{ bgcolor: GOLD, color: '#122441', fontWeight: 700 }} />
            )}
          </Box>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>
            People who requested access. They cannot sign in until you approve them.
          </Typography>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress size={26} sx={{ color: GOLD }} />
            </Box>
          )}
          {!loading && pending.length === 0 && (
            <Typography sx={{ fontSize: 13.5, color: '#9aa3af', fontStyle: 'italic', py: 3, textAlign: 'center' }}>
              No pending requests.
            </Typography>
          )}
          {!loading && pending.length > 0 && renderTable(pending, true)}
        </Box>

        <Box sx={cardSx}>
          <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: 21, color: 'text.primary', mb: 0.5 }}>
            Active Accounts
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>
            Approved users who can sign in.
          </Typography>
          {!loading && active.length === 0 ? (
            <Typography sx={{ fontSize: 13.5, color: '#9aa3af', fontStyle: 'italic', py: 3, textAlign: 'center' }}>
              No active accounts yet.
            </Typography>
          ) : (
            !loading && renderTable(active, false)
          )}
        </Box>
      </Box>

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
