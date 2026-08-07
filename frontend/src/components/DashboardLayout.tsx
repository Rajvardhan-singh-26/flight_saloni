import { useState } from 'react';
import { Avatar, Badge, Box, InputBase, Tooltip, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FlightIcon from '@mui/icons-material/Flight';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import { useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { getSession, logout } from '../api/client';
import { GOLD, SIDEBAR_BG } from '../theme';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <GridViewOutlinedIcon /> },
  { label: 'Generate Quote', icon: <AutoAwesomeIcon />, path: '/quote' },
  { label: 'Aircraft', icon: <FlightIcon sx={{ transform: 'rotate(45deg)' }} />, path: '/aircraft' },
  { label: 'Customers', icon: <PeopleAltOutlinedIcon />, path: '/customers' },
  { label: 'Previous Quotes', icon: <DescriptionOutlinedIcon /> },
  { label: 'Settings', icon: <SettingsOutlinedIcon /> },
];

const SIDEBAR_WIDTH = 250;
const SIDEBAR_RAIL = 62;

/** Dashboard shell matching the design: dark navy sidebar + white topbar.
 * The sidebar collapses to an icon rail (VS Code style) via the topbar toggle. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();
  const [collapsed, setCollapsed] = useState(false);
  const initials = (session?.name ?? 'SE')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar — full width, or a narrow icon-only rail when collapsed */}
      <Box
        sx={{
          width: { xs: 0, md: collapsed ? SIDEBAR_RAIL : SIDEBAR_WIDTH },
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          bgcolor: SIDEBAR_BG,
          color: '#fff',
          position: 'sticky',
          top: 0,
          height: '100vh',
          flexShrink: 0,
          overflowX: 'hidden',
          transition: 'width .2s ease',
        }}
      >
        <Box
          sx={{
            px: collapsed ? 0 : 2.5,
            py: 2.6,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          <BrandLogo light compact iconOnly={collapsed} />
        </Box>

        <Box sx={{ flex: 1, py: 2, px: collapsed ? 0.8 : 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {NAV_ITEMS.map((item) => {
            // Prefix match so nested routes (e.g. /aircraft/:id with the
            // details popup open) keep their section highlighted.
            const active =
              !!item.path &&
              (location.pathname === item.path || location.pathname.startsWith(`${item.path}/`));
            return (
              <Tooltip key={item.label} title={collapsed ? item.label : ''} placement="right" arrow>
                <Box
                  onClick={() => item.path && navigate(item.path)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: collapsed ? 0 : 1.5,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    px: collapsed ? 0 : 1.8,
                    py: 1.15,
                    borderRadius: 2.5,
                    cursor: active ? 'default' : item.path ? 'pointer' : 'default',
                    color: active ? GOLD : 'rgba(255,255,255,0.62)',
                    bgcolor: active ? 'rgba(201,162,75,0.10)' : 'transparent',
                    borderLeft: collapsed
                      ? '3px solid transparent'
                      : active
                        ? `3px solid ${GOLD}`
                        : '3px solid transparent',
                    fontWeight: active ? 700 : 500,
                    fontSize: 14.5,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    transition: 'background .15s, color .15s',
                    '&:hover': active ? {} : item.path ? { bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.85)' } : {},
                    '& svg': { fontSize: 20, flexShrink: 0 },
                  }}
                >
                  {item.icon}
                  {!collapsed && item.label}
                </Box>
              </Tooltip>
            );
          })}
        </Box>

        <Tooltip title={collapsed ? 'Sign Out' : ''} placement="right" arrow>
          <Box
            onClick={() => {
              logout();
              navigate('/login');
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : 1.5,
              justifyContent: collapsed ? 'center' : 'flex-start',
              px: collapsed ? 0 : 3.2,
              py: 2.2,
              borderTop: '1px solid rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: 14.5,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              '&:hover': { color: '#fff' },
              '& svg': { fontSize: 19, flexShrink: 0 },
            }}
          >
            <LogoutIcon />
            {!collapsed && 'Sign Out'}
          </Box>
        </Tooltip>
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
          {/* Sidebar toggle (VS Code style) */}
          <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <Box
              onClick={() => setCollapsed((c) => !c)}
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                justifyContent: 'center',
                width: 34,
                height: 34,
                borderRadius: 2,
                cursor: 'pointer',
                color: '#6b7482',
                flexShrink: 0,
                '&:hover': { bgcolor: '#f1f3f7', color: '#122441' },
              }}
            >
              <MenuIcon sx={{ fontSize: 21 }} />
            </Box>
          </Tooltip>

          {/* Brand stays visible in the topbar at all times */}
          <Box sx={{ flexShrink: 0 }}>
            <BrandLogo compact />
          </Box>

          <Box
            sx={{
              flex: 1,
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              gap: 1,
              maxWidth: 420,
              color: 'text.secondary',
            }}
          >
            <SearchIcon sx={{ fontSize: 20, color: '#9aa3af' }} />
            <InputBase placeholder="Search quotations, clients, aircraft..." sx={{ flex: 1, fontSize: 14.5 }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
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
