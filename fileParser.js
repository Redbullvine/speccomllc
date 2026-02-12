import { read, utils } from "xlsx";
import Papa from "papaparse";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function toSafeFilename(name){
  return String(name || "upload.bin").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getStorageDescriptor(file, options = {}){
  const prefix = String(options.storagePrefix || "uploads").replace(/\/$/, "");
  const fileName = toSafeFilename(file?.name || "upload.bin");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return {
    bucket: options.bucket || "site-media",
    contentType: file?.type || "application/octet-stream",
    byteSize: Number(file?.size || 0),
    path: `${prefix}/${stamp}_${fileName}`,
  };
}

export async function parseFile(file, options = {}){
  if (!file) throw new Error("file is required");

  const fileType = String(file.name || "")
    .split(".")
    .pop()
    .toLowerCase();

  if (fileType === "csv"){
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data || []),
        error: (error) => reject(error),
      });
    });
  }

  if (fileType === "xlsx" || fileType === "xls"){
    const data = await file.arrayBuffer();
    const workbook = read(data);
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];
    const worksheet = workbook.Sheets[firstSheetName];
    return utils.sheet_to_json(worksheet, { defval: null });
  }

  if (fileType === "pdf"){
    return extractTextFromPdf(file);
  }

  return parseFileFallback(file, options);
}

async function extractTextFromPdf(file){
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i += 1){
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ").trim();
    if (pageText) pages.push(pageText);
  }

  return [{ raw_text: pages.join("\n"), filename: file.name }];
}

async function extractImageMetadata(file){
  const metadata = { width: null, height: null };

  if (typeof createImageBitmap === "function"){
    try {
      const bitmap = await createImageBitmap(file);
      metadata.width = bitmap.width;
      metadata.height = bitmap.height;
      if (typeof bitmap.close === "function") bitmap.close();
    } catch {
      // Keep null dimensions if decode fails.
    }
  }

  return metadata;
}

export async function parseFileFallback(file, options = {}){
  if (!file) throw new Error("file is required");

  const mimeType = String(file.type || "").toLowerCase();
  const isImage = mimeType.startsWith("image/");

  const base = {
    filename: file.name || "",
    size: Number(file.size || 0),
    type: file.type || "application/octet-stream",
    lastModified: Number(file.lastModified || 0),
    storage: getStorageDescriptor(file, options),
  };

  if (isImage){
    const metadata = await extractImageMetadata(file);
    return {
      kind: "image",
      ...base,
      metadata,
      readyForStorage: true,
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        kind: "binary",
        ...base,
        base64: reader.result,
        readyForStorage: true,
      });
    };
    reader.readAsDataURL(file);
  });
}
