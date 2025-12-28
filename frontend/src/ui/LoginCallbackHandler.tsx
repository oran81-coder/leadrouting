import React, { useEffect, useState, useRef } from "react";
import { useTheme } from "./ThemeContext";
import { useAuth } from "./AuthContext";
import { loginWithMonday } from "./api";

/**
 * Login Callback Handler
 * Handles Monday.com OAuth callback for existing user login
 */
export function LoginCallbackHandler() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { setAuthFromTokens } = useAuth(); // Get setAuthFromTokens from AuthContext

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false); // Use ref instead of state to survive re-renders

  useEffect(() => {
    // Only process once - useRef persists across re-renders
    if (!processedRef.current) {
      processedRef.current = true;
      handleCallback();
    }
  }, []); // Empty deps to run only once

  async function handleCallback() {
    // Extract code and state from URL parameters
    // Check both hash query params and regular query params
    const hash = window.location.hash;
    const queryStart = hash.indexOf('?');
    const hashQueryString = queryStart !== -1 ? hash.substring(queryStart + 1) : '';
    const hashParams = new URLSearchParams(hashQueryString);
    
    // Also check regular query params (Monday redirects to /?code=... not /#?code=...)
    const regularParams = new URLSearchParams(window.location.search);
    
    // Prioritize regular params (from Monday redirect)
    const code = regularParams.get("code") || hashParams.get("code");
    const state = regularParams.get("state") || hashParams.get("state");

    console.log('[LoginCallbackHandler] Parsed URL params:', {
      hasRegularCode: regularParams.has('code'),
      hasHashCode: hashParams.has('code'),
      code: code?.substring(0, 10) + '...',
      state
    });

    if (!code) {
      setError("No authorization code received");
      setLoading(false);
      return;
    }

    try {
      console.log('[LoginCallbackHandler] Calling loginWithMonday with code:', code?.substring(0, 10) + '...');
      const response = await loginWithMonday(code, state || undefined);
      
      console.log('[LoginCallbackHandler] Response received:', response);
      console.log('[LoginCallbackHandler] Access token:', response.data?.tokens?.accessToken?.substring(0, 20) + '...');
      
      // NEW: Use AuthContext to set auth state directly (no localStorage + reload!)
      const tokens = {
        accessToken: response.data.tokens.accessToken,
        refreshToken: response.data.tokens.refreshToken
      };
      
      console.log('[LoginCallbackHandler] Setting auth state directly via AuthContext...');
      setAuthFromTokens(tokens, response.data.user);
      
      console.log('[LoginCallbackHandler] Auth set successfully! Navigating to home...');
      // Use hash navigation (no full page reload!)
      window.location.hash = '';
      
    } catch (err) {
      console.error('[LoginCallbackHandler] Error:', err);
      setError(err instanceof Error ? err.message : "Failed to complete login");
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center px-4 ${
          isDark ? "bg-gray-900" : "bg-gradient-to-br from-blue-50 to-indigo-100"
        }`}
      >
        <div
          className={`max-w-md w-full space-y-8 ${
            isDark ? "bg-gray-800" : "bg-white"
          } p-10 rounded-2xl shadow-2xl text-center`}
        >
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-3xl font-bold shadow-lg">
            ✕
          </div>
          <h2
            className={`text-2xl font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Login Failed
          </h2>
          <p
            className={`text-sm ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {error}
          </p>
          <button
            onClick={() => (window.location.hash = "")}
            className={`mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${
              isDark
                ? "text-blue-200 bg-blue-800 hover:bg-blue-700"
                : "text-white bg-blue-600 hover:bg-blue-700"
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 ${
        isDark ? "bg-gray-900" : "bg-gradient-to-br from-blue-50 to-indigo-100"
      }`}
    >
      <div
        className={`max-w-md w-full space-y-8 ${
          isDark ? "bg-gray-800" : "bg-white"
        } p-10 rounded-2xl shadow-2xl text-center`}
      >
        <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-3xl font-bold shadow-lg animate-pulse">
          LR
        </div>
        <h2
          className={`text-2xl font-bold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Completing Login...
        </h2>
        <p
          className={`text-sm ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Please wait while we sign you in
        </p>
        <div className="flex justify-center">
          <svg
            className="animate-spin h-8 w-8 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      </div>
    </div>
  );
}

