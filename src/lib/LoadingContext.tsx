import { createContext, useContext, useState, ReactNode } from "react";
import { useNavigate, NavigateOptions } from "react-router-dom";

interface LoadingContextType {
  isSyncing: boolean;
  startSyncSequence: (url: string, options?: NavigateOptions) => void;
}

const LoadingContext = createContext<LoadingContextType>({
  isSyncing: false,
  startSyncSequence: () => {},
});

export const useLoading = () => useContext(LoadingContext);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const navigate = useNavigate();

  const startSyncSequence = (url: string, options?: NavigateOptions) => {
    if (isSyncing) {
      console.log("[Sync] Already syncing, ignoring duplicate call to:", url);
      return;
    }
    
    console.log("[Sync] Starting sequence to:", url);
    setIsSyncing(true);
    
    // Technical sequence timer - balance of perception and speed
    setTimeout(() => {
      console.log("[Sync] Navigating now...");
      navigate(url, options);
      
      // Increased handoff overlap to 1000ms to allow next page to mount and start entrance
      setTimeout(() => {
        setIsSyncing(false);
        console.log("[Sync] Sequence complete.");
      }, 1000);
    }, 2800);
  };

  return (
    <LoadingContext.Provider value={{ isSyncing, startSyncSequence }}>
      {children}
    </LoadingContext.Provider>
  );
}
