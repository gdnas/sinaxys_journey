import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MarketingShell({
  children,
  active,
  title,
  description,
}: {
  children: React.ReactNode;
  active?: "pricing" | "how" | "demo";
  title?: string;
  description?: string;
}) {
  return (
    <div className={cn("dark", "min-h-screen bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)]")}> 
      {/* texture */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-35"
        style={{
          backgroundImage: "url(/kairoos-grid.svg)",
          backgroundSize: "560px 560px",
          backgroundPosition: "center",
          mixBlendMode: "soft-light",
        }}
      />

      <header className="sticky top-0 z-30 border-b border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-white/5 ring-1 ring-[color:var(--sinaxys-border)]">
              <img src="/kairoos-mark.svg" alt="KAIROOS" className="h-7 w-7" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-[0.18em]">KAIROOS</div>
              <div className="text-[11px] font-medium text-[color:var(--sinaxys-ink)]/70">Execution Operating System</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className={cn(
                "h-9 rounded-full border border-transparent text-[color:var(--sinaxys-ink)]/80 hover:bg-white/5 hover:text-[color:var(--sinaxys-ink)]",
                active === "how" ? "bg-white/5" : "",
              )}
            >
              <Link to="/como-funciona">Como funciona</Link>
            </Button>

            <Button
              asChild
              variant="ghost"
              className={cn(
                "hidden h-9 rounded-full border border-transparent text-[color:var(--sinaxys-ink)]/80 hover:bg-white/5 hover:text-[color:var(--sinaxys-ink)] sm:inline-flex",
                active === "pricing" ? "bg-white/5" : "",
              )}
            >
              <Link to="/pricing">Planos</Link>
            </Button>

            <Button asChild className="h-9 rounded-full bg-[color:var(--sinaxys-primary)] px-4 text-white hover:bg-[color:var(--sinaxys-primary)]/90">
              <Link to="/login">
                Começar grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {(title || description) && (
        <div className="mx-auto max-w-6xl px-4 pt-10 md:px-6 md:pt-14">
          {title ? <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">{title}</h1> : null}
          {description ? <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70 md:text-base">{description}</p> : null}
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:px-6">{children}</main>

      <footer className="border-t border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-[color:var(--sinaxys-ink)]/70 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-2">
            <img src="/kairoos-mark.svg" alt="" className="h-5 w-5" />
            <span className="font-semibold tracking-[0.18em] text-[color:var(--sinaxys-ink)]">KAIROOS</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link className="hover:text-[color:var(--sinaxys-ink)]" to="/pricing">
              Planos
            </Link>
            <Link className="hover:text-[color:var(--sinaxys-ink)]" to="/como-funciona">
              Como funciona
            </Link>
            <Link className="hover:text-[color:var(--sinaxys-ink)]" to="/demo">
              Agendar demo
            </Link>
            <Link className="hover:text-[color:var(--sinaxys-ink)]" to="/privacidade">
              Privacidade
            </Link>
            <Link className="hover:text-[color:var(--sinaxys-ink)]" to="/termos">
              Termos
            </Link>
            <Link className="hover:text-[color:var(--sinaxys-ink)]" to="/login">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}