import React, { ReactNode } from "react";
import { useAuth, User } from "./AuthContext";
import { useTheme } from "./ThemeContext";

// ============================================================================
// Types
// ============================================================================

interface ProtectedRouteProps {
  children: ReactNode;
  requireRoles?: User["role"][];
  fallback?: ReactNode;
}

// ============================================================================
// ProtectedRoute Component
// ============================================================================

export function ProtectedRoute({
  children,
  requireRoles,
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();
  const { theme } = useTheme();

  // Check if auth is enabled
  const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED === "true";

  // If auth is disabled, render children directly
  if (!AUTH_ENABLED) {
    return <>{children}</>;
  }

  // Show loading state
  if (isLoading) {
    return <LoadingScreen theme={theme} />;
  }

  // Not authenticated - show fallback or default unauthorized message
  if (!isAuthenticated) {
    return fallback ? <>{fallback}</> : <UnauthorizedScreen theme={theme} />;
  }

  // Check role requirements
  if (requireRoles && !hasRole(requireRoles)) {
    return <ForbiddenScreen theme={theme} userRole={user?.role} />;
  }

  // All checks passed - render protected content
  return <>{children}</>;
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
        <svg
          className="animate-spin h-12 w-12 mx-auto text-blue-600"
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

// ============================================================================
// Unauthorized Screen (Not Logged In)
// ============================================================================

function UnauthorizedScreen({ theme }: { theme: string }) {
  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 ${
        isDark ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className="text-center max-w-md">
        <div className="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <svg
            className="h-12 w-12 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2
          className={`mt-6 text-2xl font-bold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Authentication Required
        </h2>
        <p
          className={`mt-2 text-sm ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          You need to be logged in to access this page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Forbidden Screen (Insufficient Permissions)
// ============================================================================

function ForbiddenScreen({
  theme,
  userRole,
}: {
  theme: string;
  userRole?: string;
}) {
  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 ${
        isDark ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className="text-center max-w-md">
        <div className="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
          <svg
            className="h-12 w-12 text-yellow-600 dark:text-yellow-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2
          className={`mt-6 text-2xl font-bold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Access Denied
        </h2>
        <p
          className={`mt-2 text-sm ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          You don't have permission to access this page.
        </p>
        {userRole && (
          <p
            className={`mt-2 text-xs ${
              isDark ? "text-gray-500" : "text-gray-500"
            }`}
          >
            Your role: <span className="font-semibold">{userRole}</span>
          </p>
        )}
        <button
          onClick={() => (window.location.href = "/")}
          className="mt-6 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg shadow transition"
        >
          Go to Home
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Utility: RequireRole HOC (for class components if needed)
// ============================================================================

export function RequireRole(
  Component: React.ComponentType,
  roles: User["role"][]
) {
  return function ProtectedComponent(props: any) {
    return (
      <ProtectedRoute requireRoles={roles}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

