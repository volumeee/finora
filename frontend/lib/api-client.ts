import { Client, Local, APIError, isAPIError } from '../client';

class ApiClient {
  private client: Client;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    const baseURL = import.meta.env.VITE_CLIENT_TARGET || Local;
    this.client = new Client(baseURL, {
      requestInit: { credentials: 'include' },
      fetcher: this.authenticatedFetch.bind(this)
    });
    
    // Load tokens from localStorage
    this.loadTokens();
  }

  private loadTokens() {
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }



  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.client.auth.refreshToken({
        refresh_token: this.refreshToken
      });
      
      this.saveTokens(response.access_token, response.refresh_token);
    } catch (error) {
      this.clearTokens();
      throw error;
    }
  }

  private async authenticatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // Ensure init object exists
    if (!init) {
      init = {};
    }
    if (!init.headers) {
      init.headers = {};
    }

    // Add authorization header if we have an access token
    if (this.accessToken) {
      (init.headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(input, init);

    // If we get a 401 and have a refresh token, try to refresh
    if (response.status === 401 && this.refreshToken && !this.isRefreshing) {
      if (!this.refreshPromise) {
        this.isRefreshing = true;
        this.refreshPromise = this.refreshAccessToken()
          .finally(() => {
            this.isRefreshing = false;
            this.refreshPromise = null;
          });
      }

      try {
        await this.refreshPromise;
        
        // Retry the original request with new token
        if (this.accessToken) {
          (init.headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
          response = await fetch(input, init);
        }
      } catch (error) {
        // Refresh failed, clear tokens and redirect to login
        this.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
        throw error;
      }
    }

    return response;
  }

  // Auth methods
  async login(email: string, password: string) {
    try {
      const response = await this.client.auth.login({ email, kata_sandi: password });
      this.saveTokens(response.access_token, response.refresh_token);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async register(data: any) {
    try {
      // Ensure the correct field name is used
      const registerData = {
        ...data,
        kata_sandi: data.kata_sandi || data.password
      };
      const response = await this.client.auth.register(registerData);
      this.saveTokens(response.access_token, response.refresh_token);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async logout() {
    try {
      if (this.refreshToken) {
        await this.client.auth.logout({ refresh_token: this.refreshToken });
      }
    } finally {
      this.clearTokens();
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  saveTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // Service getters
  get akun() { return this.client.akun; }
  get auth() { return this.client.auth; }
  get dashboard() { return this.client.dashboard; }
  get kalkulator() { return this.client.kalkulator; }
  get kategori() { return this.client.kategori; }
  get laporan() { return this.client.laporan; }
  get tenant() { return this.client.tenant; }
  get transaksi() { return this.client.transaksi; }
  get tujuan() { return this.client.tujuan; }
  get user() { return this.client.user; }
}

export const apiClient = new ApiClient();
export default apiClient;