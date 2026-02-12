// Centralized Endpoint Configuration
const API_ENDPOINTS = {
  GET_PROJECTS: "/get-projects",
  UPLOAD_FILE: "/process-data",
};

const DEFAULT_API_BASE = "/api";
const DEFAULT_RETRY_DELAYS_MS = [1000, 2000, 4000];

export class ApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ApiError";
    this.status = details.status || 0;
    this.body = details.body;
    this.method = details.method || "GET";
    this.url = details.url || "";
    this.headers = details.headers || {};
  }
}

export class AuthenticationError extends ApiError {
  constructor(message, details = {}) {
    super(message, details);
    this.name = "AuthenticationError";
  }
}

export class ServerError extends ApiError {
  constructor(message, details = {}) {
    super(message, details);
    this.name = "ServerError";
  }
}

function normalizeApiBase(apiBase) {
  const base = String(apiBase || DEFAULT_API_BASE).trim() || DEFAULT_API_BASE;
  return base.replace(/\/+$/, "");
}

function buildUrl(apiBase, path, query = {}) {
  const base = normalizeApiBase(apiBase);
  const normalizedPath = String(path || "").startsWith("/") ? String(path) : `/${String(path || "")}`;
  const url = `${base}${normalizedPath}`;

  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value == null) return;
    const asString = String(value).trim();
    if (!asString.length) return;
    params.set(key, asString);
  });

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

async function parseResponseBody(response) {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text ? { raw: text } : null;
  } catch {
    return null;
  }
}

function pickErrorMessage(status, body, fallback) {
  if (body && typeof body === "object") {
    if (typeof body.error === "string" && body.error.trim()) return body.error;
    if (typeof body.message === "string" && body.message.trim()) return body.message;
  }
  return fallback || `HTTP ${status}`;
}

function toHeadersObject(headers) {
  const out = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function createHttpError(response, body, requestInfo) {
  const status = response.status;
  const message = pickErrorMessage(status, body, `Request failed with status ${status}`);
  const details = {
    status,
    body,
    method: requestInfo.method,
    url: requestInfo.url,
    headers: toHeadersObject(response.headers),
  };

  if (status === 401) return new AuthenticationError(message, details);
  if (status >= 500) return new ServerError(message, details);
  return new ApiError(message, details);
}

function shouldRetry(error) {
  if (!error) return false;
  if (error.name === "AbortError") return false;
  if (error instanceof AuthenticationError) return false;
  if (error instanceof ServerError) return true;
  if (error instanceof ApiError) {
    return error.status === 408 || error.status === 429;
  }
  return true;
}

function sleep(ms, signal) {
  if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

function defaultFetchImpl(...args) {
  return fetch(...args);
}

export function createApiClient({ authToken, apiBase = DEFAULT_API_BASE, fetchImpl = defaultFetchImpl } = {}) {
  let token = authToken || "";

  function getToken() {
    return typeof token === "function" ? token() : token;
  }

  function setAuthToken(nextToken) {
    token = nextToken || "";
  }

  async function request({ method = "GET", path, query, body, signal, retry = false, retryDelays = DEFAULT_RETRY_DELAYS_MS } = {}) {
    const upperMethod = String(method || "GET").toUpperCase();
    const url = buildUrl(apiBase, path, query);
    const headers = { Accept: "application/json" };

    const bearerToken = getToken();
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

    let payload = body;
    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    let attempt = 0;
    while (true) {
      try {
        const response = await fetchImpl(url, {
          method: upperMethod,
          headers,
          body: upperMethod === "GET" ? undefined : payload,
          signal,
        });

        const responseBody = await parseResponseBody(response);
        if (!response.ok) throw createHttpError(response, responseBody, { method: upperMethod, url });
        return responseBody;
      } catch (error) {
        const canRetry = retry && upperMethod === "GET" && shouldRetry(error) && attempt < retryDelays.length;
        if (!canRetry) throw error;
        await sleep(retryDelays[attempt], signal);
        attempt += 1;
      }
    }
  }

  async function getProjects(
    { cursor = null, pageSize = 50, status = "", technicianId = "", siteId = "" } = {},
    { signal } = {}
  ) {
    return request({
      method: "GET",
      path: API_ENDPOINTS.GET_PROJECTS,
      query: {
        cursor,
        page_size: pageSize,
        status,
        technician_id: technicianId,
        site_id: siteId,
      },
      signal,
      retry: true,
    });
  }

  async function uploadFile({ file, projectId, table = "sites", fields = {} } = {}, { signal } = {}) {
    if (!file) throw new ApiError("file is required", { status: 0 });

    const formData = new FormData();
    formData.append("file", file);
    if (projectId) formData.append("project_id", String(projectId));
    if (table) formData.append("table", String(table));

    Object.entries(fields || {}).forEach(([key, value]) => {
      if (value == null) return;
      formData.append(key, String(value));
    });

    return request({
      method: "POST",
      path: API_ENDPOINTS.UPLOAD_FILE,
      body: formData,
      signal,
      retry: false,
    });
  }

  return { getToken, setAuthToken, getProjects, uploadFile, request };
}
