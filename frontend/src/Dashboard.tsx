import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, loading, isAuthenticated } = useAuth()

  useEffect(() => {
    // Wait for loading to complete
    if (loading) return

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      navigate('/')
      return
    }

    // If user doesn't have a role, redirect to contact admin
    if (!user?.role) {
      navigate('/contact-admin')
      return
    }

    // Redirect based on role
    if (user.role === "Admin") {
      navigate("/admin")
    } else if (user.role === "Employee") {
      navigate("/employee")
    } else if (user.role === "Intern") {
      navigate("/intern")
    }
  }, [loading, isAuthenticated, user, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return null
}
