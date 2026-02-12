import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createApiClient, AuthenticationError, ServerError } from "../services/apiService";

const STATUS_OPTIONS = [
  "",
  "NEW",
  "ASSIGNED",
  "EN_ROUTE",
  "ON_SITE",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETE",
  "CANCELED",
];

const PAGE_SIZE = 50;

function mergeRows(existing, incoming) {
  const map = new Map(existing.map((row) => [row.id, row]));
  incoming.forEach((row) => { map.set(row.id, row); });
  return Array.from(map.values());
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

export default function ProjectsDashboard({
  authToken,
  currentUserId,
  initialStatus = "",
  initialTechnicianId = "",
}) {
  const [rows, setRows] = useState([]);
  const [role, setRole] = useState("viewer");
  const [status, setStatus] = useState(initialStatus);
  const [technicianId, setTechnicianId] = useState(initialTechnicianId);
  const [search, setSearch] = useState("");
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const sentinelRef = useRef(null);
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);

  const apiClient = useMemo(() => createApiClient({ authToken }), [authToken]);

  const fetchProjects = useCallback(async ({ cursor = null, append = false } = {}) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const requestId = ++requestIdRef.current;
    if (append) setLoadingMore(true);
    else setLoading(true);

    setError(null);

    try {
      const payload = await apiClient.getProjects(
        {
          cursor,
          pageSize: PAGE_SIZE,
          status,
          technicianId,
        },
        { signal: abortControllerRef.current.signal }
      );

      if (requestId !== requestIdRef.current) return;

      const incoming = Array.isArray(payload?.data) ? payload.data : [];

      setRole(String(payload?.role || "viewer").toLowerCase());
      setNextCursor(payload?.next_cursor || null);
      setHasMore(Boolean(payload?.has_more));

      setRows((prev) => append ? mergeRows(prev, incoming) : incoming);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      if (err.name === "AbortError") return;

      if (err instanceof AuthenticationError) {
        setError("Session expired. Please log in again.");
      } else if (err instanceof ServerError) {
        setError("Server error. Please try again later.");
      } else {
        setError(err.message || "Failed to load work orders.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [apiClient, status, technicianId]);

  useEffect(() => {
    setRows([]);
    setNextCursor(null);
    setHasMore(false);
    fetchProjects({ cursor: null, append: false });
  }, [fetchProjects]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first?.isIntersecting && hasMore && nextCursor && !loading && !loadingMore) {
        fetchProjects({ cursor: nextCursor, append: true });
      }
    }, { rootMargin: "200px" });

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchProjects, hasMore, loading, loadingMore, nextCursor]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const customer = String(row.customer_label || "").toLowerCase();
      const address = String(row.address || "").toLowerCase();
      return customer.includes(q) || address.includes(q);
    });
  }, [rows, search]);

  const canFilterTechnician = role === "admin";
  const showNotesColumn = role !== "viewer";

  const technicianScopeMismatch = useMemo(() => {
    if (role !== "technician" || !currentUserId) return false;
    return rows.some((row) => row.assigned_to_user_id && row.assigned_to_user_id !== currentUserId);
  }, [currentUserId, role, rows]);

  return (
    <section style={{ padding: 16 }}>
      <header style={{ marginBottom: 12 }}>
        <h2 style={{ margin: "0 0 8px" }}>Work Orders Dashboard</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          <label>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Status</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: "100%" }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option || "ALL"} value={option}>{option || "ALL"}</option>
              ))}
            </select>
          </label>

          <label>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Search (client-side)</div>
            <input
              type="text"
              placeholder="Customer or address"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%" }}
            />
          </label>

          <label>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Technician ID</div>
            <input
              type="text"
              placeholder={canFilterTechnician ? "UUID" : "Admin only"}
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              disabled={!canFilterTechnician}
              style={{ width: "100%" }}
            />
          </label>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
          Role: <strong>{role}</strong>
          {role === "technician" ? " (showing assigned work orders only)" : ""}
          {role === "viewer" ? " (notes hidden)" : ""}
        </div>

        {technicianScopeMismatch ? (
          <div style={{ marginTop: 6, fontSize: 12, color: "#991b1b" }}>
            Warning: received rows outside technician scope.
          </div>
        ) : null}
      </header>

      {error ? (
        <div style={{ marginBottom: 12, padding: 10, border: "1px solid #b91c1c", background: "#fee2e2", color: "#7f1d1d" }}>
          <div>{error}</div>
          <button
            type="button"
            onClick={() => fetchProjects({ cursor: null, append: false })}
            style={{ marginTop: 8 }}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div style={{ overflowX: "auto", border: "1px solid #ddd" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
          <thead>
            <tr>
              <th align="left">Status</th>
              <th align="left">Type</th>
              <th align="left">Client</th>
              <th align="left">Location</th>
              <th align="left">Assigned To</th>
              <th align="left">Priority</th>
              <th align="left">Created</th>
              {showNotesColumn ? <th align="left">Notes</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`}>
                  <td colSpan={showNotesColumn ? 8 : 7} style={{ padding: "10px 8px", borderTop: "1px solid #eee", opacity: 0.6 }}>
                    Loading...
                  </td>
                </tr>
              ))
            ) : visibleRows.length ? (
              visibleRows.map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: "8px", borderTop: "1px solid #eee" }}>{row.status || "-"}</td>
                  <td style={{ padding: "8px", borderTop: "1px solid #eee" }}>{row.type || "-"}</td>
                  <td style={{ padding: "8px", borderTop: "1px solid #eee" }}>{row.customer_label || "-"}</td>
                  <td style={{ padding: "8px", borderTop: "1px solid #eee" }}>{row.address || "-"}</td>
                  <td style={{ padding: "8px", borderTop: "1px solid #eee" }}>{row.assigned_to_user_id || "-"}</td>
                  <td style={{ padding: "8px", borderTop: "1px solid #eee" }}>{row.priority ?? "-"}</td>
                  <td style={{ padding: "8px", borderTop: "1px solid #eee" }}>{formatDate(row.created_at)}</td>
                  {showNotesColumn ? <td style={{ padding: "8px", borderTop: "1px solid #eee" }}>{row.notes || "-"}</td> : null}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={showNotesColumn ? 8 : 7} style={{ padding: "10px 8px", borderTop: "1px solid #eee" }}>
                  No work orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div ref={sentinelRef} style={{ height: 1 }} />

      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Showing {visibleRows.length} loaded row(s){search.trim() ? " (filtered)" : ""}.
        </div>
        {hasMore ? (
          <button
            type="button"
            onClick={() => fetchProjects({ cursor: nextCursor, append: true })}
            disabled={loadingMore || !nextCursor}
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        ) : (
          <span style={{ fontSize: 12, opacity: 0.7 }}>No more rows</span>
        )}
      </div>
    </section>
  );
}
