export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: 'github' | 'google';
  createdAt: string;
  permissions?: string[];
  subscription?: {
    plan: 'free' | 'pro' | 'enterprise';
    expiresAt?: string;
    features: string[];
  };
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  loginWithGitHub: () => void;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  handleAuthCallback: (code: string, provider: 'github' | 'google') => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

export interface AuthConfig {
  apiUrl: string;
  github: {
    clientId: string;
    redirectUri: string;
  };
  google: {
    clientId: string;
    redirectUri: string;
  };
}