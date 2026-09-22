import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, type NavigateOptions } from "react-router-dom";

interface LoadingContextType {
  isSyncing: boolean;
  startSyncSequence: (url: string, options?: NavigateOptions) => void;
}

const LoadingContext = createContext<LoadingContextType>({
  isSyncing: false,
  startSyncSequence: () => {},
});

export const useLoading = () => useContext(LoadingContext);

/**
 * How long the transition veil stays up *after* the route has already
 * changed. Purely cosmetic — navigation itself is immediate.
 */
const VEIL_MS = 380;

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const navigate = useNavigate();
  const timerRef = useRef<number | null>(null);
  const pendingRef = useRef(false);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const startSyncSequence = useCallback(
    (url: string, options?: NavigateOptions) => {
      if (pendingRef.current) return; // ignore double-clicks
      pendingRef.current = true;

      setIsSyncing(true);

      // Navigate on the next frame so the veil has painted first — this keeps
      // the transition readable without making the user wait for it.
      requestAnimationFrame(() => {
        navigate(url, options);
        window.scrollTo({ top: 0, behavior: "auto" });

        timerRef.current = window.setTimeout(() => {
          setIsSyncing(false);
          pendingRef.current = false;
          timerRef.current = null;
        }, VEIL_MS);
      });
    },
    [navigate],
  );

  return (
    <LoadingContext.Provider value={{ isSyncing, startSyncSequence }}>
      {children}
    </LoadingContext.Provider>
  );
}
