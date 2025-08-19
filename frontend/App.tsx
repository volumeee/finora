import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { TenantProvider } from '@/contexts/TenantContext';
import AuthLayout from '@/components/layouts/AuthLayout';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import AcceptInvitePage from '@/pages/auth/AcceptInvitePage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import TransactionsPage from '@/pages/transactions/TransactionsPage';
import AccountsPage from '@/pages/accounts/AccountsPage';
import CategoriesPage from '@/pages/categories/CategoriesPage';
import GoalsPage from '@/pages/goals/GoalsPage';
import CalculatorsPage from '@/pages/calculators/CalculatorsPage';
import ReportsPage from '@/pages/reports/ReportsPage';
import SettingsPage from '@/pages/settings/SettingsPage';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                {/* Auth Routes */}
                <Route path="/auth" element={<AuthLayout />}>
                  <Route path="login" element={<LoginPage />} />
                  <Route path="register" element={<RegisterPage />} />
                  <Route path="accept-invite/:token" element={<AcceptInvitePage />} />
                </Route>

                {/* Protected Dashboard Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<DashboardPage />} />
                  <Route path="transactions" element={<TransactionsPage />} />
                  <Route path="accounts" element={<AccountsPage />} />
                  <Route path="categories" element={<CategoriesPage />} />
                  <Route path="goals" element={<GoalsPage />} />
                  <Route path="calculators" element={<CalculatorsPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                {/* Redirect root to dashboard */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              <Toaster />
            </div>
          </Router>
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
