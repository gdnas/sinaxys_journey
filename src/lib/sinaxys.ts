import type { Role } from "@/lib/domain";

// Backwards-compat: this module name remains, but the product brand is now KAIROOS.
export const SINAXYS = {
  name: "KAIROOS",
  colors: {
    ink: "#FFFFFF",
    primary: "#6D4CFF",
    white: "#FFFFFF",
  },
};

export function roleLabel(role: Role) {
  switch (role) {
    case "MASTERADMIN":
      return "Master Admin";
    case "ADMIN":
      return "Admin";
    case "HEAD":
      return "Head de Departamento";
    case "COLABORADOR":
      return "Colaborador";
  }
}

export function formatShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatLongDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function computeProgress(done: number, total: number) {
  if (total <= 0) return 0;
  return clamp(Math.round((done / total) * 100), 0, 100);
}

export function getYouTubeEmbedUrl(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");

    // youtu.be/<id>
    if (host === "youtu.be") {
      const id = u.pathname.replace("/", "");
      return `https://www.youtube.com/embed/${id}`;
    }

    // youtube.com/watch?v=<id>
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;

      // youtube.com/embed/<id>
      const parts = u.pathname.split("/").filter(Boolean);
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1]) {
        return `https://www.youtube.com/embed/${parts[embedIdx + 1]}`;
      }
    }
  } catch {
    // ignore
  }

  return url;
}

export function getFigmaEmbedUrl(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");
    if (!host.includes("figma.com")) return null;
    const encoded = encodeURIComponent(url);
    return `https://www.figma.com/embed?embed_host=share&url=${encoded}`;
  } catch {
    return null;
  }
}