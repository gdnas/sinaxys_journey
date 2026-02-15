export type DescribedItem = {
  title: string;
  description: string;
};

function cleanLine(s: string) {
  return s.trim().replace(/^[-•]\s+/, "");
}

export function parseDescribedItems(raw?: string | null): DescribedItem[] {
  if (!raw?.trim()) return [];
  const v = raw.trim();

  // Preferred format: JSON array (for richer editing)
  if (v.startsWith("[")) {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) {
        return parsed
          .map((it) => {
            if (!it || typeof it !== "object") return null;
            const title = typeof (it as any).title === "string" ? (it as any).title : "";
            const description = typeof (it as any).description === "string" ? (it as any).description : "";
            const t = title.trim();
            const d = description.trim();
            if (!t && !d) return null;
            return { title: t, description: d } satisfies DescribedItem;
          })
          .filter((x): x is DescribedItem => !!x);
      }
    } catch {
      // Fallthrough to legacy parsing.
    }
  }

  // Legacy formats (newline list). We keep best-effort parsing.
  return v
    .split("\n")
    .map(cleanLine)
    .filter(Boolean)
    .map((line) => {
      const dash = line.split(" — ");
      if (dash.length >= 2) {
        const title = dash[0]?.trim() ?? "";
        const description = dash.slice(1).join(" — ").trim();
        return { title, description };
      }
      const colon = line.split(":");
      if (colon.length >= 2) {
        const title = colon[0]?.trim() ?? "";
        const description = colon.slice(1).join(":").trim();
        return { title, description };
      }
      return { title: line.trim(), description: "" };
    })
    .filter((it) => it.title.trim() || it.description.trim());
}

export function serializeDescribedItems(items: DescribedItem[]) {
  const cleaned = items
    .map((it) => ({ title: it.title.trim(), description: it.description.trim() }))
    .filter((it) => it.title || it.description);
  return cleaned.length ? JSON.stringify(cleaned) : "";
}

export function describedItemToLine(it: DescribedItem) {
  const t = it.title.trim();
  const d = it.description.trim();
  if (!t && !d) return "";
  if (!d) return t;
  if (!t) return d;
  return `${t} — ${d}`;
}

export function describedItemsToLines(items: DescribedItem[]) {
  return items.map(describedItemToLine).map((s) => s.trim()).filter(Boolean);
}

export function textPreview(raw?: string | null, maxChars = 140) {
  const t = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  if (t.length <= maxChars) return t;
  return t.slice(0, maxChars - 1) + "…";
}
