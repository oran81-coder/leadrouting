import React from "react";
import ReactDOM from "react-dom/client";
import App from "./ui/App";
import { AppWithAuth } from "./ui/AppWithAuth";
import ErrorBoundary from "./ui/ErrorBoundary";
import { PerformanceMonitor } from "./ui/PerformanceMonitor";
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
        console.error("App Error:", error, errorInfo);
      }}
    >
      <PerformanceMonitor id="App-Root">
        <AppWithAuth>
          <App />
        </AppWithAuth>
      </PerformanceMonitor>
    </ErrorBoundary>
  </React.StrictMode>
);
