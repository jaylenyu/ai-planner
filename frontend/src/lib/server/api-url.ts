const rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const normalizedApiUrl = rawApiUrl.replace(/\/+$/, "");

export const SERVER_API_BASE_URL = normalizedApiUrl.endsWith("/api")
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`;

// Direct backend URL for server-side requests to avoid nginx proxy loops.
// Set BACKEND_URL to the internal container hostname (e.g. http://ai-planner-backend-test:4000).
export function getBackendInternalUrl() {
  const rawBackendUrl = (process.env.BACKEND_URL ?? "")
    .trim()
    .replace(/\/+$/, "");

  if (rawBackendUrl) {
    return rawBackendUrl.endsWith("/api")
      ? rawBackendUrl
      : `${rawBackendUrl}/api`;
  }

  return SERVER_API_BASE_URL;
}
