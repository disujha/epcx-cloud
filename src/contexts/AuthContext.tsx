"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  getRedirectResult,
  getAdditionalUserInfo,
  updateProfile,
  type User,
  type UserCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import {
  signInWithEmail,
  registerWithEmail,
  signInWithGoogle,
  signOut,
  getFriendlyAuthErrorMessage,
} from "@/lib/firebase/auth";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  redirectError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  signInGoogle: () => Promise<UserCredential | void>;
  logout: () => Promise<void>;
  clearRedirectError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function syncSessionCookie(isAuthenticated: boolean) {
  if (typeof document === "undefined") return;
  if (isAuthenticated) {
    document.cookie = "__session=active; path=/; max-age=2592000; SameSite=Lax";
  } else {
    document.cookie = "__session=; path=/; max-age=0; SameSite=Lax";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirectError, setRedirectError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Process redirect result if returning from a mobile OAuth redirect flow
    getRedirectResult(auth)
      .then(async (result) => {
        if (!isMounted) return;
        if (result) {
          syncSessionCookie(true);
          const profileName = getAdditionalUserInfo(result)?.profile?.name;
          if (!result.user.displayName && typeof profileName === "string" && profileName.trim()) {
            await updateProfile(result.user, { displayName: profileName.trim() });
          }
          setUser(result.user);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        console.error("Firebase redirect result error:", err);
        setRedirectError(getFriendlyAuthErrorMessage(err));
      });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!isMounted) return;
      syncSessionCookie(Boolean(firebaseUser));
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    await signInWithEmail(email, password);
  }

  async function register(email: string, password: string, name: string) {
    await registerWithEmail(email, password, name);
  }

  async function signInGoogle() {
    return signInWithGoogle();
  }

  async function logout() {
    syncSessionCookie(false);
    await signOut();
  }

  function clearRedirectError() {
    setRedirectError(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        redirectError,
        signIn,
        register,
        signInGoogle,
        logout,
        clearRedirectError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
