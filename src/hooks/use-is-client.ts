
"use client";

import * as React from 'react';

/**
 * Hook to determine if the component is mounted on the client.
 * Useful for avoiding hydration mismatches with server-rendered content.
 * @returns {boolean} True if the component is running on the client, false otherwise.
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
