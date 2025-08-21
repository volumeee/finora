import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '../lib/api-client';

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
      if (!apiClient.isAuthenticated()) {
        setIsLoading(false);
        return;
      }
      
      // Try to refresh token and get user data
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        const response = await apiClient.auth.refreshToken({ refresh_token: refreshToken });
        apiClient.saveTokens(response.access_token, response.refresh_token);
        
        // Get stored user data or fetch from API
        const storedUser = localStorage.getItem('user_data');
        const storedTenants = localStorage.getItem('tenants_data');
        
        if (storedUser && storedTenants) {
          setUser(JSON.parse(storedUser));
          setTenants(JSON.parse(storedTenants));
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      apiClient.clearTokens();
      localStorage.removeItem('user_data');
      localStorage.removeItem('tenants_data');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      
      setUser(response.pengguna);
      setTenants(response.tenants);
      
      // Store user data for persistence
      localStorage.setItem('user_data', JSON.stringify(response.pengguna));
      localStorage.setItem('tenants_data', JSON.stringify(response.tenants));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await apiClient.register(data);
      
      const tenantData = [{
        id: response.tenant.id,
        nama: response.tenant.nama,
        sub_domain: response.tenant.sub_domain,
        peran: 'pemilik'
      }];
      
      setUser(response.pengguna);
      setTenants(tenantData);
      
      // Store user data for persistence
      localStorage.setItem('user_data', JSON.stringify(response.pengguna));
      localStorage.setItem('tenants_data', JSON.stringify(tenantData));
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setTenants([]);
      localStorage.removeItem('user_data');
      localStorage.removeItem('tenants_data');
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
