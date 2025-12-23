import React, { createContext, useContext, useState, useCallback } from "react";
import { ToastContainer } from "./Toast";
import type { ToastType, ToastProps } from "./Toast";

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info", duration = 5000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    
    setToasts((prev) => {
      // Limit to 3 toasts maximum
      const newToasts = [...prev, { id, message, type, duration, onClose: () => {} }];
      return newToasts.slice(-3);
    });
  }, []);

  const handleClose = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const toastsWithClose = toasts.map((toast) => ({
    ...toast,
    onClose: handleClose,
  }));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toastsWithClose} onClose={handleClose} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToastContext must be used within ToastProvider");
  }
  return context;
}

