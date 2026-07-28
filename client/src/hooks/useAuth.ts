import { useState, useEffect } from 'react';

export interface Profile {
  id: string;
  role: 'farmer' | 'buyer' | 'admin';
  full_name: string;
  email: string;
  language: 'hi' | 'en';
  is_verified: boolean;
  verification_status: 'pending' | 'approved' | 'rejected';
  verification_note: string | null;
  verification_doc: string | null;
}

export function useAuth() {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (token: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setSession({ access_token: token, user: userData });
        setProfile({
          id: userData.id,
          role: userData.role,
          full_name: userData.full_name,
          email: userData.email,
          language: userData.language,
          is_verified: userData.is_verified,
          verification_status: userData.verification_status,
          verification_note: userData.verification_note,
          verification_doc: userData.verification_doc
        });
      } else {
        // Token might be invalid or expired
        localStorage.removeItem('token');
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.error("Failed to query user profile:", err);
      // Keep state as is on network failure, or reset if desired
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }

    // Custom event listener to synchronize auth changes across tabs/actions
    const handleAuthChange = () => {
      const updatedToken = localStorage.getItem('token');
      if (updatedToken) {
        fetchProfile(updatedToken);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    window.addEventListener('auth-state-change', handleAuthChange);
    return () => {
      window.removeEventListener('auth-state-change', handleAuthChange);
    };
  }, []);

  const logout = async () => {
    setLoading(true);
    localStorage.removeItem('token');
    setSession(null);
    setUser(null);
    setProfile(null);
    setLoading(false);
    // Dispatch event to trigger updates
    window.dispatchEvent(new Event('auth-state-change'));
  };

  const loginUser = (token: string, _userData: any) => {
    localStorage.setItem('token', token);
    window.dispatchEvent(new Event('auth-state-change'));
  };

  return {
    session,
    user,
    profile,
    loading,
    logout,
    loginUser,
    refreshProfile: () => {
      const token = localStorage.getItem('token');
      if (token) fetchProfile(token);
    }
  };
}
