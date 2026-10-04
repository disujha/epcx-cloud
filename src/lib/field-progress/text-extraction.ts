export type NormalizedRegion = { x: number; y: number; width: number; height: number };

export type TextExtractionResult = {
  text: string;
  confidence?: number;
  source: "selectable-pdf-text" | "ocr";
  sourceRegion: NormalizedRegion;
  page: number;
  coordinates: NormalizedRegion[];
};

/** Selectable PDF text is supported now; return null for sources needing a future OCR engine. */
export async function extractText(region: NormalizedRegion, drawing: File, pageNumber: number): Promise<TextExtractionResult | null> {
  if (drawing.type !== "application/pdf" && !drawing.name.toLowerCase().endsWith(".pdf")) return null;
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const loadingTask = pdfjs.getDocument({ data: await drawing.arrayBuffer() });
  try {
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const left = Math.min(region.x, region.x + region.width);
    const right = Math.max(region.x, region.x + region.width);
    const top = Math.min(region.y, region.y + region.height);
    const bottom = Math.max(region.y, region.y + region.height);
    const found = content.items.flatMap((item) => {
      if (!("str" in item) || !item.str.trim()) return [];
      const point = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
      const x = point[0] / viewport.width;
      const y = point[1] / viewport.height;
      return x >= left && x <= right && y >= top && y <= bottom
        ? [{ x, y, text: item.str }]
        : [];
    }).sort((a, b) => Math.abs(a.y - b.y) > .01 ? a.y - b.y : a.x - b.x);
    const text = found.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim();
    if (!text) return null;
    return {
      text,
      source: "selectable-pdf-text",
      sourceRegion: region,
      page: pageNumber,
      coordinates: found.map((item) => ({ x: item.x, y: item.y, width: 0, height: 0 })),
    };
  } finally {
    await loadingTask.destroy();
  }
}
