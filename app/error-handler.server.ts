export type ErrorCode = "UNAUTHORIZED" | "NOT_FOUND" | "VALIDATION_ERROR" | "RATE_LIMITED" | "INTERNAL_ERROR" | "FORBIDDEN" | "BILLING_ERROR" | "SHOPIFY_ERROR";

const STATUS_MAP: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  FORBIDDEN: 403,
  BILLING_ERROR: 402,
  SHOPIFY_ERROR: 502,
};

/**
 * Create a standardized error response for API routes.
 */
export function errorResponse(code: ErrorCode, message: string, details?: unknown): Response {
  const status = STATUS_MAP[code];
  const body = { success: false, error: code, message };
  if (details) Object.assign(body, { details });
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Create a standardized success response for API routes.
 */
export function successResponse<T = unknown>(data?: T, status = 200): Response {
  const body = { success: true, ...(data as object || {}) };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
