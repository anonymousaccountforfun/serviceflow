'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { AuthProvider, useAuthContext } from './auth/context';
import { api } from './api';

// Inner component that sets up API client with auth
function ApiSetup({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const { organization } = useAuthContext();

  useEffect(() => {
    // Set up the auth token getter for API client
    api.setAuthTokenGetter(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
  }, [getToken]);

  useEffect(() => {
    // Set organization ID when available
    if (organization?.id) {
      api.setOrganizationId(organization.id);
    }
  }, [organization?.id]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiSetup>{children}</ApiSetup>
      </AuthProvider>
    </QueryClientProvider>
  );
}
