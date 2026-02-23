// Microsoft Clarity loader
// Safe to call multiple times; it will only inject the script once.

declare global {
  interface Window {
    clarity?: (...args: any[]) => void;
    __clarityLoaded?: boolean;
  }
}

export function initClarity(projectId: string | undefined | null) {
  const id = String(projectId ?? "").trim();
  if (!id) return;
  if (typeof window === "undefined") return;
  if (window.__clarityLoaded) return;

  window.__clarityLoaded = true;

  // Official snippet (slightly adapted to avoid duplicates)
  ((c: any, l: any, a: any, r: any, i: any, t?: any, y?: any) => {
    c[a] =
      c[a] ||
      function () {
        (c[a].q = c[a].q || []).push(arguments);
      };
    t = l.createElement(r);
    t.async = 1;
    t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode?.insertBefore(t, y);
  })(window, document, "clarity", "script", id);
}
