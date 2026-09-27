import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../shared/hooks/useAuth';
import { Navbar, Footer } from '../shared/ui/Layout';
import { HomePage } from '../features/menu/HomePage';
import { MenuPage } from '../features/menu/MenuPage';
import { BuilderPage } from '../features/pizza-builder/BuilderPage';
import { CheckoutPage } from '../features/checkout/CheckoutPage';
import { OrdersPage } from '../features/orders/OrdersPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { VerifyPage } from '../features/auth/VerifyPage';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { AdminLoginPage } from '../features/admin/AdminLoginPage';
import { AdminDashboardPage } from '../features/admin/AdminDashboardPage';
import { AdminInventoryPage } from '../features/admin/AdminInventoryPage';
import { AdminOrdersPage } from '../features/admin/AdminOrdersPage';

function Layout() {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-main">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-state"><span className="spinner" /> Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RequireAdmin() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-state"><span className="spinner" /> Loading…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'menu', element: <MenuPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'verify', element: <VerifyPage /> },
      { path: 'forgot', element: <ForgotPasswordPage /> },
      { path: 'reset', element: <ResetPasswordPage /> },
      { path: 'admin/login', element: <AdminLoginPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: 'build', element: <BuilderPage /> },
          { path: 'checkout', element: <CheckoutPage /> },
          { path: 'orders', element: <OrdersPage /> },
        ],
      },
      {
        element: <RequireAdmin />,
        children: [
          { path: 'admin', element: <AdminDashboardPage /> },
          { path: 'admin/inventory', element: <AdminInventoryPage /> },
          { path: 'admin/orders', element: <AdminOrdersPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
