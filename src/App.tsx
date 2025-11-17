import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import AuthPage from './AuthPage'
import Dashboard from './Dashboard'
import ContactAdmin from './ContactAdmin'
import './index.css'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/contact-admin" element={<ContactAdmin />} />
      </Routes>
    </Router>
  )
}
