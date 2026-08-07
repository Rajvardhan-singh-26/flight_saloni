import { BrowserRouter, Navigate, Route, Routes, useLocation, type Location } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import QuoteGeneratorPage from './pages/QuoteGeneratorPage';
import AircraftDetailsPage from './pages/AircraftDetailsPage';
import AircraftPage from './pages/AircraftPage';
import CustomersPage from './pages/CustomersPage';
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
