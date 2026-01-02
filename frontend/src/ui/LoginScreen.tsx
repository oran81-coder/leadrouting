import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import { useTheme } from "./ThemeContext";
import { getMondayOAuthUrl } from "./api";

/**
 * Login Screen with Email/Password + Monday.com OAuth
 */
export function LoginScreen() {
  const { theme } = useTheme();
  const { login } = useAuth();
  const isDark = theme === "dark";

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mondayLoading, setMondayLoading] = useState(false);

  // Email/Password login
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login({ email, password });
      // AuthContext will handle navigation after successful login
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  // Monday.com OAuth login
  async function handleMondayLogin() {
    setMondayLoading(true);
    setError(null);

    try {
      const response = await getMondayOAuthUrl();
      // Redirect to Monday.com OAuth page
      window.location.href = response.data.authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Monday.com login");
      setMondayLoading(false);
    }
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
          <div className="mx-auto mb-6">
            <img 
              src="/logo.png" 
              alt="LeadoRun - Lead Routing System" 
              className="mx-auto w-auto"
              style={{ height: "140px", maxWidth: "550px" }}
            />
          </div>
          <h2
            className={`mt-6 text-3xl font-extrabold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Welcome Back
          </h2>
          <p
            className={`mt-2 text-sm ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Sign in to your Lead Routing account
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Monday.com OAuth Button */}
        <div>
          <button
            onClick={handleMondayLogin}
            disabled={mondayLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-4 px-4 border-2 border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mondayLoading ? (
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
                Sign in with Monday.com
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className={`w-full border-t ${isDark ? "border-gray-700" : "border-gray-300"}`}></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className={`px-2 ${isDark ? "bg-gray-800 text-gray-400" : "bg-white text-gray-500"}`}>
              Or continue with email
            </span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailLogin} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className={`block text-sm font-medium ${
                isDark ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Email address
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`appearance-none block w-full px-3 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className={`block text-sm font-medium ${
                isDark ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`appearance-none block w-full px-3 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="remember-me"
                className={`ml-2 block text-sm ${
                  isDark ? "text-gray-300" : "text-gray-900"
                }`}
              >
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                Use Monday.com OAuth for secure login
              </span>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || mondayLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </div>
        </form>

        {/* Register Link */}
        <div className="text-center">
          <p
            className={`text-sm ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Don't have an organization?{" "}
            <a
              href="/#register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Register your organization
            </a>
          </p>
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
            <strong>🔐 Secure Login</strong>
            <br />
            Your credentials are encrypted and never stored in plain text. Monday.com OAuth provides the most secure login experience.
          </p>
        </div>
      </div>
    </div>
  );
}
