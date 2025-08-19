import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import backend from '~backend/client';

interface User {
  id: string;
  nama_lengkap: string;
  email: string;
  avatar_url?: string;
  no_telepon?: string;
}

interface Tenant {
  id: string;
  nama: string;
  sub_domain: string;
  peran: string;
}

interface AuthContextType {
  user: User | null;
  tenants: Tenant[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

interface RegisterData {
  nama_lengkap: string;
  email: string;
  kata_sandi: string;
  nama_tenant: string;
  sub_domain: string;
  no_telepon?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        setIsLoading(false);
        return;
      }

      const response = await backend.auth.refreshToken({ refresh_token: refreshToken });
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      
      // Get user profile after refresh
      await refreshAuth();
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, kata_sandi: string) => {
    try {
      const response = await backend.auth.login({ email, kata_sandi });
      
      setUser(response.pengguna);
      setTenants(response.tenants);
      
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await backend.auth.register(data);
      
      setUser(response.pengguna);
      setTenants([{
        id: response.tenant.id,
        nama: response.tenant.nama,
        sub_domain: response.tenant.sub_domain,
        peran: 'pemilik'
      }]);
      
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await backend.auth.logout({ refresh_token: refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setTenants([]);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  };

  const refreshAuth = async () => {
    // This would typically fetch fresh user data
    // For now, we'll keep the existing user data
  };

  return (
    <AuthContext.Provider value={{
      user,
      tenants,
      isAuthenticated,
      isLoading,
      login,
      register,
      logout,
      refreshAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
