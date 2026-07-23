'use client';

import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster, toast } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onError: (error: any) => {
            const rawMessage = error?.response?.data?.message || error.message || 'An error occurred';
            const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
            toast.error(message);
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
