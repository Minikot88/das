import { parseCsvText } from "@modules/datasets/lib/csvImport.js";

self.onmessage = (event) => {
  try {
    const result = parseCsvText(event.data?.text ?? "", event.data?.options ?? {});
    self.postMessage({ ok: true, result });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error?.message || "Unable to parse CSV file.",
    });
  }
};
