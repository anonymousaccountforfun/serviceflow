'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  avatarUrl: string | null;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  settings: any;
}

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  isNewUser: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();
  const { user: clerkUser } = useUser();

  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncUser = async () => {
    if (!isSignedIn) {
      setUser(null);
      setOrganization(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Call sync endpoint to ensure user exists in database
      const response = await fetch('/api/auth/sync', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to sync user');
      }

      const data = await response.json();

      setUser(data.user);
      setOrganization(data.organization);
      setIsNewUser(data.isNewUser || false);
    } catch (err) {
      console.error('Auth sync error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Sync user when Clerk auth state changes
  useEffect(() => {
    if (clerkLoaded) {
      syncUser();
    }
  }, [isSignedIn, clerkLoaded, clerkUser?.id]);

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isLoading: !clerkLoaded || isLoading,
        isNewUser,
        error,
        refetch: syncUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// Helper hook that provides user display info
export function useCurrentUser() {
  const { user, organization, isLoading } = useAuthContext();

  const displayName = user
    ? user.firstName
      ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
      : user.email.split('@')[0]
    : null;

  const initials = user
    ? user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user.email.substring(0, 2).toUpperCase()
    : null;

  return {
    user,
    organization,
    isLoading,
    displayName,
    initials,
  };
}
