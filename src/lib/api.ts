import { ofetch, type FetchOptions } from "ofetch";

const apiBaseURL = import.meta.env.VITE_API_BASE_URL?.trim() || "/api";

export const api = ofetch.create({
  baseURL: apiBaseURL,
  timeout: 15_000,
  headers: {
    Accept: "application/json",
  },
});

export function apiRequest<T>(url: string, options?: FetchOptions<"json">) {
  return api<T>(url, options);
}
