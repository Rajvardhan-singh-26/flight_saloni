import { Avatar, Badge, Box, InputBase, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FlightIcon from '@mui/icons-material/Flight';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { getSession, logout } from '../api/client';
import { GOLD, SIDEBAR_BG } from '../theme';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <GridViewOutlinedIcon /> },
  { label: 'Generate Quote', icon: <AutoAwesomeIcon />, active: true },
  { label: 'Aircraft', icon: <FlightIcon sx={{ transform: 'rotate(45deg)' }} /> },
  { label: 'Customers', icon: <PeopleAltOutlinedIcon /> },
  { label: 'Previous Quotes', icon: <DescriptionOutlinedIcon /> },
  { label: 'Settings', icon: <SettingsOutlinedIcon /> },
];

/** Dashboard shell matching the design: dark navy sidebar + white topbar. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const session = getSession();
  const initials = (session?.name ?? 'SE')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: { xs: 0, md: 250 },
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          bgcolor: SIDEBAR_BG,
          color: '#fff',
          position: 'sticky',
          top: 0,
          height: '100vh',
          flexShrink: 0,
        }}
      >
        <Box sx={{ px: 2.5, py: 2.6, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <BrandLogo light compact />
        </Box>

        <Box sx={{ flex: 1, py: 2, px: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {NAV_ITEMS.map((item) => (
            <Box
              key={item.label}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 1.8,
                py: 1.15,
                borderRadius: 2.5,
                cursor: item.active ? 'default' : 'pointer',
                color: item.active ? GOLD : 'rgba(255,255,255,0.62)',
                bgcolor: item.active ? 'rgba(201,162,75,0.10)' : 'transparent',
                borderLeft: item.active ? `3px solid ${GOLD}` : '3px solid transparent',
                fontWeight: item.active ? 700 : 500,
                fontSize: 14.5,
                transition: 'background .15s, color .15s',
                '&:hover': item.active ? {} : { bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.85)' },
                '& svg': { fontSize: 20 },
              }}
            >
              {item.icon}
              {item.label}
            </Box>
          ))}
        </Box>

        <Box
          onClick={() => {
            logout();
            navigate('/login');
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 3.2,
            py: 2.2,
            borderTop: '1px solid rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            fontSize: 14.5,
            '&:hover': { color: '#fff' },
            '& svg': { fontSize: 19 },
          }}
        >
          <LogoutIcon />
          Sign Out
        </Box>
      </Box>

      {/* Main area */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: { xs: 2, md: 3.5 },
            py: 1.4,
            bgcolor: '#fff',
            borderBottom: '1px solid #e8ebf0',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            <BrandLogo compact />
          </Box>
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              maxWidth: 520,
              color: 'text.secondary',
            }}
          >
            <SearchIcon sx={{ fontSize: 20, color: '#9aa3af' }} />
            <InputBase placeholder="Search quotations, clients, aircraft..." sx={{ flex: 1, fontSize: 14.5 }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Badge variant="dot" sx={{ '& .MuiBadge-badge': { bgcolor: GOLD } }}>
              <NotificationsNoneIcon sx={{ color: '#8a93a1', fontSize: 23 }} />
            </Badge>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, pl: 1.5, borderLeft: '1px solid #e8ebf0' }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: GOLD, color: '#122441', fontSize: 14, fontWeight: 700 }}>
                {initials}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>
                  {session?.name ?? 'Sales Executive'}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>Charter Consultant</Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {children}
      </Box>
    </Box>
  );
}
