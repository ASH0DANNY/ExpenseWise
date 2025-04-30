
"use client";

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Configure default query options if needed
      staleTime: 1000 * 60 * 1, // 1 minute default stale time
      refetchOnWindowFocus: false, // Consider disabling aggressive refetches
    },
  },
});

// Dynamically import DevTools only in development and on the client
const ReactQueryDevtools =
  process.env.NODE_ENV === "development"
    ? React.lazy(() =>
        import("@tanstack/react-query-devtools").then((res) => ({
          default: res.ReactQueryDevtools,
        }))
      )
    : () => null;

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    // Ensure this runs only on the client side
    setIsClient(true);
  }, []);

  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Render DevTools only on the client and in development */}
      {isClient && process.env.NODE_ENV === 'development' && (
         <React.Suspense fallback={null}>
           <ReactQueryDevtools initialIsOpen={false} position="bottom" />
         </React.Suspense>
      )}
    </QueryClientProvider>
  );
}
