import { BrowserRouter, Navigate, Route, Routes, useLocation, type Location } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import QuoteGeneratorPage from './pages/QuoteGeneratorPage';
import AircraftDetailsPage from './pages/AircraftDetailsPage';
import AircraftPage from './pages/AircraftPage';
import CustomersPage from './pages/CustomersPage';
import SignupPage from './pages/SignupPage';
import TeamPage from './pages/TeamPage';
import ComingSoonPage from './pages/ComingSoonPage';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { getSession } from './api/client';

/** Redirects to the sales login when no session exists, remembering where
 * the user was headed so LoginPage can send them back after signing in. */
function RequireAuth({ children }: { children: React.ReactElement }) {
  const location = useLocation();
  return getSession() ? children : <Navigate to="/login" state={{ from: location }} replace />;
}

function AppRoutes() {
  const location = useLocation();
  const backgroundLocation = (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation;

  return (
    <>
      {/* Base layer. When the aircraft popup is open it renders against the
       * page the user came from, so that page stays visible (and keeps its
       * form state) behind the modal instead of unmounting. */}
      <Routes location={backgroundLocation ?? location}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/quote"
          element={
            <RequireAuth>
              <QuoteGeneratorPage />
            </RequireAuth>
          }
        />
        <Route
          path="/aircraft"
          element={
            <RequireAuth>
              <AircraftPage />
            </RequireAuth>
          }
        />
        {/* Opening /aircraft/:id directly (no background location, e.g. a
         * pasted link or refresh) shows the fleet page behind the popup. */}
        <Route
          path="/aircraft/:id"
          element={
            <RequireAuth>
              <AircraftPage />
            </RequireAuth>
          }
        />
        <Route
          path="/customers"
          element={
            <RequireAuth>
              <CustomersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/team"
          element={
            <RequireAuth>
              <TeamPage />
            </RequireAuth>
          }
        />

        {/* Sections that are navigable but not built yet — placeholders so the
         * sidebar never leads to a dead end. */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <ComingSoonPage
                title="Dashboard"
                icon={<GridViewOutlinedIcon />}
                description="An at-a-glance view of your charter business — quotations issued, conversion rate and revenue over time."
                planned={[
                  'Quotes issued and accepted this month',
                  'Revenue by aircraft category',
                  'Most requested routes and customers',
                ]}
              />
            </RequireAuth>
          }
        />
        <Route
          path="/previous-quotes"
          element={
            <RequireAuth>
              <ComingSoonPage
                title="Previous Quotes"
                icon={<DescriptionOutlinedIcon />}
                description="Every quotation you've generated, searchable and re-openable. Quotes are already being saved — this page will surface them."
                planned={[
                  'Search by client, route or quote reference',
                  'Re-download or re-share any past PDF',
                  'Duplicate a quote as the basis for a new one',
                ]}
              />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <ComingSoonPage
                title="Settings"
                icon={<SettingsOutlinedIcon />}
                description="Company branding, default charges and quotation defaults, all editable without touching configuration files."
                planned={[
                  'Company logo, contact details and footer text',
                  'Default landing, handling and fuel charges',
                  'Default currency, tax rate and terms & conditions',
                ]}
              />
            </RequireAuth>
          }
        />
      </Routes>

      {/* Modal layer, drawn on top of whatever the base layer rendered. */}
      <Routes>
        <Route
          path="/aircraft/:id"
          element={
            <RequireAuth>
              <AircraftDetailsPage />
            </RequireAuth>
          }
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
