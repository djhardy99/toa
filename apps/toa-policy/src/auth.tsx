import { createContext, useContext, useState, type ReactNode } from "react";
import { Navigate, Outlet } from "react-router";

type Auth = { user: string | null; login: (user: string) => void; logout: () => void };

const AuthContext = createContext<Auth | null>(null);

// ponytail: the signed-in user is just a name in localStorage. Replace with a session from the API
// (local admin first, then OIDC per docs/design.md) once a server exists.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(() => localStorage.getItem("user"));

  const login = (name: string) => {
    localStorage.setItem("user", name);
    setUser(name);
  };
  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  return <AuthContext value={{ user, login, logout }}>{children}</AuthContext>;
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside AuthProvider");
  return auth;
}

// Layout route: renders the nested routes only when signed in.
export function RequireAuth() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
