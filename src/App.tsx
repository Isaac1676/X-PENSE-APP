import { lazy, Suspense, useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { Navigate, Route, Routes } from 'react-router';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/ThemeStore';
import { syncUserStore } from './stores/userStore';

// Chargement du Layout
import Layout from './components/layout/Layout';
import ScrollToTop from './components/ScrollToTop';

// Chargement dynamiques des pages
const BudgetPage = lazy(() => import('./pages/BudgetPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const NotificationPage = lazy(() => import('./pages/NotificationPage'));
const TransactionPage = lazy(() => import('./pages/TransactionPage'));
const ChatBotPage = lazy(() => import('./pages/ChatBotPage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
// const SettingsPage = lazy(() => import('./pages/SettingsPage'));

const App = () => {
  const { user, loading, initialized, initializeAuth } = useAuthStore();
  const { isDarkMode } = useThemeStore();

  // Initialiser l'authentification au démarrage
  useEffect(() => {
    initializeAuth();
    syncUserStore(); // Synchroniser userStore avec authStore

    // initializeGroqClient(); // Désactivé temporairement
  }, [initializeAuth]);

  // Afficher un loader pendant l'initialisation
  if (!initialized || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-neutral-100 dark:bg-neutral-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#3170dd] mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <HelmetProvider>
      <main className={isDarkMode ? 'bg-theme-dark' : 'bg-theme-light'}>
        <Suspense
          fallback={
            <div className="flex justify-center items-center min-h-screen">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#3170dd]"></div>
            </div>
          }
        >
          <Layout>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={user ? <Navigate to="/h" replace /> : <LandingPage />} />
              <Route path="/login" element={user ? <Navigate to="/h" /> : <LoginPage />} />
              <Route path="/register" element={user ? <Navigate to="/h" /> : <RegisterPage />} />
              <Route
                path="/forgot-password"
                element={user ? <Navigate to="/h" /> : <ForgotPasswordPage />}
              />
              <Route path="/h" element={user ? <HomePage /> : <Navigate to="/login" />} />
              <Route
                path="/h/profile"
                element={user ? <ProfilePage /> : <Navigate to="/login" />}
              />
              <Route
                path="/h/budgets/:budgetID"
                element={user ? <BudgetPage /> : <Navigate to="/login" />}
              />
              {/* <Route
                path="/h/settings"
                element={user ? <SettingsPage /> : <Navigate to="/login" />}
              /> */}
              <Route
                path="/h/dashboard"
                element={user ? <DashboardPage /> : <Navigate to="/login" />}
              />
              <Route
                path="/h/notifications"
                element={user ? <NotificationPage /> : <Navigate to="/login" />}
              />
              <Route
                path="/h/budgets"
                element={user ? <CategoriesPage /> : <Navigate to="/login" />}
              />
              <Route path="/h/chat" element={user ? <ChatBotPage /> : <Navigate to="/login" />} />
              <Route
                path="/h/transactions"
                element={user ? <TransactionPage /> : <Navigate to="/login" />}
              />
            </Routes>
          </Layout>
          <ToastContainer />
        </Suspense>
      </main>
    </HelmetProvider>
  );
};

export default App;
