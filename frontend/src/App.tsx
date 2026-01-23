import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import AuthPage from './AuthPage'
import Dashboard from './Dashboard'
import ContactAdmin from './ContactAdmin'
import ProtectedRoute from './ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'

// Admin pages
import AdminLayout from './dashboards/admin/AdminLayout'

// Employee pages
import EmployeeLayout from './dashboards/employee/EmployeeLayout'

// Intern pages
import InternLayout from './dashboards/intern/InternLayout'

function AppContent() {
  return (
    <Router>
      <Routes>

      <Route path="/" element={<AuthPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/contact-admin" element={<ContactAdmin />} />

      {/* ADMIN ROUTES - Protected */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole="Admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      />

      {/* EMPLOYEE ROUTES - Protected */}
      <Route
        path="/employee/*"
        element={
          <ProtectedRoute requiredRole="Employee">
            <EmployeeLayout />
          </ProtectedRoute>
        }
      />

      {/* INTERN ROUTES - Protected */}
      <Route
        path="/intern/*"
        element={
          <ProtectedRoute requiredRole="Intern">
            <InternLayout />
          </ProtectedRoute>
        }
      />

    </Routes>
    </Router>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
