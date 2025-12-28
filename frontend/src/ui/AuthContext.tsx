import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "./hooks/useToast";

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  orgId: string;
  username: string;
  email: string;
  role: "admin" | "manager" | "agent";
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  lastLoginAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  setAuthFromTokens: (tokens: AuthTokens, user: User) => void;
  hasRole: (roles: User["role"][]) => boolean;
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// Constants
// ============================================================================

const TOKEN_KEY = "lead_routing_access_token";
const REFRESH_TOKEN_KEY = "lead_routing_refresh_token";
const USER_KEY = "lead_routing_user";

// Token refresh interval: 50 minutes (tokens expire in 60 minutes)
const REFRESH_INTERVAL = 50 * 60 * 1000;

// Check if auth is enabled from env (default: TRUE - Login required)
const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED !== "false";
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ============================================================================
// Provider Component
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  // ========================================
  // Token Management
  // ========================================

  const getAccessToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  };

  const getRefreshToken = (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  };

  const setTokens = (tokens: AuthTokens) => {
    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  };

  const clearTokens = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const saveUser = (user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setUser(user);
  };

  const loadUser = (): User | null => {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  };

  // ========================================
  // API Calls
  // ========================================

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      const result = await response.json();
      const data = result.data; // API returns { success: true, data: {...} }
      
      // Save tokens and user
      setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      saveUser(data.user);
      
      // Update state immediately
      setUser(data.user);

      showToast("Login successful!", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Login failed",
        "error"
      );
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = getAccessToken();
      
      if (token) {
        // Call logout endpoint to revoke session
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Always clear local state
      clearTokens();
      setUser(null);
      showToast("Logged out successfully", "info");
    }
  };

  const refreshAuth = async () => {
    try {
      const refreshToken = getRefreshToken();
      
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const result = await response.json();
      const data = result.data; // API returns { success: true, data: {...} }
      
      // Update tokens
      setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      saveUser(data.user);
      setUser(data.user);
    } catch (error) {
      console.error("Token refresh failed:", error);
      // On refresh failure, log out user
      clearTokens();
      setUser(null);
    }
  };

  // ========================================
  // NEW: Set auth state directly from OAuth callback
  // ========================================
  const setAuthFromTokens = (tokens: AuthTokens, userData: User) => {
    console.log('[AuthContext] Setting auth from tokens:', userData.email);
    
    // Save to localStorage
    setTokens(tokens);
    saveUser(userData);
    
    // Update state immediately
    setUser(userData);
    setIsLoading(false);
    
    console.log('[AuthContext] Auth state updated successfully');
    showToast("Login successful!", "success");
  };

  // ========================================
  // Role Check
  // ========================================

  const hasRole = (roles: User["role"][]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  // ========================================
  // Initialize Auth State
  // ========================================

  useEffect(() => {
    const initAuth = async () => {
      // If auth is disabled, skip initialization
      if (!AUTH_ENABLED) {
        setIsLoading(false);
        return;
      }

      const token = getAccessToken();
      const savedUser = loadUser();

      if (token && savedUser) {
        // Try to validate token with /auth/me
        try {
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const result = await response.json();
            const userData = result.data?.user || result.user; // Handle both formats
            saveUser(userData);
            setUser(userData);
          } else {
            // Token invalid, try refresh
            await refreshAuth();
          }
        } catch (error) {
          console.error("Auth initialization failed:", error);
          clearTokens();
          setUser(null);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  // ========================================
  // Auto Token Refresh
  // ========================================

  useEffect(() => {
    if (!AUTH_ENABLED || !user) return;

    // Set up auto-refresh interval
    const intervalId = setInterval(() => {
      refreshAuth();
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [user]);

  // ========================================
  // Context Value
  // ========================================

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshAuth,
    setAuthFromTokens,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
}

// ============================================================================
// Export token getter for API calls
// ============================================================================

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

