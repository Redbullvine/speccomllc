import React, { useEffect, useMemo, useRef, useState } from "react";
import { read, utils } from "xlsx";
import Papa from "papaparse";
import * as pdfjsLib from "pdfjs-dist";
import { createApiClient, AuthenticationError, ServerError } from "../services/apiService";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = new Set(["xlsx", "csv", "pdf", "jpeg", "jpg", "png"]);

function getFileExtension(fileName) {
  const parts = String(fileName || "").toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

// Normalizes various array structures into a consistent { columns, rows } shape for preview
function normalizePreviewRows(rows, maxRows = 5) {
  if (!Array.isArray(rows) || !rows.length) {
    return { columns: [], rows: [] };
  }

  // Handle array of objects (standard CSV/JSON parse)
  const objectRows = rows.filter((row) => row && typeof row === "object" && !Array.isArray(row));
  if (objectRows.length) {
    const columns = Array.from(
      objectRows.slice(0, maxRows).reduce((set, row) => {
        Object.keys(row).forEach((key) => set.add(key));
        return set;
      }, new Set())
    );
    const previewRows = objectRows.slice(0, maxRows).map((row, idx) => ({
      __id: `${idx}`,
      ...row,
    }));
    return { columns, rows: previewRows };
  }

  // Handle array of arrays (raw Excel sheet)
  const arrayRows = rows.filter(Array.isArray);
  if (arrayRows.length) {
    const header = arrayRows[0].map((v, idx) => String(v || `column_${idx + 1}`));
    const dataRows = arrayRows.slice(1, maxRows + 1).map((row, rowIdx) => {
      const out = { __id: `${rowIdx}` };
      header.forEach((col, colIdx) => {
        out[col] = row[colIdx] ?? "";
      });
      return out;
    });
    return { columns: header, rows: dataRows };
  }

  return { columns: [], rows: [] };
}

async function parseSpreadsheetOrCsv(file, extension) {
  if (extension === "csv") {
    const parsed = await new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: resolve,
        error: reject,
      });
    });
    const data = Array.isArray(parsed?.data) ? parsed.data : [];
    return normalizePreviewRows(data, 5);
  }

  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames?.[0];
  if (!firstSheetName) return { columns: [], rows: [] };

  const sheet = workbook.Sheets[firstSheetName];
  const rows = utils.sheet_to_json(sheet, { defval: "" });
  return normalizePreviewRows(rows, 5);
}

async function parsePdfMetadata(file) {
  try {
    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    return { type: "pdf", pageCount: pdf.numPages || null };
  } catch {
    return { type: "pdf", pageCount: null };
  }
}

export default function UploadPanel({ authToken, projectId, table = "sites", fields = {}, onUploadComplete }) {
  const apiClient = useMemo(() => createApiClient({ authToken }), [authToken]);

  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState("");
  const [preview, setPreview] = useState({ kind: "none" });

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [rowErrors, setRowErrors] = useState([]);

  const objectUrlRef = useRef(null);
  const uploadAbortRef = useRef(null);

  // Cleanup object URLs and abort controllers on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      if (uploadAbortRef.current) {
        uploadAbortRef.current.abort();
      }
    };
  }, []);

  async function handleFileChange(event) {
    const selected = event.target.files?.[0] || null;

    // Reset state
    setFile(null);
    setFileType("");
    setPreview({ kind: "none" });
    setError("");
    setSuccessMessage("");
    setRowErrors([]);

    // Cleanup previous preview resource
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (!selected) return;

    const extension = getFileExtension(selected.name);

    // Client-side validation
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      setError("Unsupported file type. Allowed: .xlsx, .csv, .pdf, .jpeg, .jpg, .png");
      return;
    }

    if (selected.size > MAX_FILE_BYTES) {
      setError("File too large. Maximum size is 10MB.");
      return;
    }

    setFile(selected);
    setFileType(extension);
    setLoadingPreview(true);

    try {
      // Generate Preview based on type
      if (extension === "csv" || extension === "xlsx") {
        const tablePreview = await parseSpreadsheetOrCsv(selected, extension);
        setPreview({ kind: "table", ...tablePreview });
        return;
      }

      if (extension === "pdf") {
        const meta = await parsePdfMetadata(selected);
        setPreview({ kind: "pdf", fileName: selected.name, pageCount: meta.pageCount });
        return;
      }

      if (["png", "jpg", "jpeg"].includes(extension)) {
        const url = URL.createObjectURL(selected);
        objectUrlRef.current = url;
        setPreview({ kind: "image", fileName: selected.name, url });
        return;
      }

      setPreview({ kind: "file", fileName: selected.name });
    } catch (err) {
      setError(err?.message || "Failed to parse file preview.");
      setPreview({ kind: "none" });
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleUpload() {
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    if (!projectId) {
      setError("projectId is required before upload.");
      return;
    }

    // Cancel previous upload if any
    if (uploadAbortRef.current) uploadAbortRef.current.abort();
    uploadAbortRef.current = new AbortController();

    setUploading(true);
    setError("");
    setSuccessMessage("");
    setRowErrors([]);

    try {
      const payload = await apiClient.uploadFile(
        { file, projectId, table, fields },
        { signal: uploadAbortRef.current.signal }
      );

      // Handle response payload
      const errors = Array.isArray(payload?.errors) ? payload.errors : [];
      setRowErrors(errors);

      const status = String(payload?.status || (payload?.ok ? "success" : "error")).toLowerCase();

      if (status === "error") {
        setError(payload?.error || "Upload completed with errors.");
      } else {
        const inserted = payload?.inserted_rows ?? payload?.data?.length ?? 0;
        const failed = payload?.failed_rows ?? errors.length;
        setSuccessMessage(`Upload complete. Inserted ${inserted}${failed ? `, failed ${failed}` : ""}.`);
      }

      if (typeof onUploadComplete === "function") {
        onUploadComplete(payload);
      }
    } catch (err) {
      if (err?.name === "AbortError") return; // User cancelled

      if (err instanceof AuthenticationError) {
        setError("Session expired. Please log in again.");
      } else if (err instanceof ServerError) {
        setError("Server error during upload. Please try again later.");
      } else {
        setError(err?.message || "Upload failed.");
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <section style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
      <h3 style={{ margin: "0 0 10px" }}>Upload Ingestion</h3>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="file"
          accept=".xlsx,.csv,.pdf,.jpeg,.jpg,.png"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading || loadingPreview}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
        Allowed: .xlsx, .csv, .pdf, .jpeg, .jpg, .png | Max size: 10MB
      </div>

      {loadingPreview ? (
        <div style={{ marginTop: 10 }}>Preparing preview...</div>
      ) : null}

      {/* Table Preview for Excel/CSV */}
      {preview.kind === "table" ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, marginBottom: 6, opacity: 0.85 }}>Preview (first 5 rows)</div>
          <div style={{ overflowX: "auto", border: "1px solid #e5e7eb" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr>
                  {preview.columns.map((col) => (
                    <th
                      key={col}
                      align="left"
                      style={{ padding: 6, borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.__id}>
                    {preview.columns.map((col) => (
                      <td
                        key={`${row.__id}-${col}`}
                        style={{ padding: 6, borderTop: "1px solid #f1f5f9", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        {String(row[col] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Image Preview */}
      {preview.kind === "image" ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, marginBottom: 6, opacity: 0.85 }}>Image Preview</div>
          <img
            src={preview.url}
            alt={preview.fileName}
            style={{ maxWidth: 220, maxHeight: 160, border: "1px solid #ddd" }}
          />
        </div>
      ) : null}

      {/* PDF Info */}
      {preview.kind === "pdf" ? (
        <div style={{ marginTop: 12, padding: 10, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
          <div><strong>PDF Document</strong></div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{preview.fileName}</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            {preview.pageCount ? `Pages: ${preview.pageCount}` : "Page count unavailable"}
          </div>
        </div>
      ) : null}

      {/* Error Message */}
      {error ? (
        <div style={{ marginTop: 12, padding: 10, border: "1px solid #b91c1c", background: "#fee2e2", color: "#7f1d1d" }}>
          {error}
        </div>
      ) : null}

      {/* Success Message */}
      {successMessage ? (
        <div style={{ marginTop: 12, padding: 10, border: "1px solid #166534", background: "#dcfce7", color: "#14532d" }}>
          {successMessage}
        </div>
      ) : null}

      {/* Row-level Errors */}
      {rowErrors.length ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 6, fontWeight: 600 }}>Row Errors</div>
          <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #fecaca", background: "#fff1f2", padding: 8 }}>
            {rowErrors.map((item, idx) => (
              <div key={`${item?.row || idx}-${idx}`} style={{ fontSize: 12, marginBottom: 4 }}>
                Row {item?.row ?? "?"}: {item?.message || item?.reason || JSON.stringify(item)}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {uploading ? (
        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
          Upload in progress...
        </div>
      ) : null}

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
        Selected: {file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : "None"}
      </div>
      <div style={{ fontSize: 12, opacity: 0.75 }}>
        Type: {fileType || "-"}
      </div>
    </section>
  );
}
