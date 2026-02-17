import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Minus, Move, Plus, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export type OrgNode<T> = {
  id: string;
  data: T;
  children: OrgNode<T>[];
};

type Props<T> = {
  roots: OrgNode<T>[];
  renderNode: (node: OrgNode<T>) => React.ReactNode;
  className?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  // If the user starts the gesture on something clickable/editable, let it behave normally.
  return !!target.closest(
    "button, a, input, textarea, select, option, label, [role='button'], [role='link'], [data-no-drag]",
  );
}

type Edge = { from: string; to: string };

function collectEdges<T>(roots: OrgNode<T>[]): Edge[] {
  const edges: Edge[] = [];
  const walk = (n: OrgNode<T>) => {
    for (const c of n.children) {
      edges.push({ from: n.id, to: c.id });
      walk(c);
    }
  };
  for (const r of roots) walk(r);
  return edges;
}

type Pt = { x: number; y: number };

export function OrgChartTreeCanvas<T>({ roots, renderNode, className }: Props<T>) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const setNodeEl = (id: string) => (el: HTMLElement | null) => {
    if (!el) nodeRefs.current.delete(id);
    else nodeRefs.current.set(id, el);
  };

  const edges = useMemo(() => collectEdges(roots), [roots]);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  const [paths, setPaths] = useState<string[]>([]);
  const rafRef = useRef<number | null>(null);

  const fitScale = useMemo(() => {
    const wrap = wrapRef.current;
    const content = contentRef.current;
    if (!wrap || !content) return 1;

    const cw = wrap.clientWidth;
    const ch = wrap.clientHeight;
    const sw = content.scrollWidth;
    const sh = content.scrollHeight;

    if (!cw || !ch || !sw || !sh) return 1;

    return clamp(Math.min(cw / sw, ch / sh) * 0.98, 0.25, 1);
  }, [roots]);

  const fitAndCenter = () => {
    const wrap = wrapRef.current;
    const content = contentRef.current;
    if (!wrap || !content) return;

    const cw = wrap.clientWidth;
    const ch = wrap.clientHeight;
    const sw = content.scrollWidth;
    const sh = content.scrollHeight;
    if (!cw || !ch || !sw || !sh) return;

    const nextScale = clamp(Math.min(cw / sw, ch / sh) * 0.98, 0.25, 1);
    setScale(nextScale);

    const x = Math.round((cw - sw * nextScale) / 2);
    const y = Math.round((ch - sh * nextScale) / 2);
    setOffset({ x: x > 0 ? x : 0, y: y > 0 ? y : 0 });
  };

  const recomputePaths = () => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const wrapRect = wrap.getBoundingClientRect();

    const centers = new Map<string, { top: Pt; bottom: Pt }>();
    for (const [id, el] of nodeRefs.current.entries()) {
      const r = el.getBoundingClientRect();
      const cx = r.left - wrapRect.left + r.width / 2;
      centers.set(id, {
        top: { x: cx, y: r.top - wrapRect.top },
        bottom: { x: cx, y: r.bottom - wrapRect.top },
      });
    }

    const next: string[] = [];
    for (const e of edges) {
      const a = centers.get(e.from);
      const b = centers.get(e.to);
      if (!a || !b) continue;

      const x1 = a.bottom.x;
      const y1 = a.bottom.y + 6;
      const x2 = b.top.x;
      const y2 = b.top.y - 6;
      const midY = (y1 + y2) / 2;

      // Cubic curve keeps it readable even with non-perfect alignment.
      next.push(`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`);
    }

    setPaths(next);
  };

  const scheduleRecompute = () => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      recomputePaths();
    });
  };

  useEffect(() => {
    // Auto-fit when mounted/changed.
    const t = window.setTimeout(() => fitAndCenter(), 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitScale]);

  useLayoutEffect(() => {
    scheduleRecompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roots, scale, offset, edges.length]);

  useEffect(() => {
    const onResize = () => scheduleRecompute();
    window.addEventListener("resize", onResize);

    const wrap = wrapRef.current;
    if (!wrap) return () => window.removeEventListener("resize", onResize);

    const ro = new ResizeObserver(() => scheduleRecompute());
    ro.observe(wrap);

    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cn("grid gap-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Move className="h-4 w-4" />
          Mapa em árvore (arraste o fundo para mover, zoom para ajustar)
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-full"
            onClick={() => setScale((s) => clamp(s - 0.1, 0.25, 1))}
            aria-label="Diminuir zoom"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-full"
            onClick={() => setScale((s) => clamp(s + 0.1, 0.25, 1))}
            aria-label="Aumentar zoom"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" className="h-9 rounded-full" onClick={() => fitAndCenter()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Ajustar
          </Button>

          <div className="hidden w-[160px] sm:block">
            <Slider
              value={[Math.round(scale * 100)]}
              onValueChange={(v) => setScale(clamp((v[0] ?? 100) / 100, 0.25, 1))}
              min={25}
              max={100}
              step={1}
            />
          </div>
          <div className="text-xs font-semibold text-[color:var(--sinaxys-ink)]">{Math.round(scale * 100)}%</div>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative h-[72vh] touch-none overflow-hidden rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/20"
        onPointerDown={(e) => {
          if (isInteractiveTarget(e.target)) return;
          dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragRef.current) return;
          const dx = e.clientX - dragRef.current.startX;
          const dy = e.clientY - dragRef.current.startY;
          setOffset({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy });
        }}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      >
        {/* Connectors */}
        <svg className="pointer-events-none absolute inset-0" width="100%" height="100%">
          <g>
            {paths.map((d, idx) => (
              <path
                // eslint-disable-next-line react/no-array-index-key
                key={idx}
                d={d}
                fill="none"
                stroke="color-mix(in oklab, var(--sinaxys-primary) 55%, white 45%)"
                strokeOpacity={0.35}
                strokeWidth={2.25}
                strokeLinecap="round"
              />
            ))}
          </g>
        </svg>

        {/* Nodes */}
        <div
          ref={contentRef}
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        >
          <div className="inline-block p-6">
            <div className="flex items-start justify-center gap-12">
              {roots.map((r) => (
                <NodeView key={r.id} node={r} renderNode={renderNode} setNodeEl={setNodeEl} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NodeView<T>({
  node,
  renderNode,
  setNodeEl,
}: {
  node: OrgNode<T>;
  renderNode: (n: OrgNode<T>) => React.ReactNode;
  setNodeEl: (id: string) => (el: HTMLElement | null) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div ref={setNodeEl(node.id)} className="inline-block">
        {renderNode(node)}
      </div>

      {node.children.length ? (
        <div className="flex items-start justify-center gap-10">
          {node.children.map((c) => (
            <NodeView key={c.id} node={c} renderNode={renderNode} setNodeEl={setNodeEl} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
