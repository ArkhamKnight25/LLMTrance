/**
 * On the server (RSC, route handlers) we use WEB_API_URL (Docker network: http://api:3232).
 * In the browser we use NEXT_PUBLIC_API_URL (host port: http://localhost:3232).
 */
export function apiBase(): string {
  if (typeof window === "undefined") {
    return (
      process.env.WEB_API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:3232"
    );
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3232";
}
