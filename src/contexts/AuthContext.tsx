import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

const TOKEN_KEY = "auth_token";
const EMAIL_KEY = "auth_email";

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  token: string | null;
  signIn: (email: string, token: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem(EMAIL_KEY));

  const signIn = useCallback((email: string, jwt: string) => {
    localStorage.setItem(TOKEN_KEY, jwt);
    localStorage.setItem(EMAIL_KEY, email);
    setToken(jwt);
    setUserEmail(email);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    setToken(null);
    setUserEmail(null);
  }, []);

  // Listen for 401-triggered sign-outs from outside React (api.ts).
  useEffect(() => {
    const onUnauth = () => signOut();
    window.addEventListener("auth:unauthorized", onUnauth);
    return () => window.removeEventListener("auth:unauthorized", onUnauth);
  }, [signOut]);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated: !!token, userEmail, token, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
