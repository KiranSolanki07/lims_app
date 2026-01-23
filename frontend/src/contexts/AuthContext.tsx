import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../supabaseClient';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  refreshUserProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Function to fetch and set user profile
  const fetchUserProfile = async (userId: string, session: any) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('role, first_name, last_name')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      const role = profileData?.role || session?.user_metadata?.role || null;
      const first_name = profileData?.first_name || session?.user_metadata?.given_name || 
                       session?.user_metadata?.first_name || '';
      const last_name = profileData?.last_name || session?.user_metadata?.family_name || 
                      session?.user_metadata?.last_name || '';

      setUser({
        id: userId,
        email: session?.email || '',
        first_name,
        last_name,
        role,
      });

      setIsAuthenticated(true);
    } catch (err) {
      console.error('Error in fetchUserProfile:', err);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Initialize auth on mount
  useEffect(() => {
    let isMounted = true;
    let hasCheckedSession = false;
    
    const initAuth = async () => {
      try {
        // First check if there's already an active session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          if (isMounted) {
            setIsAuthenticated(false);
            hasCheckedSession = true;
          }
          return;
        }

        if (session?.user) {
          if (isMounted) {
            await fetchUserProfile(session.user.id, session);
            hasCheckedSession = true;
          }
        } else {
          if (isMounted) {
            setIsAuthenticated(false);
            hasCheckedSession = true;
          }
        }
      } catch (err) {
        console.error('Auth init error:', err);
        if (isMounted) {
          setIsAuthenticated(false);
          hasCheckedSession = true;
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Start initialization
    initAuth();

    // Subscribe to auth changes (handles session restoration after initial check)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      
      // Only update auth state from subscription AFTER initial session check is done
      // This prevents clearing auth during the page refresh session restoration
      if (!hasCheckedSession) {
        return;
      }
      
      if (session?.user) {
        await fetchUserProfile(session.user.id, session);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const refreshUserProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchUserProfile(session.user.id, session);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    } catch (err) {
      console.error('Logout error:', err);
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, refreshUserProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
