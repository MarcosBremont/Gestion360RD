"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { auth, firebaseConfigured } from "./client";

export type Role = "citizen" | "editor" | "brigade" | "admin";
interface Ctx {
  user: User | null;
  role: Role;
  loading: boolean;
}

const AuthCtx = createContext<Ctx>({ user: null, role: "citizen", loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Ctx>({ user: null, role: "citizen", loading: firebaseConfigured });

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(auth(), async (u) => {
      let role: Role = "citizen";
      if (u) role = ((await u.getIdTokenResult()).claims.role as Role | undefined) ?? "citizen";
      setState({ user: u, role, loading: false });
    });
  }, []);

  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
