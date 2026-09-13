import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import config from '../ai_config.json';
import MainLayout from './layouts/MainLayout';
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
      { index: true, element: <BookingPage /> },
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
      document.documentElement.style.setProperty('--primary-color', config.primary_color || '#EAB308');
      document.documentElement.style.setProperty('--secondary-color', config.secondary_color || '#C85A17');
      document.body.style.backgroundColor = '#12100E';
    }
  }, []);

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
