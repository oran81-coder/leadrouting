import React from "react";
import ReactDOM from "react-dom/client";
import App from "./ui/App";
import { ThemeProvider } from "./ui/ThemeContext";
import { ToastProvider } from "./ui/ToastContext";
import ErrorBoundary from "./ui/ErrorBoundary";
import { PerformanceMonitor } from "./ui/PerformanceMonitor";
import { AuthProvider } from "./ui/AuthContext";
import { AppWithAuth } from "./ui/AppWithAuth";
import "./index.css";

// Set default API key if not already set (for development)
if (!localStorage.getItem("apiKey")) {
  localStorage.setItem("apiKey", "dev_key_123");
  console.log("✅ API Key initialized with dev_key_123");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to external service in production (e.g., Sentry)
        console.error("App Error:", error, errorInfo);
      }}
    >
      <PerformanceMonitor id="App-Root">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <AppWithAuth>
                <App />
              </AppWithAuth>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </PerformanceMonitor>
    </ErrorBoundary>
  </React.StrictMode>
);
