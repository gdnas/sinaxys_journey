import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FileText, Printer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type LegalSection = {
  id: string;
  title: string;
  content: React.ReactNode;
};

export function LegalDocument({
  eyebrow,
  title,
  updatedAt,
  intro,
  sections,
  aside,
}: {
  eyebrow: string;
  title: string;
  updatedAt: string;
  intro?: React.ReactNode;
  sections: LegalSection[];
  aside?: React.ReactNode;
}) {
  const toc = useMemo(() => sections.map((s) => ({ id: s.id, title: s.title })), [sections]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{eyebrow}</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)] sm:text-4xl">{title}</h1>
            <div className="mt-2 text-sm text-muted-foreground">Última atualização: {updatedAt}</div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-9 rounded-2xl border border-[color:var(--sinaxys-border)] bg-transparent px-3 text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-border)]/30"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>

        {intro ? (
          <div className="mt-5 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-4 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/80">
            {intro}
          </div>
        ) : null}

        <Separator className="my-6 bg-[color:var(--sinaxys-border)]/70" />

        <div className="grid gap-8">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-lg font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">{s.title}</h2>
              <div className="prose prose-invert mt-3 max-w-none text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/75">
                {s.content}
              </div>
            </section>
          ))}
        </div>
      </Card>

      <div className="lg:sticky lg:top-6">
        <Card className={cn("rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-5")}> 
          <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-ink)]">
            <FileText className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
            Navegação
          </div>
          <div className="mt-3 grid gap-1">
            {toc.map((i) => (
              <a
                key={i.id}
                href={`#${i.id}`}
                className="rounded-xl px-3 py-2 text-sm text-[color:var(--sinaxys-ink)]/75 hover:bg-white/5 hover:text-[color:var(--sinaxys-ink)]"
              >
                {i.title}
              </a>
            ))}
          </div>

          {aside ? (
            <>
              <Separator className="my-4 bg-[color:var(--sinaxys-border)]/70" />
              <div className="text-sm text-[color:var(--sinaxys-ink)]/75">{aside}</div>
            </>
          ) : null}

          <Separator className="my-4 bg-[color:var(--sinaxys-border)]/70" />
          <div className="text-xs text-[color:var(--sinaxys-ink)]/70">
            Links úteis: {" "}
            <Link className="underline-offset-4 hover:underline" to="/termos">
              Termos
            </Link>
            {" · "}
            <Link className="underline-offset-4 hover:underline" to="/privacidade">
              Privacidade
            </Link>
            {" · "}
            <Link className="underline-offset-4 hover:underline" to="/login">
              Login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
