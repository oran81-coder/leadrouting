import React from "react";
import ReactDOM from "react-dom/client";
import App from "./ui/App";
import { ThemeProvider } from "./ui/ThemeContext";
import { ToastProvider } from "./ui/ToastContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
