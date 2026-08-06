import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import QuoteGeneratorPage from './pages/QuoteGeneratorPage';
import { getSession } from './api/client';

/** Redirects to the sales login when no session exists. */
function RequireAuth({ children }: { children: React.ReactElement }) {
  return getSession() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
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
      </Routes>
    </BrowserRouter>
  );
}
