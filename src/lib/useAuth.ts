import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export interface AuthUser {
  email: string;
  displayName?: string;
}

const DEMO_KEY = "auth_token";

/**
 * Single source of truth for "is someone signed in".
 *
 * Previously each page rolled its own check — one of them looked for a
 * hardcoded `sb-<ref>-auth-token` key belonging to a different Supabase
 * project than the client actually used, so it never matched. Everything
 * now routes through here.
 */
export function readDemoSession(): AuthUser | null {
  try {
    return localStorage.getItem(DEMO_KEY) ? { email: "demo@archagent.app", displayName: "Architect" } : null;
  } catch {
    return null; // private mode / storage disabled
  }
}

export function setDemoSession(on: boolean) {
  try {
    if (on) localStorage.setItem(DEMO_KEY, "1");
    else localStorage.removeItem(DEMO_KEY);
  } catch {
    /* storage unavailable — session is in-memory only for this tab */
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  // `null` = still resolving. Pages must not redirect while this is null,
  // otherwise a slow Supabase round-trip bounces a signed-in user to /login.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const resolve = async () => {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        if (data.session?.user?.email) {
          setUser({
            email: data.session.user.email,
            displayName: data.session.user.user_metadata?.name ?? data.session.user.email.split("@")[0],
          });
          setReady(true);
          return;
        }
      }
      if (!active) return;
      setUser(readDemoSession());
      setReady(true);
    };

    resolve();

    const sub = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user?.email) {
        setUser({
          email: session.user.email,
          displayName: session.user.user_metadata?.name ?? session.user.email.split("@")[0],
        });
        setDemoSession(false);
      } else {
        setUser(readDemoSession());
      }
      setReady(true);
    });

    return () => {
      active = false;
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  return { user, ready, isAuthenticated: !!user };
}

export async function signOut() {
  setDemoSession(false);
  try {
    await supabase?.auth.signOut();
  } catch (err) {
    console.error("Sign out failed:", err);
  }
}
