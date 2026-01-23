import { useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'

export default function ContactAdmin() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleBackToLogin = async () => {
    try {
      await logout();
      // Small delay to ensure logout completes
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 100);
    } catch (err) {
      console.error('Logout error:', err);
      // Force navigate even if logout fails
      navigate('/', { replace: true });
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 text-white text-center px-4">
      <h1 className="text-3xl font-bold mb-4">Access Pending</h1>
      <p className="mb-6 text-gray-300 max-w-md">
        Your account doesn’t have a role assigned yet. Please contact your administrator to activate your dashboard access.
      </p>
      <button
        onClick={handleBackToLogin}
        className="bg-white text-gray-800 px-5 py-2 rounded-full font-medium hover:bg-gray-100 transition"
      >
        Back to Login
      </button>
    </div>
  )
}
