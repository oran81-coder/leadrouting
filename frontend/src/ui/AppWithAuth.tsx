import React from "react";
import { useAuth } from "./AuthContext";
import { LoginScreen } from "./LoginScreen";
import { useTheme } from "./ThemeContext";

// ============================================================================
// AppWithAuth - Wrapper that handles authentication
// ============================================================================

interface AppWithAuthProps {
  children: React.ReactNode;
}

export function AppWithAuth({ children }: AppWithAuthProps) {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const { theme } = useTheme();

  // Check if auth is enabled
  const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED === "true";

  // If auth is disabled, render app directly
  if (!AUTH_ENABLED) {
    return <>{children}</>;
  }

  // Show loading state while checking auth
  if (isLoading) {
    return <LoadingScreen theme={theme} />;
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Authenticated - render app with user context
  return (
    <>
      {/* User info bar at top */}
      <div className={`px-4 py-2 border-b ${
        theme === "dark"
          ? "bg-gray-800 border-gray-700"
          : "bg-white border-gray-200"
      }`}>
        <div className="flex justify-between items-center">
          <div className={`text-sm ${
            theme === "dark" ? "text-gray-300" : "text-gray-700"
          }`}>
            <span className="font-medium">{user?.firstName || user?.username}</span>
            {user?.role && (
              <span className={`ml-3 px-2 py-1 rounded text-xs font-medium ${
                user.role === "admin"
                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                  : user.role === "manager"
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
              }`}>
                {user.role}
              </span>
            )}
          </div>
          <button
            onClick={logout}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition ${
              theme === "dark"
                ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            Logout
          </button>
        </div>
      </div>
      {children}
    </>
  );
}

// ============================================================================
// Loading Screen
// ============================================================================

function LoadingScreen({ theme }: { theme: string }) {
  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen flex items-center justify-center ${
        isDark ? "bg-gray-900" : "bg-gray-50"
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

