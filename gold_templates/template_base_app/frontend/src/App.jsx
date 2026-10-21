import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import config from '../ai_config.json';
import MainLayout from './layouts/MainLayout';
import LandingPage from './pages/LandingPage';
import BookingPage from './pages/BookingPage';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "agendar", element: <BookingPage /> },
      { path: "login", element: <LoginPage /> },
      {
        path: "admin",
        element: (
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        )
      }
    ]
  }
]);

function App() {
  useEffect(() => {
    if (config) {
      const root = document.documentElement;
      if (config.primary_color) {
        root.style.setProperty('--primary-color', config.primary_color);
      }
      if (config.secondary_color) {
        root.style.setProperty('--secondary-color', config.secondary_color);
      }

      const isLight = config.theme === 'light';
      const bgColor = config.bg_color || (isLight ? '#F8FAFC' : '#0E0D0C');
      const surfaceColor = config.surface_color || (isLight ? '#FFFFFF' : '#181614');
      const borderColor = config.border_color || (isLight ? '#E2E8F0' : '#2E2924');
      const textColor = config.text_color || (isLight ? '#0F172A' : '#F5F4F0');
      const mutedColor = config.muted_color || (isLight ? '#475569' : '#A8A29E');

      root.style.setProperty('--bg-color', bgColor);
      root.style.setProperty('--surface-color', surfaceColor);
      root.style.setProperty('--border-color', borderColor);
      root.style.setProperty('--text-color', textColor);
      root.style.setProperty('--muted-color', mutedColor);

      if (config.font_heading) {
        root.style.setProperty('--font-display', `'${config.font_heading}', Georgia, serif`);
      }
      if (config.font_body) {
        root.style.setProperty('--font-sans', `'${config.font_body}', system-ui, -apple-system, sans-serif`);
      }

      document.body.style.backgroundColor = bgColor;
      document.body.style.color = textColor;
    }
  }, []);

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
