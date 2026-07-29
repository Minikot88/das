function boolParam(value, fallback = true) {
  if (value === null || value === undefined || value === "") return fallback;
  return !["0", "false", "no", "off"].includes(String(value).toLowerCase());
}

function sanitizeThemeMode(value = "auto") {
  return ["auto", "light", "dark"].includes(value) ? value : "auto";
}

function escapeAttribute(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function sanitizeFileName(value = "dashboard") {
  return String(value ?? "dashboard")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "dashboard";
}

export function buildDashboardViewUrl({
  origin = typeof window !== "undefined" ? window.location.origin : "",
  dashboardId,
  mode = "view",
  theme = "auto",
  showHeader = true,
  shareId = "",
} = {}) {
  const url = new URL(`/dashboard/${dashboardId}/${mode}`, origin);
  const resolvedTheme = sanitizeThemeMode(theme);

  if (shareId) {
    url.searchParams.set("share", shareId);
  }

  if (resolvedTheme !== "auto") {
    url.searchParams.set("theme", resolvedTheme);
  }

  if (!showHeader) {
    url.searchParams.set("header", "0");
  }

  return url.toString();
}

export function buildDashboardEmbedCode({
  src,
  width = 1200,
  height = 720,
  responsive = true,
} = {}) {
  const safeHeight = Math.max(320, Number(height) || 720);
  const safeWidth = Math.max(480, Number(width) || 1200);
  const widthValue = responsive ? "100%" : `${safeWidth}`;
  const styleValue = responsive
    ? `border:0;width:100%;max-width:${safeWidth}px;`
    : "border:0;";

  return `<iframe src="${escapeAttribute(src)}" width="${escapeAttribute(widthValue)}" height="${safeHeight}" style="${escapeAttribute(styleValue)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
}

export function resolveDashboardViewOptions(search = "", fallbackMode = "view") {
  const params = new URLSearchParams(search);
  const mode = fallbackMode === "embed" ? "embed" : "view";

  return {
    mode,
    theme: sanitizeThemeMode(params.get("theme") ?? "auto"),
    showHeader: boolParam(params.get("header"), mode !== "embed"),
  };
}

function getNodeDimensions(node) {
  const rect = node.getBoundingClientRect();
  return {
    width: Math.max(node.scrollWidth, Math.round(rect.width)),
    height: Math.max(node.scrollHeight, Math.round(rect.height)),
  };
}

function collectStyleText() {
  const styleRules = [];

  for (const sheet of Array.from(document.styleSheets ?? [])) {
    try {
      const rules = Array.from(sheet.cssRules ?? []);
      for (const rule of rules) {
        styleRules.push(rule.cssText);
      }
    } catch {
      // Ignore cross-origin or unreadable stylesheets.
    }
  }

  return styleRules.join("\n");
}

function copyCanvasState(sourceNode, cloneNode) {
  const sourceCanvases = Array.from(sourceNode.querySelectorAll("canvas"));
  const cloneCanvases = Array.from(cloneNode.querySelectorAll("canvas"));

  sourceCanvases.forEach((canvas, index) => {
    const cloneCanvas = cloneCanvases[index];
    if (!(cloneCanvas instanceof HTMLCanvasElement)) return;

    const image = document.createElement("img");
    image.src = canvas.toDataURL("image/png");
    image.alt = "";
    image.width = canvas.width;
    image.height = canvas.height;
    image.style.width = `${canvas.clientWidth || canvas.width}px`;
    image.style.height = `${canvas.clientHeight || canvas.height}px`;
    image.style.display = "block";
    image.style.maxWidth = "100%";

    cloneCanvas.replaceWith(image);
  });
}

function stripIgnoredNodes(cloneNode) {
  cloneNode.querySelectorAll("[data-export-ignore='true']").forEach((node) => node.remove());
}

function serializeNodeForExport(node, options = {}) {
  const { width, height } = getNodeDimensions(node);
  const clone = node.cloneNode(true);

  stripIgnoredNodes(clone);
  copyCanvasState(node, clone);

  const styleText = collectStyleText();
  const backgroundColor = options.backgroundColor ?? "#ffffff";

  return {
    width,
    height,
    markup: `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;background:${backgroundColor};">
            <style>${styleText}</style>
            ${clone.outerHTML}
          </div>
        </foreignObject>
      </svg>
    `,
  };
}

function waitForImageLoad(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function nodeToCanvas(node, options = {}) {
  if (!(node instanceof HTMLElement)) {
    throw new Error("Dashboard capture target is unavailable.");
  }

  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font readiness errors and continue.
    }
  }

  await new Promise((resolve) =>
    requestAnimationFrame(() =>
      requestAnimationFrame(resolve)
    )
  );

  const { width, height, markup } = serializeNodeForExport(node, options);
  const pixelRatio = Math.max(1, Math.min(options.pixelRatio ?? window.devicePixelRatio ?? 1, 3));
  const svgBlob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await waitForImageLoad(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas export is unavailable.");
    }

    if (options.backgroundColor) {
      context.fillStyle = options.backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.scale(pixelRatio, pixelRatio);
    context.drawImage(image, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function triggerDownload(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

function dataUrlToBytes(dataUrl) {
  const base64 = String(dataUrl).split(",")[1] ?? "";
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function textBytes(value) {
  return new TextEncoder().encode(value);
}

function concatBytes(parts) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

export function createSingleImagePdf({ imageBytes, width, height }) {
  const pageWidth = Math.max(320, Math.round(width));
  const pageHeight = Math.max(240, Math.round(height));
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
    `<< /Type /XObject /Subtype /Image /Width ${pageWidth} /Height ${pageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`,
    `<< /Length ${`q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`.length} >>\nstream\nq\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\nendstream`,
  ];
  const parts = [textBytes("%PDF-1.4\n")];
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(parts.reduce((sum, part) => sum + part.length, 0));
    parts.push(textBytes(`${index + 1} 0 obj\n`));
    if (index === 3) {
      parts.push(textBytes(object));
      parts.push(imageBytes);
      parts.push(textBytes("\nendstream\nendobj\n"));
      return;
    }
    parts.push(textBytes(`${object}\nendobj\n`));
  });

  const xrefOffset = parts.reduce((sum, part) => sum + part.length, 0);
  const xrefLines = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
  ].join("\n");
  parts.push(textBytes(xrefLines));
  return concatBytes(parts);
}

export async function exportNodeAsImage(node, {
  filename = "dashboard",
  format = "png",
  quality = 0.92,
  backgroundColor = "#ffffff",
  pixelRatio,
} = {}) {
  const normalizedFormat = format === "jpg" ? "jpeg" : format;
  const canvas = await nodeToCanvas(node, {
    backgroundColor: normalizedFormat === "jpeg" ? backgroundColor : backgroundColor,
    pixelRatio,
  });
  const mimeType = normalizedFormat === "jpeg" ? "image/jpeg" : "image/png";
  const dataUrl = canvas.toDataURL(mimeType, quality);
  triggerDownload(dataUrl, `${sanitizeFileName(filename)}.${normalizedFormat === "jpeg" ? "jpg" : "png"}`);
}

export async function exportNodeAsPdf(node, {
  filename = "dashboard",
  backgroundColor = "#ffffff",
  pixelRatio = 1.4,
} = {}) {
  const canvas = await nodeToCanvas(node, { backgroundColor, pixelRatio });
  exportCanvasAsPdf(canvas, { filename });
}

export function exportCanvasAsPdf(canvas, {
  filename = "dashboard",
  quality = 0.92,
} = {}) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("Dashboard canvas is unavailable.");
  }
  const imageDataUrl = canvas.toDataURL("image/jpeg", quality);
  const imageBytes = dataUrlToBytes(imageDataUrl);
  const pdfBytes = createSingleImagePdf({
    imageBytes,
    width: canvas.width,
    height: canvas.height,
  });
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  try {
    triggerDownload(url, `${sanitizeFileName(filename)}.pdf`);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
