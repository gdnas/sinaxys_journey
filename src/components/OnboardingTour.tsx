import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { listCompanyModules, type ModuleKey } from "@/lib/modulesDb";
import { getOnboardingStatus, markOnboardingCompleted, ONBOARDING_VERSION } from "@/lib/onboardingDb";

type Role = "MASTERADMIN" | "ADMIN" | "HEAD" | "COLABORADOR";

type Step = {
  id: string;
  title: string;
  body: React.ReactNode;
  route?: string;
  moduleKey?: ModuleKey;
  roles?: Role[];
  targetSelector?: string;
  targetPadding?: number;
  actionLabel?: string;
  /** When provided, will click the target element (if any) and move forward. */
  actionKind?: "click-target";
};

type Rect = { x: number; y: number; w: number; h: number; r: number };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function getDefaultEnabled(key: ModuleKey): boolean {
  // Defaults reflect current product behavior.
  // In the future, companies can toggle these in company_modules.
  switch (key) {
    case "PDI_PERFORMANCE":
      return false;
    default:
      return true;
  }
}

function computeEnabledMap(rows: { module_key: string; enabled: boolean }[]) {
  const m = new Map<string, boolean>();
  for (const r of rows) m.set(String(r.module_key), !!r.enabled);
  return m;
}

function isEnabled(map: Map<string, boolean>, key: ModuleKey | undefined): boolean {
  if (!key) return true;
  const v = map.get(String(key));
  if (typeof v === "boolean") return v;
  return getDefaultEnabled(key);
}

function safeQuerySelector(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

function rectFromTarget(el: Element, padding = 12): Rect {
  const b = el.getBoundingClientRect();
  const x = Math.round(b.left - padding);
  const y = Math.round(b.top - padding);
  const w = Math.round(b.width + padding * 2);
  const h = Math.round(b.height + padding * 2);
  return {
    x: clamp(x, 10, window.innerWidth - 20),
    y: clamp(y, 10, window.innerHeight - 20),
    w: clamp(w, 80, window.innerWidth - 20),
    h: clamp(h, 56, window.innerHeight - 20),
    r: 18,
  };
}

function getRoleSteps(role: Role): Step[] {
  // Master Admin não tem onboarding/tour.
  if (role === "MASTERADMIN") return [];

  const okrRoute = role === "COLABORADOR" ? "/okr/hoje" : "/okr/ciclos";

  const steps: Step[] = [
    {
      id: "welcome",
      title: "Bem-vindo(a) — tour rápido",
      body: (
        <div className="grid gap-2">
          <p>
            Esse tour é curto e direto. Ele te mostra <span className="font-semibold">o que existe</span>, <span className="font-semibold">por que existe</span>
            e <span className="font-semibold">como usar bem</span>.
          </p>
          <p className="text-sm text-muted-foreground">Dica: você pode refazer quando quiser em Minha área → Perfil.</p>
        </div>
      ),
      route: "/app",
    },
    {
      id: "dash-hero",
      title: "Sua jornada, em uma tela",
      body: (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            Este painel é seu ponto de partida: ele junta execução (OKRs), evolução (Trilhas) e reconhecimento (Points).
          </p>
          <p className="text-sm text-muted-foreground">A melhor rotina é: abrir aqui todo dia, ver o que importa e agir em 10 minutos.</p>
        </div>
      ),
      route: "/app",
      targetSelector: "[data-tour=\"dash-hero\"]",
    },
    {
      id: "dash-next",
      title: "O próximo passo certo",
      body: (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            Aqui você retoma o que estava fazendo (ex.: continuar trilha) sem perder tempo procurando.
          </p>
          <p className="text-sm text-muted-foreground">Melhor prática: mantenha poucas trilhas em andamento e finalize antes de começar outra.</p>
        </div>
      ),
      route: "/app",
      targetSelector: "[data-tour=\"dash-next-action\"]",
      moduleKey: "TRACKS",
    },
    {
      id: "dash-tracks",
      title: "Trilhas = onboarding + evolução contínua",
      body: (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            Trilhas são aprendizado em sequência (vídeo, material, checkpoint e quiz). Elas existem para padronizar conhecimento e acelerar ramp-up.
          </p>
          <p className="text-sm text-muted-foreground">
            Melhor prática: conclua na ordem, responda checkpoints com objetividade e use o prazo como compromisso.
          </p>
        </div>
      ),
      route: "/app",
      targetSelector: "[data-tour=\"dash-trilhas\"]",
      moduleKey: "TRACKS",
      actionLabel: "Abrir Trilhas",
      actionKind: "click-target",
    },
    {
      id: "dash-okr",
      title: "OKRs = foco e execução",
      body: (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            OKRs existem para transformar estratégia em entregas claras. Use para saber o que é prioridade agora (e o que pode esperar).
          </p>
          <p className="text-sm text-muted-foreground">
            Melhor prática: mantenha tarefas pequenas, com prazo curto, e atualize status com frequência.
          </p>
        </div>
      ),
      route: "/app",
      targetSelector: "[data-tour=\"dash-okr\"]",
      moduleKey: "OKR",
      actionLabel: "Abrir OKRs",
      actionKind: "click-target",
    },
    {
      id: "dash-pdi",
      title: "PDI & Performance = ritmo e evolução",
      body: (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            Um espaço leve para check-ins, 1:1 e evolução. Existe para dar consistência ao acompanhamento — sem burocracia.
          </p>
          <p className="text-sm text-muted-foreground">Melhor prática: use poucas metas, revisadas em ciclos curtos.</p>
        </div>
      ),
      route: "/app",
      targetSelector: "[data-tour=\"dash-pdi\"]",
      moduleKey: "PDI_PERFORMANCE",
      actionLabel: "Abrir PDI",
      actionKind: "click-target",
    },
    {
      id: "dash-points",
      title: "Points = reconhecimento com regra",
      body: (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">Aqui o progresso vira motivação: ranking, tiers e recompensas — com regras claras.</p>
          <p className="text-sm text-muted-foreground">Melhor prática: reconheça ações específicas (o que foi feito e qual impacto gerou).</p>
        </div>
      ),
      route: "/app",
      targetSelector: "[data-tour=\"dash-points\"]",
      moduleKey: "POINTS",
      actionLabel: "Abrir Ranking",
      actionKind: "click-target",
    },
    {
      id: "dash-org",
      title: "Organograma = contexto",
      body: (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">Use para entender estrutura, lideranças e conexões. Ajuda a alinhar responsabilidades.</p>
          <p className="text-sm text-muted-foreground">Melhor prática: mantenha gestor/departamento sempre atualizados (admin/head cuidam disso).</p>
        </div>
      ),
      route: "/app",
      targetSelector: "[data-tour=\"dash-org\"]",
      moduleKey: "ORG",
      actionLabel: "Abrir Organograma",
      actionKind: "click-target",
    },
  ];

  if (role === "ADMIN" || role === "HEAD") {
    steps.push({
      id: "dash-management",
      title: role === "ADMIN" ? "Atalhos de gestão" : "Atalhos do seu time",
      body: (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            Aqui ficam ações que destravam gente e execução: pessoas, custos e trilhas do time.
          </p>
          <p className="text-sm text-muted-foreground">
            Melhor prática: mexa no sistema quando houver um motivo claro (ex.: mudança de time, nova trilha, ajuste de custo).
          </p>
        </div>
      ),
      route: "/app",
      targetSelector: "[data-tour=\"dash-management\"]",
      moduleKey: "ADMIN",
    });

    steps.push({
      id: "dash-management-okr",
      title: "Dica para OKRs (gestão)",
      body: (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            Em OKRs, priorize o trimestre: poucos objetivos, KRs mensuráveis e entregáveis claros. O resto vira tarefa.
          </p>
        </div>
      ),
      route: okrRoute,
      targetSelector: "[data-tour=\"okr-hero\"]",
      moduleKey: "OKR",
    });
  } else {
    steps.push({
      id: "okr-my",
      title: "Dica rápida",
      body: (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">Sua melhor alavanca é consistência: pequenas entregas, todos os dias.</p>
        </div>
      ),
      route: "/okr/hoje",
      targetSelector: "[data-tour=\"okr-hero\"]",
      moduleKey: "OKR",
    });
  }

  steps.push(
    {
      id: "top-profile",
      title: "Minha área (perfil)",
      body: (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            Atualize seus dados, documentos e (se precisar) refaça este tour. Transparência aqui ajuda o resto da plataforma funcionar bem.
          </p>
        </div>
      ),
      targetSelector: "[data-tour=\"top-profile\"]",
      moduleKey: "PROFILE",
      actionLabel: "Abrir Minha área",
      actionKind: "click-target",
    },
    {
      id: "profile-redo",
      title: "Refazer o onboarding quando quiser",
      body: <p className="text-sm text-muted-foreground">Este botão deixa o tour sempre acessível, sem depender do primeiro acesso.</p>,
      route: "/profile",
      targetSelector: "[data-tour=\"profile-redo-onboarding\"]",
      moduleKey: "PROFILE",
    },
    {
      id: "finish",
      title: "Pronto. Agora é com você!",
      body: (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">Tour concluído. Se quiser, escolha um atalho no painel e comece por lá.</p>
          <div className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-primary)]">
            <Sparkles className="h-4 w-4" />
            Pequenos passos, todo dia.
          </div>
        </div>
      ),
    },
  );

  return steps;
}

type OnboardingTourState = {
  isOpen: boolean;
  start: () => void;
  close: () => void;
};

const Ctx = createContext<OnboardingTourState | null>(null);

export function OnboardingTourProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState<Step[]>([]);
  const autoStartedRef = useRef(false);

  const isMaster = user?.role === "MASTERADMIN";

  const { data: status } = useQuery({
    queryKey: ["onboarding-status", user?.id],
    queryFn: () => getOnboardingStatus(String(user?.id)),
    enabled: !!user?.id && !isMaster,
  });

  const { data: companyModules = [] } = useQuery({
    queryKey: ["company-modules", user?.companyId],
    queryFn: () => listCompanyModules(String(user?.companyId)),
    enabled: !!user?.companyId && user?.role !== "MASTERADMIN",
  });

  const enabledMap = useMemo(() => computeEnabledMap(companyModules), [companyModules]);

  const effectiveSteps = useMemo(() => {
    if (!user) return [];
    if (user.role === "MASTERADMIN") return [];
    const base = getRoleSteps(user.role as Role);

    return base
      .filter((s) => (s.roles ? s.roles.includes(user.role as Role) : true))
      .filter((s) => isEnabled(enabledMap, s.moduleKey));
  }, [user?.id, user?.role, enabledMap]);

  const open = useCallback(() => {
    if (!user) return;
    if (user.role === "MASTERADMIN") return;
    setSteps(effectiveSteps);
    setStepIndex(0);
    setIsOpen(true);
  }, [effectiveSteps, user]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const start = useCallback(() => {
    open();
  }, [open]);

  // Auto-start on first access (or when onboarding version bumps).
  useEffect(() => {
    if (loading) return;
    if (!user?.id) return;
    if (user.role === "MASTERADMIN") return;
    if (autoStartedRef.current) return;
    if (!status) return;

    const should = !status.completedAt || (status.version ?? 0) < ONBOARDING_VERSION;
    if (!should) return;

    autoStartedRef.current = true;
    open();
  }, [loading, user?.id, user?.role, status?.completedAt, status?.version, open, status]);

  // Sync steps when user/company modules resolve (ex.: PDI enabled).
  useEffect(() => {
    if (!isOpen) return;
    if (!user) return;
    if (user.role === "MASTERADMIN") return;
    setSteps(effectiveSteps);
    setStepIndex((i) => clamp(i, 0, Math.max(0, effectiveSteps.length - 1)));
  }, [isOpen, effectiveSteps, user?.id, user?.role]);

  const current = steps[stepIndex] ?? null;

  // Navigate when a step requires a route.
  useEffect(() => {
    if (!isOpen) return;
    if (!current?.route) return;
    if (location.pathname === current.route) return;
    navigate(current.route);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, current?.id, current?.route]);

  const goPrev = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setStepIndex((i) => Math.min(steps.length - 1, i + 1)), [steps.length]);

  const finish = useCallback(async () => {
    if (!user?.id || user.role === "MASTERADMIN") {
      close();
      return;
    }
    try {
      await markOnboardingCompleted(user.id);
      await qc.invalidateQueries({ queryKey: ["onboarding-status", user.id] });
    } finally {
      close();
    }
  }, [user?.id, user?.role, close, qc]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key === "ArrowLeft") {
        goPrev();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "Enter") {
        if (stepIndex >= steps.length - 1) void finish();
        else goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close, goPrev, goNext, finish, stepIndex, steps.length]);

  const value = useMemo<OnboardingTourState>(() => ({ isOpen, start, close }), [isOpen, start, close]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {isMaster ? null : isOpen && current ? (
        <TourOverlay
          key={current.id}
          step={current}
          stepIndex={stepIndex}
          total={steps.length}
          onClose={close}
          onPrev={goPrev}
          onNext={goNext}
          onFinish={finish}
          canPrev={stepIndex > 0}
          canNext={stepIndex < steps.length - 1}
        />
      ) : null}
    </Ctx.Provider>
  );
}

export function useOnboardingTour() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOnboardingTour deve ser usado dentro de <OnboardingTourProvider>.");
  return ctx;
}

function TourOverlay({
  step,
  stepIndex,
  total,
  onClose,
  onPrev,
  onNext,
  onFinish,
  canPrev,
  canNext,
}: {
  step: Step;
  stepIndex: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
  canPrev: boolean;
  canNext: boolean;
}) {
  const [rect, setRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const resolveTarget = useCallback(() => {
    if (!step.targetSelector) return null;
    return safeQuerySelector(step.targetSelector);
  }, [step.targetSelector]);

  const recompute = useCallback(() => {
    const el = resolveTarget();
    if (!el) {
      setRect(null);
      return;
    }

    // Ensure the highlighted element is on screen.
    try {
      (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    } catch {
      // ignore
    }

    setRect(rectFromTarget(el, step.targetPadding ?? 12));
  }, [resolveTarget, step.targetPadding]);

  useLayoutEffect(() => {
    recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id]);

  useEffect(() => {
    const on = () => recompute();
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, true);
    const t = window.setInterval(on, 350);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("resize", on);
      window.removeEventListener("scroll", on, true);
    };
  }, [recompute]);

  const popoverStyle = useMemo(() => {
    const maxW = 420;
    const pad = 14;

    if (!rect) {
      return { left: pad, right: pad, top: 22 } as React.CSSProperties;
    }

    // Basic positioning: prefer below; if not enough space, go above.
    const guessH = 220;
    const belowY = rect.y + rect.h + 12;
    const aboveY = rect.y - guessH - 12;
    const top = belowY + guessH <= window.innerHeight - 16 ? belowY : Math.max(16, aboveY);

    const centerX = rect.x + rect.w / 2;
    const left = clamp(centerX - maxW / 2, 16, window.innerWidth - maxW - 16);

    return {
      left,
      top,
      width: Math.min(maxW, window.innerWidth - 32),
    } as React.CSSProperties;
  }, [rect]);

  const progress = total > 0 ? Math.round(((stepIndex + 1) / total) * 100) : 0;

  const clickTarget = useCallback(() => {
    const el = resolveTarget();
    if (!el) return false;
    try {
      (el as HTMLElement).click();
      return true;
    } catch {
      return false;
    }
  }, [resolveTarget]);

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Blur + dim outside the spotlight (4 rectangles) */}
      {rect ? (
        <>
          <div className="pointer-events-auto fixed left-0 top-0 w-full bg-slate-950/45 backdrop-blur-md" style={{ height: rect.y }} />
          <div
            className="pointer-events-auto fixed left-0 bg-slate-950/45 backdrop-blur-md"
            style={{ top: rect.y, width: rect.x, height: rect.h }}
          />
          <div
            className="pointer-events-auto fixed right-0 bg-slate-950/45 backdrop-blur-md"
            style={{ top: rect.y, left: rect.x + rect.w, height: rect.h }}
          />
          <div
            className="pointer-events-auto fixed left-0 bottom-0 w-full bg-slate-950/45 backdrop-blur-md"
            style={{ top: rect.y + rect.h }}
          />

          {/* Spotlight border */}
          <div
            className="pointer-events-none fixed rounded-[22px] ring-2 ring-[color:var(--sinaxys-primary)] shadow-[0_0_0_1px_rgba(255,255,255,0.25)] transition-all duration-300"
            style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
          />
        </>
      ) : (
        <div className="pointer-events-auto fixed inset-0 bg-slate-950/45 backdrop-blur-md" />
      )}

      {/* Popover */}
      <div
        ref={cardRef}
        className={cn(
          "fixed rounded-3xl border border-white/20 bg-white p-5 shadow-xl",
          "animate-in fade-in-0 zoom-in-95 duration-200",
        )}
        style={popoverStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--sinaxys-tint)] px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" />
              Tour • {stepIndex + 1}/{total}
            </div>
            <div className="mt-3 text-base font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">{step.title}</div>
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={onClose} aria-label="Fechar tour">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 text-sm text-muted-foreground">{step.body}</div>

        <div className="mt-4">
          <Progress value={progress} className="h-2 rounded-full bg-[color:var(--sinaxys-tint)]" />
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" className="h-10 rounded-xl" onClick={onPrev} disabled={!canPrev}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>
            {step.actionLabel ? (
              <Button
                variant="outline"
                className="h-10 rounded-xl"
                onClick={() => {
                  if (step.actionKind === "click-target") {
                    clickTarget();
                  }
                  onNext();
                }}
              >
                {step.actionLabel}
              </Button>
            ) : null}
          </div>

          {canNext ? (
            <Button className="h-10 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90" onClick={onNext}>
              Próximo
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="h-10 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              onClick={onFinish}
            >
              Finalizar
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="mt-3 text-[11px] text-muted-foreground">
          Dica: use <span className="font-semibold">←</span>/<span className="font-semibold">→</span> no teclado. <span className="font-semibold">Esc</span> fecha.
        </div>
      </div>
    </div>
  );
}