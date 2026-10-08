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
      document.documentElement.style.setProperty('--primary-color', config.primary_color);
      document.documentElement.style.setProperty('--secondary-color', config.secondary_color);
      
      const isMarcianos = config.app_name?.toLowerCase().includes('marcianos');
      const bgColor = isMarcianos ? '#020617' : (config.secondary_color || '#f9fafb');
      document.body.style.backgroundColor = bgColor;
    }
  }, []);

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
