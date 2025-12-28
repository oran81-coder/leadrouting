import { useState, useEffect } from "react";
import { adminMondayStatus } from "../api";

export function useMondayConnection() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkConnection() {
      try {
        const status = await adminMondayStatus();
        setIsConnected(status.connected);
      } catch (error) {
        console.error("Error checking Monday connection:", error);
        setIsConnected(false);
      } finally {
        setLoading(false);
      }
    }
    
    checkConnection();
  }, []);

  return { isConnected, loading };
}

