import { Suspense, lazy, memo } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { JobSelectionProvider } from './context/JobSelectionContext'
import { InsuranceProvider } from './context/InsuranceContext'
import AppLayout from './components/layout/AppLayout'
import Spinner from './components/ui/Spinner'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles/mobile-responsive.css'

const LoginPage = lazy(() => import('./pages/Login'))
const DashboardClient = lazy(() => import('./pages/DashboardClient'))
const DashboardAdmin = lazy(() => import('./pages/DashboardAdmin'))
const InsuranceDashboard = lazy(() => import('./pages/InsuranceDashboard'))
const ClaimsManagement = lazy(() => import('./pages/ClaimsManagement'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const MessagesHistory = lazy(() => import('./pages/MessagesHistory'))
const JobsPage = lazy(() => import('./pages/Jobs'))
const CandidatesPage = lazy(() => import('./pages/Candidates'))
const ResumeUploadPage = lazy(() => import('./pages/ResumeUploadNew'))
// const ToolkitPage = lazy(() => import('./pages/Toolkit'))
const WalletPage = lazy(() => import('./pages/Wallet'))
const AnalyticsPage = lazy(() => import('./pages/Analytics'))
const EmailHistoryPage = lazy(() => import('./pages/EmailHistory'))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsers'))
const AdminToolsPricingPage = lazy(() => import('./pages/admin/AdminToolsPricing'))
const AdminTransactionsPage = lazy(() => import('./pages/admin/AdminTransactions'))
const AccessDeniedPage = lazy(() => import('./pages/AccessDenied'))

const ProtectedRoute = memo(function ProtectedRoute({ roles }: { roles?: Array<'admin' | 'client'> }) {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <div className="p-6"><Spinner /></div>
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return <Outlet />
})

function RoleHome() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  
  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />
  }
  
  // Route based on client type
  if (user.client_type === 'insurance') {
    return <Navigate to="/insurance" replace />
  }
  
  return <Navigate to="/dashboard" replace /> // Default to HR dashboard
}

export default function App() {
  return (
    <ErrorBoundary>
      <Toaster position="top-right" />
      <AuthProvider>
        <InsuranceProvider>
        <JobSelectionProvider>
        <Suspense fallback={<div className="p-6"><Spinner /></div>}>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />

          <Route element={<ProtectedRoute />}> 
            <Route element={<AppLayout />}> 
              <Route path="/" element={<RoleHome />} />
              
              {/* HR Dashboard Routes */}
              <Route path="/dashboard" element={<DashboardClient />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/candidates" element={<CandidatesPage />} />
              <Route path="/upload" element={<ResumeUploadPage />} />
              <Route path="/emails" element={<EmailHistoryPage />} />
              
              {/* Insurance Dashboard Routes */}
              <Route path="/insurance" element={<InsuranceDashboard />} />
              <Route path="/insurance/customers" element={<InsuranceDashboard />} />
              <Route path="/insurance/policies" element={<InsuranceDashboard />} />
              <Route path="/insurance/renewals" element={<InsuranceDashboard />} />
              <Route path="/insurance/claims" element={<ClaimsManagement />} />
              <Route path="/insurance/messages" element={<MessagesHistory />} />
              <Route path="/insurance/reports" element={<ReportsPage />} />
              
              {/* Shared Routes */}
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />

              <Route element={<ProtectedRoute roles={[ 'admin' ]} />}> 
                <Route path="/admin" element={<DashboardAdmin />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/tools-pricing" element={<AdminToolsPricingPage />} />
                <Route path="/admin/transactions" element={<AdminTransactionsPage />} />
              </Route>
            </Route>
          </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </JobSelectionProvider>
        </InsuranceProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
