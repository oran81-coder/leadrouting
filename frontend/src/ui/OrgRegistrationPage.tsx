import React, { useEffect, useState, useRef } from "react";
import { useTheme } from "./ThemeContext";
import { getMondayOAuthRegisterUrl, registerOrgWithMonday, getMondayOAuthStatus } from "./api";

/**
 * Organization Registration Page
 * Public page for new organizations to sign up via Monday.com OAuth
 */
export function OrgRegistrationPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [checkingConfig, setCheckingConfig] = useState(true);
  const callbackProcessedRef = useRef(false); // Use ref instead of state

  // Check if OAuth is configured
  useEffect(() => {
    checkOAuthConfig();
  }, []);

  // Handle OAuth callback on mount - ONLY ONCE
  useEffect(() => {
    if (callbackProcessedRef.current) return; // Already processed

    // Extract query params from both hash and regular URL
    const hash = window.location.hash;
    const queryStart = hash.indexOf('?');
    const hashQueryString = queryStart !== -1 ? hash.substring(queryStart + 1) : '';
    const hashParams = new URLSearchParams(hashQueryString);
    
    // Also check regular query params
    const regularParams = new URLSearchParams(window.location.search);
    
    // Prioritize regular params
    const code = regularParams.get("code") || hashParams.get("code");
    const state = regularParams.get("state") || hashParams.get("state");

    console.log('[OrgRegistrationPage] Parsed URL params:', {
      hasRegularCode: regularParams.has('code'),
      hasHashCode: hashParams.has('code'),
      code: code?.substring(0, 10) + '...',
      state
    });

    if (code && !callbackProcessedRef.current) {
      callbackProcessedRef.current = true;
      handleOAuthCallback(code, state || undefined);
    }
  }, []); // Empty deps to run only once

  async function checkOAuthConfig() {
    try {
      const response = await getMondayOAuthStatus();
      setIsConfigured(response.data.mondayOAuthConfigured);
    } catch (err) {
      console.error("Failed to check OAuth config:", err);
      setIsConfigured(false);
    } finally {
      setCheckingConfig(false);
    }
  }

  async function handleStartOAuth() {
    setLoading(true);
    setError(null);

    try {
      const response = await getMondayOAuthRegisterUrl();
      // Redirect to Monday.com OAuth page
      window.location.href = response.data.authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start OAuth flow");
      setLoading(false);
    }
  }

  async function handleOAuthCallback(code: string, state?: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await registerOrgWithMonday(code, state);
      
      // Store tokens in localStorage
      localStorage.setItem("lead_routing_access_token", response.data.tokens.accessToken);
      localStorage.setItem("lead_routing_refresh_token", response.data.tokens.refreshToken);
      
      // Also store user data
      localStorage.setItem("lead_routing_user", JSON.stringify(response.data.user));

      setSuccess(true);
      
      // Wait a moment to show success message, then redirect to home
      setTimeout(() => {
        // Full navigation to home (not just hash change or reload)
        window.location.href = window.location.origin + '/';
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete registration");
      setLoading(false);
    }
  }

  if (checkingConfig) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDark ? "bg-gray-900" : "bg-gradient-to-br from-blue-50 to-indigo-100"
        }`}
      >
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-3xl font-bold shadow-lg animate-pulse">
            LR
          </div>
          <p
            className={`mt-4 text-sm ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center px-4 ${
          isDark ? "bg-gray-900" : "bg-gradient-to-br from-blue-50 to-indigo-100"
        }`}
      >
        <div
          className={`max-w-md w-full space-y-8 ${
            isDark ? "bg-gray-800" : "bg-white"
          } p-10 rounded-2xl shadow-2xl`}
        >
          <div className="text-center">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-3xl font-bold shadow-lg">
              !
            </div>
            <h2
              className={`mt-6 text-2xl font-bold ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Monday.com OAuth Not Configured
            </h2>
            <p
              className={`mt-3 text-sm ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}
            >
              The administrator needs to configure Monday.com OAuth credentials before you can register a new organization.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
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
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-3xl font-bold shadow-lg">
            ✓
          </div>
          <h2
            className={`text-2xl font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Registration Successful!
          </h2>
          <p
            className={`text-sm ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Your organization has been created. Redirecting to your dashboard...
          </p>
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
        } p-10 rounded-2xl shadow-2xl`}
      >
        {/* Logo & Title */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-3xl font-bold shadow-lg">
            LR
          </div>
          <h2
            className={`mt-6 text-3xl font-extrabold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Create Your Organization
          </h2>
          <p
            className={`mt-2 text-sm ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Sign up with your Monday.com account
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Sign Up Button */}
        <div className="space-y-4">
          <button
            onClick={handleStartOAuth}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 px-4 border-2 border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
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
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                  <path d="M8 12h8v2H8z"/>
                </svg>
                Sign up with Monday.com
              </>
            )}
          </button>

          <div className="text-center">
            <p
              className={`text-sm ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Already have an account? Contact your organization admin.
            </p>
          </div>
        </div>

        {/* Info */}
        <div
          className={`mt-6 p-4 rounded-lg ${
            isDark ? "bg-blue-900/20 border border-blue-800" : "bg-blue-50 border border-blue-200"
          }`}
        >
          <p
            className={`text-xs ${
              isDark ? "text-blue-200" : "text-blue-800"
            }`}
          >
            <strong>What happens next?</strong>
            <br />
            You'll be redirected to Monday.com to authorize the connection. Once authorized, we'll create your organization and you'll be logged in as the admin.
          </p>
        </div>

        {/* Back to Login Link */}
        <div className="text-center mt-6">
          <p
            className={`text-sm ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Already have an account?{" "}
            <a
              href="/#"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Back to Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

