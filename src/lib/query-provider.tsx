"use client";

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Configure default query options if needed
      // staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Dynamically import DevTools in development mode
const ReactQueryDevtools =
  process.env.NODE_ENV === "development"
    ? React.lazy(() =>
        import("@tanstack/react-query-devtools").then((res) => ({
          default: res.ReactQueryDevtools,
        }))
      )
    : () => null; // Return null in production

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [showDevtools, setShowDevtools] = React.useState(false);

  // Show devtools only on client-side in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      setShowDevtools(true);
    }
  }, []);

  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>
      {children}
      {showDevtools && (
         <React.Suspense fallback={null}>
           <ReactQueryDevtools initialIsOpen={false} />
         </React.Suspense>
      )}
    </QueryClientProvider>
  );
}
