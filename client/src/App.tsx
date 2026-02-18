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

const retryImport = (importFn: () => Promise<any>) => 
  lazy(() => importFn().catch(() => {
    window.location.reload()
    return { default: () => null }
  }))

const LoginPage = retryImport(() => import('./pages/Login'))
const DashboardClient = retryImport(() => import('./pages/DashboardClient'))
const DashboardAdmin = retryImport(() => import('./pages/DashboardAdmin'))
const InsuranceDashboard = retryImport(() => import('./pages/InsuranceDashboard'))
const ClaimsManagement = retryImport(() => import('./pages/ClaimsManagement'))
const ReportsPage = retryImport(() => import('./pages/ReportsPage'))
const MessagesHistory = retryImport(() => import('./pages/MessagesHistory'))
const UpsellCrossSell = retryImport(() => import('./pages/UpsellCrossSell'))
const LeadManagement = retryImport(() => import('./pages/LeadManagement'))
const JobsPage = retryImport(() => import('./pages/Jobs'))
const CandidatesPage = retryImport(() => import('./pages/Candidates'))
const ResumeUploadPage = retryImport(() => import('./pages/ResumeUploadNew'))
const WalletPage = retryImport(() => import('./pages/Wallet'))
const AnalyticsPage = retryImport(() => import('./pages/Analytics'))
const EmailHistoryPage = retryImport(() => import('./pages/EmailHistory'))
const AdminUsersPage = retryImport(() => import('./pages/admin/AdminUsers'))
const AdminToolsPricingPage = retryImport(() => import('./pages/admin/AdminToolsPricing'))
const AdminTransactionsPage = retryImport(() => import('./pages/admin/AdminTransactions'))
const AccessDeniedPage = retryImport(() => import('./pages/AccessDenied'))
const ProfileSelectionPage = retryImport(() => import('./pages/ProfileSelection'))
const DocUploaderPage = retryImport(() => import('./pages/DocUploader'))

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
  
  // Admin users go directly to admin dashboard (no profiles)
  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />
  }
  
  // Insurance clients - check if profile is selected
  if (user.client_type === 'insurance') {
    const hasProfile = localStorage.getItem('activeProfile')
    if (!hasProfile) {
      return <Navigate to="/profiles" replace />
    }
    return <Navigate to="/insurance" replace />
  }
  
  // HR clients go to dashboard (clear any stale insurance profile data)
  localStorage.removeItem('activeProfile')
  return <Navigate to="/dashboard" replace />
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
            <Route path="/profiles" element={<ProfileSelectionPage />} />
          </Route>

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
              <Route path="/insurance/upsell" element={<UpsellCrossSell />} />
              <Route path="/insurance/claims" element={<ClaimsManagement />} />
              <Route path="/insurance/messages" element={<MessagesHistory />} />
              <Route path="/insurance/reports" element={<ReportsPage />} />
              <Route path="/insurance/leads" element={<LeadManagement />} />
              <Route path="/insurance/doc-uploader" element={<DocUploaderPage />} />
              
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
