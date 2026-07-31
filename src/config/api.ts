/**
 * API Configuration
 */

export const API_BASE_URL = "http://localhost:8000";
export const API_VERSION = "/api/v1";

export const API_ENDPOINTS = {
  TRANSFORM_AUTO: `${API_BASE_URL}${API_VERSION}/transform/auto`,
  AUTH_LOGIN: `${API_BASE_URL}${API_VERSION}/auth/login`,
  // Admin
  ADMIN_SCHEMAS: `${API_BASE_URL}${API_VERSION}/admin/schemas`,
  ADMIN_RULES: `${API_BASE_URL}${API_VERSION}/admin/rules`,
  ADMIN_EXAMPLES: `${API_BASE_URL}${API_VERSION}/admin/examples`,
  ADMIN_SNAPSHOT: `${API_BASE_URL}${API_VERSION}/admin/snapshot`,
  ADMIN_SNAPSHOTS: `${API_BASE_URL}${API_VERSION}/admin/snapshots`,
  ADMIN_PRACTITIONERS: `${API_BASE_URL}${API_VERSION}/admin/practitioners`,
  ADMIN_APPOINTMENTS: `${API_BASE_URL}${API_VERSION}/admin/appointments`,
};

export const API_TIMEOUT = 30000;
// LLM transforms can take 20-60 seconds; admin/auth calls should fail fast.
export const TRANSFORM_TIMEOUT = 300000; // 5 min
const TOKEN_KEY = "auth_token";

export const getApiHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number;
}

export async function apiRequest<T>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { timeoutMs = API_TIMEOUT, signal: externalSignal, ...rest } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  // Forward external aborts (e.g. user cancel) to the internal controller.
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onExternalAbort);

  try {
    const response = await fetch(url, {
      ...rest,
      headers: { ...getApiHeaders(), ...rest.headers },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", onExternalAbort);

    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new ApiError(
        errorBody.detail || errorBody.message || `HTTP ${response.status}`,
        response.status,
        errorBody
      );
    }
    if (response.status === 204) return undefined as T;
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", onExternalAbort);
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      const msg = externalSignal?.aborted ? "Cancelled" : "Request timeout";
      throw new ApiError(msg, externalSignal?.aborted ? 0 : 408);
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Network error",
      0
    );
  }
}

// --- Transform API ---

export interface TransformResponse {
  ok?: boolean;
  schema?: string;
  saved_id?: number;
  transformed?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function transformRecord(
  record: Record<string, unknown>,
  options: { signal?: AbortSignal } = {}
): Promise<TransformResponse> {
  return apiRequest<TransformResponse>(API_ENDPOINTS.TRANSFORM_AUTO, {
    method: "POST",
    body: JSON.stringify(record),
    timeoutMs: TRANSFORM_TIMEOUT,
    signal: options.signal,
  });
}

export interface ApproveBody {
  schema_name: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

export async function approveTransform(
  body: ApproveBody
): Promise<{ ok: boolean; example_id: number }> {
  return apiRequest(`${API_BASE_URL}${API_VERSION}/transform/approve`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// --- Auth API ---

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  message?: string;
}

export async function loginUser(
  credentials: LoginRequest
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(API_ENDPOINTS.AUTH_LOGIN, {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

// --- Admin API: schemas ---

export interface SchemaDef {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const listSchemas = () =>
  apiRequest<SchemaDef[]>(API_ENDPOINTS.ADMIN_SCHEMAS);

export const createSchema = (body: { name: string; description: string }) =>
  apiRequest<SchemaDef>(API_ENDPOINTS.ADMIN_SCHEMAS, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateSchema = (
  id: number,
  body: Partial<{ name: string; description: string; is_active: boolean }>
) =>
  apiRequest<SchemaDef>(`${API_ENDPOINTS.ADMIN_SCHEMAS}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const deleteSchema = (id: number) =>
  apiRequest<void>(`${API_ENDPOINTS.ADMIN_SCHEMAS}/${id}`, { method: "DELETE" });

// --- Admin API: rules ---

export interface Rule {
  id: number;
  schema_name: string | null;
  name: string;
  text: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const listRules = (schemaName?: string) => {
  const url = schemaName
    ? `${API_ENDPOINTS.ADMIN_RULES}?schema=${encodeURIComponent(schemaName)}`
    : API_ENDPOINTS.ADMIN_RULES;
  return apiRequest<Rule[]>(url);
};

export const createRule = (body: {
  schema_name: string | null;
  name: string;
  text: string;
}) =>
  apiRequest<Rule>(API_ENDPOINTS.ADMIN_RULES, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateRule = (
  id: number,
  body: Partial<{ schema_name: string | null; name: string; text: string; is_active: boolean }>
) =>
  apiRequest<Rule>(`${API_ENDPOINTS.ADMIN_RULES}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const deleteRule = (id: number) =>
  apiRequest<void>(`${API_ENDPOINTS.ADMIN_RULES}/${id}`, { method: "DELETE" });

// --- Admin API: examples ---

export interface Example {
  id: number;
  schema_name: string;
  before_json: Record<string, unknown>;
  after_json: Record<string, unknown>;
  source: "seed" | "manual" | "transform_approved";
  approved_by: string | null;
  created_at: string;
}

export const listExamples = (schemaName?: string) => {
  const url = schemaName
    ? `${API_ENDPOINTS.ADMIN_EXAMPLES}?schema=${encodeURIComponent(schemaName)}`
    : API_ENDPOINTS.ADMIN_EXAMPLES;
  return apiRequest<Example[]>(url);
};

export const createExample = (body: {
  schema_name: string;
  before_json: Record<string, unknown>;
  after_json: Record<string, unknown>;
  source?: "seed" | "manual" | "transform_approved";
}) =>
  apiRequest<Example>(API_ENDPOINTS.ADMIN_EXAMPLES, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateExample = (
  id: number,
  body: Partial<{
    schema_name: string;
    before_json: Record<string, unknown>;
    after_json: Record<string, unknown>;
  }>
) =>
  apiRequest<Example>(`${API_ENDPOINTS.ADMIN_EXAMPLES}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const deleteExample = (id: number) =>
  apiRequest<void>(`${API_ENDPOINTS.ADMIN_EXAMPLES}/${id}`, { method: "DELETE" });

// --- Admin API: snapshots ---

export interface Snapshot {
  id: number;
  name: string;
  items: Array<Record<string, unknown>>;
  created_at: string;
}

export const listSnapshots = () =>
  apiRequest<Snapshot[]>(API_ENDPOINTS.ADMIN_SNAPSHOTS);

export const takeSnapshot = (name: string) =>
  apiRequest<Snapshot>(API_ENDPOINTS.ADMIN_SNAPSHOT, {
    method: "POST",
    body: JSON.stringify({ name }),
  });

// --- Admin API: records (transformed output) ---

export interface PractitionerRecord {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  practice_id: number | null;
  phone_number: string | null;
  transformed_json: Record<string, unknown>;
  created_at: string;
}

export interface AppointmentRecord {
  id: number;
  practitioner_id: number | null;
  patient_id: number | null;
  location_id: number | null;
  status: string | null;
  start_time: string | null;
  end_time: string | null;
  title: string | null;
  description: string | null;
  transformed_json: Record<string, unknown>;
  created_at: string;
}

export interface Paged<T> {
  total: number;
  limit: number;
  offset: number;
  items: T[];
}

export const listPractitioners = (params: { limit?: number; offset?: number; q?: string } = {}) => {
  const search = new URLSearchParams();
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.offset != null) search.set("offset", String(params.offset));
  if (params.q) search.set("q", params.q);
  const qs = search.toString();
  const url = qs ? `${API_ENDPOINTS.ADMIN_PRACTITIONERS}?${qs}` : API_ENDPOINTS.ADMIN_PRACTITIONERS;
  return apiRequest<Paged<PractitionerRecord>>(url);
};

export const listAppointments = (
  params: { limit?: number; offset?: number; status?: string; practitioner_id?: number } = {}
) => {
  const search = new URLSearchParams();
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.offset != null) search.set("offset", String(params.offset));
  if (params.status) search.set("status", params.status);
  if (params.practitioner_id != null) search.set("practitioner_id", String(params.practitioner_id));
  const qs = search.toString();
  const url = qs ? `${API_ENDPOINTS.ADMIN_APPOINTMENTS}?${qs}` : API_ENDPOINTS.ADMIN_APPOINTMENTS;
  return apiRequest<Paged<AppointmentRecord>>(url);
};
