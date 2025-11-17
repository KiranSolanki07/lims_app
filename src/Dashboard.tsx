import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true) // prevent UI flash

  useEffect(() => {
    const getUserData = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        navigate('/') // Not logged in
        return
      }

      const user = session.user
      setUser(user)

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, first_name, last_name')
        .eq('id', user.id)
        .maybeSingle() // returns null if no row

      if (profileError || !profileData || !profileData.role) {
        // Redirect immediately if no role or error
        navigate('/contact-admin')
        return
      }

      setProfile(profileData)
      setLoading(false) // profile loaded
    }

    getUserData()
  }, [navigate])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  // Show nothing while loading to prevent dashboard flash
  if (loading) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-900 via-green-700 to-emerald-600 text-white">
      <h1 className="text-3xl font-bold mb-4">Welcome to your Dashboard</h1>

      {user && profile && (
        <div className="mb-6 text-lg text-center">
          <p>
            Logged in as: <span className="font-semibold">{user.email}</span>
          </p>
          <p className="mt-2 text-sm text-gray-100">
            Role: <span className="font-semibold">{profile.role}</span>
          </p>
        </div>
      )}

      <button
        onClick={handleLogout}
        className="bg-white text-green-700 px-5 py-2 rounded-full font-medium hover:bg-gray-100 transition"
      >
        Logout
      </button>
    </div>
  )
}
