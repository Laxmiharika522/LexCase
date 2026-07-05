import axios from "axios";

// Baked in at build time. Empty string = same-origin /api (nginx proxy on EC2).
// Local dev defaults to localhost:8001 when .env is missing.
const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ??
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:8001");
export const API_BASE = BACKEND_URL
  ? `${BACKEND_URL.replace(/\/$/, "")}/api`
  : "/api";

export const api = axios.create({
  baseURL: API_BASE,
  // JWT is sent via Authorization header — not cookies
  withCredentials: false,
});

export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (detail == null) return err?.message || "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
