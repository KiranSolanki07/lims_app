import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom'

import EmployeeDashboard from './dashboards/EmployeeDashboard'
import InternDashboard from './dashboards/InternDashboard'
import type { Profile } from './types'

export default function Dashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        navigate('/')
        return
      }

      const user = session.user

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, first_name, last_name')
        .eq('id', user.id)
        .maybeSingle()

      if (!profileData || !profileData.role) {
        navigate('/contact-admin')
        return
      }

      setProfile(profileData)
      setLoading(false)
    }

    loadUser()
  }, [navigate])

  if (loading) return null

  // FIXED — safe
  if (profile?.role === "Admin") {
    navigate("/admin")
    return null
  }

  return (
    <>
      {profile?.role === 'Employee' && <EmployeeDashboard profile={profile} />}
      {profile?.role === 'Intern' && <InternDashboard profile={profile} />}
    </>
  )
}
