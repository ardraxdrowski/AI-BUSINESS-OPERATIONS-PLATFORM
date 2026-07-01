/**
 * Generic API client wrapper to fetch data from endpoints.
 * Handles JSON serialization, parses responses, and throws clean errors.
 */
export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch (_) {
      errorMessage = await response.text();
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses
  if (response.status === 204) {
    return {} as T;
  }

  try {
    return await response.json();
  } catch (_) {
    return {} as T;
  }
}
