/**
 * AppWithAuth - Wrapper component that handles authentication
 */
import React, { lazy, Suspense } from "react";
import { ThemeProvider } from "./ThemeContext";
import { AuthProvider, useAuth } from "./AuthContext";
import { ToastProvider } from "./ToastContext";
import { LoginScreen } from "./LoginScreen";
import { LoginCallbackHandler } from "./LoginCallbackHandler";

const OrgRegistrationPage = lazy(() => import("./OrgRegistrationPage").then(m => ({ default: m.OrgRegistrationPage })));

interface AppWithAuthProps {
  children: React.ReactNode;
}

// Check if auth is enabled from environment (default: TRUE - Login required)
const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED !== "false";

/**
 * Protected component - shows content only if authenticated (when AUTH is enabled)
 */
function ProtectedContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentHash, setCurrentHash] = React.useState(window.location.hash);

  // Listen to hash changes
  React.useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
    };
    
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Parse hash and query params
  // Check both hash query params (/#?code=...) AND regular query params (/?code=...)
  const hashPart = currentHash.split('?')[0]; // Get part before query params
  const hashQueryPart = currentHash.includes('?') ? currentHash.split('?')[1] : '';
  const hashParams = new URLSearchParams(hashQueryPart);
  
  // Also check regular URL query params (not in hash)
  const regularParams = new URLSearchParams(window.location.search);
  
  // Merge both sources (prioritize hash params for login callback)
  const state = hashParams.get('state') || regularParams.get('state') || '';
  const hasCode = hashParams.has('code') || regularParams.has('code');
  
  // Debug logging
  console.log('[AppWithAuth] Parsing URL:', {
    currentHash,
    hashPart,
    hasHashCode: hashParams.has('code'),
    hasRegularCode: regularParams.has('code'),
    state,
    hasCode
  });
  
  // IMPORTANT: Check login callback FIRST (before register check)
  // If state starts with "login_", this is a login callback regardless of hash
  const isLoginCallback = hasCode && state.startsWith('login');
  
  if (isLoginCallback) {
    console.log('[AppWithAuth] ✅ Detected LOGIN callback (state:', state, ')');
    console.log('[AppWithAuth] Showing LoginCallbackHandler');
    return <LoginCallbackHandler />;
  }
  
  // Check if we're on the registration page (public route)
  const isRegisterPage = hashPart === '#register' || hashPart === '#register/';
  
  if (isRegisterPage) {
    console.log('[AppWithAuth] Detected REGISTER page, showing OrgRegistrationPage');
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      }>
        <OrgRegistrationPage />
      </Suspense>
    );
  }

  // If auth is disabled, show app directly
  if (!AUTH_ENABLED) {
    return <>{children}</>;
  }

  // Show loading while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show login screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // User is authenticated, show app content
  return <>{children}</>;
}

/**
 * AppWithAuth - Wraps the app with all necessary providers and auth protection
 */
export function AppWithAuth({ children }: AppWithAuthProps) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <ProtectedContent>{children}</ProtectedContent>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
