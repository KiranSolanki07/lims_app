import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

interface SignupData {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
}

interface LoginData {
  email: string
  password: string
}

export default function AuthPage() {
  const [showEmailSignup, setShowEmailSignup] = useState(false)
  const [signupData, setSignupData] = useState<SignupData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [loginData, setLoginData] = useState<LoginData>({ email: '', password: '' })
  const navigate = useNavigate()

  // Redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle()

        if (!profile?.role) navigate('/contact-admin')
        else navigate('/dashboard')
      }
    }
    checkSession()
  }, [navigate])

  // Google OAuth
  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) alert(error.message)
  }


  // Email Signup
  const handleEmailSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (signupData.password !== signupData.confirmPassword) {
      alert('Passwords do not match!')
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: signupData.email,
      password: signupData.password,
      options: {
        data: {
          first_name: signupData.firstName,
          last_name: signupData.lastName,
        },
      },
    })

    if (error) {
      alert(error.message)
      return
    }

    if (data.user) {
      // Insert profile with empty role
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          first_name: signupData.firstName,
          last_name: signupData.lastName,
          role: null,
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
        alert('Error creating profile, contact admin.')
        return
      }

      // Redirect based on role (empty role goes to contact-admin)
      navigate('/contact-admin')
    }
  }

  // Email Login
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginData.email,
      password: loginData.password,
    })

    if (error) {
      alert(error.message)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!profile?.role) navigate('/contact-admin')
      else navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-sky-600">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden">
        <div className="flex flex-col items-center mt-6">
          <h2 className="text-gray-600 text-sm font-large mb-2">
            MettleByte Technologies
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 border-t border-gray-200 transition-all duration-300">
          {/* LEFT SIDE */}
          <div className="p-8 flex flex-col items-center border-r border-gray-200">
            {showEmailSignup ? (
              <>
                <h3 className="text-gray-800 font-semibold mb-5 text-lg">
                  Already have an account?
                </h3>
                <button
                  onClick={() => setShowEmailSignup(false)}
                  className="flex items-center justify-center gap-3 border border-gray-300 rounded-full px-4 py-2.5 hover:bg-gray-50 transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5 text-gray-600"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 19.5L8.25 12l7.5-7.5"
                    />
                  </svg>
                  <span className="text-gray-800 font-medium text-sm">Back to Login</span>
                </button>
              </>
            ) : (
              <>
                <h3 className="text-gray-800 font-semibold mb-5 text-lg">Sign up</h3>
                <div className="flex flex-col w-full gap-3">
                  <button
                    onClick={handleGoogleAuth}
                    className="flex items-center justify-center gap-3 border border-gray-300 rounded-full py-3 px-5 hover:bg-gray-50 transition"
                  >
                    <img
                      src="https://www.svgrepo.com/show/475656/google-color.svg"
                      alt="Google"
                      className="h-5 w-5"
                    />
                    <span className="text-gray-800 font-medium text-sm">
                      Continue with Google
                    </span>
                  </button>
                  <button
                    onClick={() => setShowEmailSignup(true)}
                    className="flex items-center justify-center gap-3 border border-gray-300 rounded-full py-3 px-5 hover:bg-gray-50 transition"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5 text-gray-600"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75M21.75 6.75l-9.75 6-9.75-6"
                      />
                    </svg>
                    <span className="text-gray-800 font-medium text-sm">Sign up with email</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* RIGHT SIDE */}
          <div className="p-8 flex flex-col justify-center transition-all duration-300">
            {!showEmailSignup ? (
              <>
                <h3 className="text-gray-800 font-semibold mb-5 text-lg">Log in</h3>
                <button
                  onClick={handleGoogleAuth}
                  className="flex items-center justify-center gap-3 border border-gray-300 rounded-full py-3 mb-4 hover:bg-gray-50 transition"
                >
                  <img
                    src="https://www.svgrepo.com/show/475656/google-color.svg"
                    alt="Google"
                    className="h-5 w-5"
                  />
                  <span className="text-gray-800 font-medium text-sm">Continue with Google</span>
                </button>
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Email address</label>
                    <input
                      type="email"
                      required
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-gray-800 focus:ring-2 focus:ring-blue-400 outline-none text-sm"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Password</label>
                    <input
                      type="password"
                      required
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-gray-800 focus:ring-2 focus:ring-blue-400 outline-none text-sm"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full mt-3 bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition"
                  >
                    Log in
                  </button>
                </form>
              </>
            ) : (
              <>
                <h3 className="text-gray-800 font-semibold mb-5 text-lg">Create Account</h3>
                <form onSubmit={handleEmailSignup} className="flex flex-col w-full gap-3">
                  <input
                    type="text"
                    placeholder="First Name"
                    className="border rounded-md px-3 py-2 text-sm"
                    value={signupData.firstName}
                    onChange={(e) =>
                      setSignupData({ ...signupData, firstName: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    className="border rounded-md px-3 py-2 text-sm"
                    value={signupData.lastName}
                    onChange={(e) =>
                      setSignupData({ ...signupData, lastName: e.target.value })
                    }
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    className="border rounded-md px-3 py-2 text-sm"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    className="border rounded-md px-3 py-2 text-sm"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    className="border rounded-md px-3 py-2 text-sm"
                    value={signupData.confirmPassword}
                    onChange={(e) =>
                      setSignupData({ ...signupData, confirmPassword: e.target.value })
                    }
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 text-white rounded-md py-2 text-sm hover:bg-blue-700 transition"
                  >
                    Sign Up
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
