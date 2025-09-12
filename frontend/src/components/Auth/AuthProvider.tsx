import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthContextType, AuthConfig } from '../../types/auth';

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
  config: AuthConfig;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, config }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${config.apiUrl}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        localStorage.removeItem('auth_token');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const loginWithGitHub = () => {
    const githubAuthUrl = `https://github.com/login/oauth/authorize?` +
      `client_id=${config.github.clientId}&` +
      `redirect_uri=${encodeURIComponent(config.github.redirectUri)}&` +
      `scope=user:email&` +
      `state=${generateState()}`;
    
    window.location.href = githubAuthUrl;
  };

  const loginWithGoogle = () => {
    const googleAuthUrl = `https://accounts.google.com/oauth2/auth?` +
      `client_id=${config.google.clientId}&` +
      `redirect_uri=${encodeURIComponent(config.google.redirectUri)}&` +
      `response_type=code&` +
      `scope=openid email profile&` +
      `state=${generateState()}`;
    
    window.location.href = googleAuthUrl;
  };

  const handleAuthCallback = async (code: string, provider: 'github' | 'google') => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/auth/callback/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        const { token, user: userData } = await response.json();
        localStorage.setItem('auth_token', token);
        setUser(userData);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Authentication failed');
      }
    } catch (err) {
      console.error('Auth callback failed:', err);
      setError('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`${config.apiUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
      setError(null);
    }
  };

  const generateState = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  const refreshToken = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return false;

      const response = await fetch(`${config.apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const { token: newToken } = await response.json();
        localStorage.setItem('auth_token', newToken);
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Token refresh failed:', err);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    loginWithGitHub,
    loginWithGoogle,
    logout,
    handleAuthCallback,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;