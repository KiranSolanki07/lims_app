import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import AuthPage from './AuthPage'
import Dashboard from './Dashboard'
import ContactAdmin from './ContactAdmin'

// Admin pages
import AdminLayout from './dashboards/admin/AdminLayout'
import AdminHome from './dashboards/admin/AdminHome'
import UsersPage from './dashboards/admin/UsersPage'
import SettingsPage from './dashboards/admin/SettingsPage'
import ReportsPage from './dashboards/admin/ReportsPage'

export default function App() {
  return (
    <Router>
      <Routes>

        <Route path="/" element={<AuthPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/contact-admin" element={<ContactAdmin />} />

        {/* ADMIN ROUTES */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminHome />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>

      </Routes>
    </Router>
  )
}
