import React, { createContext, useContext, ReactNode } from "react";

type ViewType = "manager" | "admin" | "outcomes" | "mapping" | "performance" | "super-admin" | "register";

interface NavigationContextType {
  setView: (view: ViewType) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ 
  children, 
  setView 
}: { 
  children: ReactNode; 
  setView: (view: ViewType) => void;
}) {
  return (
    <NavigationContext.Provider value={{ setView }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return context;
}

