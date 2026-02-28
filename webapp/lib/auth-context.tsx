'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface User {
  email: string;
  name: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGithub: () => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isLoading = status === 'loading';

  const user: User | null = session?.user
    ? {
        email: session.user.email ?? '',
        name: session.user.name ?? '',
        image: session.user.image ?? undefined,
      }
    : null;

  const login = async (email: string, _password: string): Promise<boolean> => {
    // For email/password, use Credentials provider or redirect to GitHub as fallback.
    // Currently GitHub OAuth is the primary auth method.
    const result = await signIn('credentials', {
      email,
      password: _password,
      redirect: false,
    });
    if (result?.ok) {
      router.push('/scan');
      return true;
    }
    return false;
  };

  const loginWithGithub = async (): Promise<boolean> => {
    // This triggers the GitHub OAuth flow via NextAuth
    await signIn('github', { callbackUrl: '/scan' });
    return true;
  };

  const logout = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!session,
        isLoading,
        accessToken: (session?.accessToken as string) ?? null,
        login,
        loginWithGithub,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
