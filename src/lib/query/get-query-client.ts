import { isServer, QueryClient } from "@tanstack/react-query";
import { queryRetryDelay, shouldRetryQuery } from "./query-policy";

const STALE_TIME_MS = 60_000;

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        retry: shouldRetryQuery,
        retryDelay: queryRetryDelay,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * Returns the QueryClient appropriate for the current environment.
 *
 * - Server: always a fresh client, so cached state never leaks across requests.
 * - Browser: a singleton, so re-renders / Suspense boundaries reuse one cache.
 *
 * This is the pattern recommended by the TanStack Query App Router guide.
 */
export function getQueryClient(): QueryClient {
  if (isServer) {
    return makeQueryClient();
  }
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
