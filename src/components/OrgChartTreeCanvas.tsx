import { useEffect, useMemo, useRef, useState } from "react";
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

export function OrgChartTreeCanvas<T>({ roots, renderNode, className }: Props<T>) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [scale, setScale] = useState(1);

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
  }, [roots.length]);

  useEffect(() => {
    // Auto-fit when mounted/changed.
    // Defer to ensure layout is computed.
    const t = window.setTimeout(() => setScale(fitScale), 0);
    return () => window.clearTimeout(t);
  }, [fitScale]);

  useEffect(() => {
    const onResize = () => {
      const wrap = wrapRef.current;
      const content = contentRef.current;
      if (!wrap || !content) return;
      const cw = wrap.clientWidth;
      const ch = wrap.clientHeight;
      const sw = content.scrollWidth;
      const sh = content.scrollHeight;
      if (!cw || !ch || !sw || !sh) return;
      const nextFit = clamp(Math.min(cw / sw, ch / sh) * 0.98, 0.25, 1);
      setScale((prev) => clamp(prev, 0.25, 1));
      // If user was close to fit, keep it fitted.
      if (Math.abs(scale - nextFit) < 0.02) setScale(nextFit);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [scale]);

  return (
    <div className={cn("grid gap-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Move className="h-4 w-4" />
          Visualização em árvore (auto-ajuste na página)
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
          <Button type="button" variant="outline" className="h-9 rounded-full" onClick={() => setScale(fitScale)}>
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
        className="relative h-[70vh] overflow-hidden rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/20"
      >
        <div
          ref={contentRef}
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `scale(${scale})` }}
        >
          <div className="inline-block p-6">
            <div className="flex items-start justify-center gap-10">
              {roots.map((r) => (
                <NodeView key={r.id} node={r} renderNode={renderNode} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NodeView<T>({ node, renderNode }: { node: OrgNode<T>; renderNode: (n: OrgNode<T>) => React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4">
      {renderNode(node)}
      {node.children.length ? (
        <div className="flex items-start justify-center gap-6">
          {node.children.map((c) => (
            <NodeView key={c.id} node={c} renderNode={renderNode} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
