import {
  type Certificate,
  type Company,
  type CompensationEvent,
  type ContractAttachment,
  type Db,
  type Department,
  type Invite,
  type Invoice,
  type LearningTrack,
  type ModuleProgress,
  type Notification,
  type NotificationType,
  type PointsEvent,
  type PointsRule,
  type PointsRuleKey,
  type QuizOption,
  type QuizQuestion,
  type RewardTier,
  type TrackAssignment,
  type TrackModule,
  type User,
  type VacationRequest,
  type VacationRequestStatus,
} from "@/lib/domain";
import { SINAXYS_LOGO_DATA_URL } from "@/lib/brand";

const STORAGE_KEY = "sinaxys-journey-db:v2";
const DB_CHANGED_EVENT = "sinaxys-db-changed";

// IMPORTANT:
// - Some reads happen during React render (e.g. useMemo()). Those reads sometimes perform light migrations
//   (loadDb) or consistency fixes (syncAssignmentProgress / ensureCompensationEvents).
// - If we broadcast DB_CHANGED_EVENT synchronously during render, listeners may call setState and create an
//   infinite re-render loop.
//
// Strategy:
// 1) Coalesce broadcasts and always dispatch them asynchronously (microtask).
// 2) Allow temporarily suppressing broadcasts during read-path migrations.
let broadcastSuppressed = 0;
let broadcastScheduled = false;

function withBroadcastSuppressed<T>(fn: () => T): T {
  broadcastSuppressed += 1;
  try {
    return fn();
  } finally {
    broadcastSuppressed -= 1;
  }
}

function scheduleDbChangedBroadcast() {
  if (broadcastSuppressed > 0) return;
  if (broadcastScheduled) return;
  broadcastScheduled = true;
  queueMicrotask(() => {
    broadcastScheduled = false;
    window.dispatchEvent(new Event(DB_CHANGED_EVENT));
  });
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function randomCode() {
  const base = Math.random().toString(36).toUpperCase().slice(2, 6);
  const base2 = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `SJ-${base}-${base2}`;
}

function randomToken() {
  const a = Math.random().toString(36).slice(2);
  const b = Math.random().toString(36).slice(2);
  return `${a}${b}`.replace(/[^a-z0-9]/gi, "").slice(0, 28);
}

function defaultCompanyBrand(): Pick<Company, "name" | "tagline" | "logoDataUrl" | "colors"> {
  return {
    name: "Sinaxys Journey",
    tagline: "Aprendizado com clareza. Evolução com propósito.",
    logoDataUrl: SINAXYS_LOGO_DATA_URL,
    colors: {
      ink: "#20105B",
      primary: "#542AEF",
      bg: "#F6F4FF",
      tint: "#EFEAFF",
      border: "#E6E1FF",
    },
  };
}

function defaultPointsRules(companyId: string): PointsRule[] {
  const createdAt = nowIso();
  const base = (key: PointsRuleKey, category: PointsRule["category"], label: string, points: number, description?: string) =>
    ({
      id: uid("pr"),
      companyId,
      key,
      category,
      label,
      points,
      description,
      active: true,
      createdAt,
    }) satisfies PointsRule;

  return [
    base(
      "VIDEO_ASSISTIDO",
      "Trilhas",
      "Assistir vídeo (módulo)",
      20,
      "Padrão recomendado por módulo de vídeo. O valor real pode variar por trilha.",
    ),
    base(
      "CHECKPOINT_ENTREGUE",
      "Trilhas",
      "Entregar checkpoint",
      30,
      "Padrão recomendado por checkpoint. O valor real pode variar por trilha.",
    ),
    base(
      "QUIZ_APROVADO",
      "Trilhas",
      "Aprovar quiz",
      40,
      "Padrão recomendado por quiz aprovado. O valor real pode variar por trilha.",
    ),
    base(
      "MATERIAL_CONSUMIDO",
      "Trilhas",
      "Consumir material (link)",
      20,
      "Padrão recomendado por material. O valor real pode variar por trilha.",
    ),
    base(
      "CURSO_APRIMORAMENTO",
      "Aprimoramento",
      "Curso de aprimoramento concluído",
      120,
      "Ex.: certificações externas, cursos recomendados pela liderança.",
    ),
    base(
      "GRAVACAO_AULA",
      "Contribuição",
      "Gravação de aula / sessão interna",
      180,
      "Valor sugerido para criação de conteúdo e compartilhamento de conhecimento.",
    ),
    base(
      "SUBIR_VIDEO",
      "Contribuição",
      "Subir vídeo / recurso didático",
      80,
      "Valor sugerido para contribuição de conteúdo (vídeo, tutorial, demo).",
    ),
    base(
      "TEMPO_6M",
      "Tempo de casa",
      "Tempo de casa: 6 meses",
      150,
      "Bônus por permanência (aplicado uma vez ao atingir o marco).",
    ),
    base(
      "TEMPO_12M",
      "Tempo de casa",
      "Tempo de casa: 1 ano",
      350,
      "Bônus por permanência (aplicado uma vez ao atingir o marco).",
    ),
    base("BONUS_ADMIN", "Reconhecimento", "Bônus (admin)", 0, "Reconhecimento pontual definido pelo admin."),
  ];
}

function ensurePointsSetup(db: Db) {
  if (!Array.isArray((db as any).pointsRules)) (db as any).pointsRules = [];
  if (!Array.isArray((db as any).pointsEvents)) (db as any).pointsEvents = [];

  for (const c of db.companies ?? []) {
    const hasAny = (db.pointsRules ?? []).some((r) => r.companyId === c.id);
    if (!hasAny) {
      (db.pointsRules ?? []).push(...defaultPointsRules(c.id));
    }
  }
}

// NEW: keep assignment progress in sync when modules are added after an assignment already exists.
function syncAssignmentProgress(db: Db, assignmentId: string) {
  const assignment = db.assignments.find((a) => a.id === assignmentId);
  if (!assignment) return;

  const orderedModules = db.modules
    .filter((m) => m.trackId === assignment.trackId)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const progress = db.moduleProgress.filter((p) => p.assignmentId === assignmentId);
  const byModuleId = new Map(progress.map((p) => [p.moduleId, p] as const));

  let changed = false;

  // Ensure every module has a progress row
  for (const m of orderedModules) {
    if (byModuleId.has(m.id)) continue;
    const p: ModuleProgress = {
      id: uid("mpr"),
      assignmentId,
      moduleId: m.id,
      status: "LOCKED",
      attemptsCount: 0,
    };
    db.moduleProgress.push(p);
    byModuleId.set(m.id, p);
    changed = true;
  }

  // Recompute sequencing (single AVAILABLE) unless already completed.
  if (assignment.status === "COMPLETED") {
    // keep as-is
  } else {
    const firstNotCompleted = orderedModules.find((m) => byModuleId.get(m.id)?.status !== "COMPLETED");

    for (const m of orderedModules) {
      const p = byModuleId.get(m.id)!;
      if (p.status === "COMPLETED") continue;

      const nextStatus = firstNotCompleted?.id === m.id ? "AVAILABLE" : "LOCKED";
      if (p.status !== nextStatus) {
        p.status = nextStatus;
        changed = true;
      }
    }
  }

  // This can run during React render (read paths). Never broadcast UI events from here.
  if (changed) saveDb(db, { broadcast: false });
}

function ensureMultiCompany(db: Db) {
  // Migration: if companies do not exist, create a default company and attach all existing records to it.
  if (Array.isArray((db as any).companies) && Array.isArray((db as any).invites)) return;

  const brand = defaultCompanyBrand();
  const companyId = uid("cmp");

  (db as any).companies = [
    {
      id: companyId,
      ...brand,
      createdAt: nowIso(),
    } satisfies Company,
  ];
  (db as any).invites = [] as Invite[];

  // attach companyId to users
  db.users.forEach((u) => {
    if (!u.companyId && u.role !== "MASTERADMIN") {
      (u as any).companyId = companyId;
    }
  });

  // attach companyId to departments + tracks
  db.departments.forEach((d) => ((d as any).companyId = companyId));
  db.tracks.forEach((t) => ((t as any).companyId = companyId));

  // Migration write: no broadcast.
  saveDb(db, { broadcast: false });
}

function ensureNotifications(db: Db) {
  if (!Array.isArray((db as any).notifications)) (db as any).notifications = [];
}

function ensureContractAttachments(db: Db) {
  if (!Array.isArray((db as any).contractAttachments)) (db as any).contractAttachments = [];
}

function ensureCompensationEvents(db: Db) {
  if (!Array.isArray((db as any).compensationEvents)) (db as any).compensationEvents = [];

  // Baseline: if a user has a monthlyCostBRL but no events, create an initial record.
  const byUserId = new Map<string, CompensationEvent[]>(
    (db.compensationEvents ?? []).reduce((acc, e) => {
      const arr = acc.get(e.userId) ?? [];
      arr.push(e);
      acc.set(e.userId, arr);
      return acc;
    }, new Map<string, CompensationEvent[]>()),
  );

  let changed = false;
  for (const u of db.users) {
    if (!u.companyId) continue;
    if (typeof u.monthlyCostBRL !== "number" || !Number.isFinite(u.monthlyCostBRL)) continue;
    const existing = byUserId.get(u.id) ?? [];
    if (existing.length) continue;

    (db.compensationEvents ?? []).push({
      id: uid("cmpc"),
      companyId: u.companyId,
      userId: u.id,
      monthlyCostBRL: u.monthlyCostBRL,
      effectiveAt: u.joinedAt ?? nowIso(),
      createdAt: nowIso(),
      createdByUserId: undefined,
      note: "Inicial",
    });
    changed = true;
  }

  // This can be called from read paths (e.g. profile rendering). Never broadcast from here.
  if (changed) saveDb(db, { broadcast: false });
}

function ensureVacationRequests(db: Db) {
  if (!Array.isArray((db as any).vacationRequests)) (db as any).vacationRequests = [];
}

function pushNotification(db: Db, data: Omit<Notification, "id" | "createdAt" | "readAt"> & { readAt?: string }) {
  ensureNotifications(db);
  const n: Notification = {
    id: uid("ntf"),
    createdAt: nowIso(),
    ...data,
  };
  db.notifications.push(n);
  return n;
}

function startOfDayIso(dateStr: string) {
  // Expects YYYY-MM-DD
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateStr.trim())) return null;
  const iso = new Date(`${dateStr}T00:00:00Z`).toISOString();
  return iso;
}

function ensureDefaultUsers(db: Db) {
  const companyId = db.companies[0]?.id;
  if (!companyId) return;

  const byEmail = new Map(db.users.map((u) => [u.email.toLowerCase(), u] as const));

  // Master Admin (produção)
  if (!byEmail.has("guilhermenastrini@gmail.com")) {
    db.users.push({
      id: uid("usr"),
      name: "Guilherme Nastrini",
      email: "guilhermenastrini@gmail.com",
      role: "MASTERADMIN",
      active: true,
      password: "Med1-01875",
      mustChangePassword: false,
      joinedAt: nowIso(),
    });
  }

  // Admin (produção)
  if (!byEmail.has("guilherme@sinaxys.com")) {
    db.users.push({
      id: uid("usr"),
      companyId,
      name: "Guilherme",
      email: "guilherme@sinaxys.com",
      role: "ADMIN",
      active: true,
      password: "Sinaxys@123",
      mustChangePassword: false,
      joinedAt: nowIso(),
    });
  }
}

export function loadDb(): Db {
  // loadDb can run during React render; suppress broadcasts for its entire duration.
  return withBroadcastSuppressed(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedDb();
      saveDb(seeded, { broadcast: false });
      return seeded;
    }

    try {
      const parsed = JSON.parse(raw) as Db;

      ensureMultiCompany(parsed);

      // Migration: add dueAt field (optional) for older assignments
      if (Array.isArray((parsed as any).assignments)) {
        let changed = false;
        for (const a of (parsed as any).assignments) {
          if (a && typeof a === "object" && !("dueAt" in a)) {
            a.dueAt = undefined;
            changed = true;
          }
        }
        if (changed) saveDb(parsed, { broadcast: false });
      }

      // Migration: reward tiers
      if (!Array.isArray((parsed as any).rewardTiers)) {
        (parsed as any).rewardTiers = [];
        saveDb(parsed, { broadcast: false });
      }

      // Migration: points rules/events
      if (!Array.isArray((parsed as any).pointsRules) || !Array.isArray((parsed as any).pointsEvents)) {
        ensurePointsSetup(parsed);
        saveDb(parsed, { broadcast: false });
      } else {
        // Ensure every company has a baseline ruleset
        const before = (parsed as any).pointsRules.length;
        ensurePointsSetup(parsed);
        const after = (parsed as any).pointsRules.length;
        if (after !== before) saveDb(parsed, { broadcast: false });
      }

      // Migration: invoices
      if (!Array.isArray((parsed as any).invoices)) {
        (parsed as any).invoices = [];
        saveDb(parsed, { broadcast: false });
      }

      // Migration: notifications / contracts / compensation / vacations
      if (!Array.isArray((parsed as any).notifications)) {
        (parsed as any).notifications = [];
        saveDb(parsed, { broadcast: false });
      }
      if (!Array.isArray((parsed as any).contractAttachments)) {
        (parsed as any).contractAttachments = [];
        saveDb(parsed, { broadcast: false });
      } else {
        // Migration: contractAttachments suportam FILE (data URL) e LINK (Clicksign).
        // Normaliza registros antigos que só tinham `fileDataUrl`.
        let changed = false;
        for (const c of (parsed as any).contractAttachments as any[]) {
          if (!c || typeof c !== "object") continue;

          const url = typeof c.url === "string" ? c.url.trim() : "";
          const legacy = typeof c.fileDataUrl === "string" ? c.fileDataUrl.trim() : "";

          if (!url && legacy) {
            c.url = legacy;
            c.kind = c.kind ?? "FILE";
            changed = true;
          }

          if (!c.kind) {
            const nextUrl = (typeof c.url === "string" ? c.url : legacy) ?? "";
            c.kind = String(nextUrl).startsWith("data:") ? "FILE" : "LINK";
            changed = true;
          }
        }
        if (changed) saveDb(parsed, { broadcast: false });
      }
      if (!Array.isArray((parsed as any).compensationEvents)) {
        (parsed as any).compensationEvents = [];
        saveDb(parsed, { broadcast: false });
      }
      // Ensure baseline records exist
      ensureCompensationEvents(parsed);

      if (!Array.isArray((parsed as any).vacationRequests)) {
        (parsed as any).vacationRequests = [];
        saveDb(parsed, { broadcast: false });
      }

      // Migration: password fields
      if (Array.isArray((parsed as any).users)) {
        let changed = false;
        for (const u of (parsed as any).users) {
          if (u && typeof u === "object") {
            if (!("password" in u)) {
              u.password = undefined;
              changed = true;
            }
            if (!("mustChangePassword" in u)) {
              u.mustChangePassword = false;
              changed = true;
            }
            if (!("joinedAt" in u)) {
              u.joinedAt = nowIso();
              changed = true;
            }
            if (!("jobTitle" in u)) {
              u.jobTitle = undefined;
              changed = true;
            }
          }
        }
        if (changed) saveDb(parsed, { broadcast: false });
      }

      // Migration: vacation decision note
      if (Array.isArray((parsed as any).vacationRequests)) {
        let changed = false;
        for (const r of (parsed as any).vacationRequests) {
          if (r && typeof r === "object" && !("decisionNote" in r)) {
            r.decisionNote = undefined;
            changed = true;
          }
        }
        if (changed) saveDb(parsed, { broadcast: false });
      }

      // Migration: ensure system users exist
      {
        const before = parsed.users.length;
        ensureDefaultUsers(parsed);
        if (parsed.users.length !== before) saveDb(parsed, { broadcast: false });
      }

      // Light migration: if organograma não existe, cria uma hierarquia padrão.
      const needsOrg = Array.isArray(parsed.users) && parsed.users.length > 0 && parsed.users.every((u) => !u.managerId);
      if (needsOrg) {
        const admin = parsed.users.find((u) => u.role === "ADMIN" && u.active);
        const heads = parsed.users.filter((u) => u.role === "HEAD" && u.active);
        if (admin) {
          for (const h of heads) h.managerId = admin.id;
        }

        // colaboradores reportam para o head do mesmo departamento (se existir)
        for (const c of parsed.users.filter((u) => u.role === "COLABORADOR" && u.active)) {
          const h = heads.find((x) => x.departmentId && x.departmentId === c.departmentId);
          if (h) c.managerId = h.id;
        }

        saveDb(parsed, { broadcast: false });
      }

      return parsed;
    } catch {
      const seeded = seedDb();
      saveDb(seeded, { broadcast: false });
      return seeded;
    }
  });
}

export function saveDb(db: Db, opts?: { broadcast?: boolean }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));

    const shouldBroadcast = (opts?.broadcast ?? true) && broadcastSuppressed === 0;
    if (shouldBroadcast) {
      // Always async to prevent setState during render loops.
      scheduleDbChangedBroadcast();
    }
  } catch {
    // Surface storage issues (e.g. quota exceeded) so UI can show an error toast.
    throw new Error(
      "Não foi possível salvar. O armazenamento do navegador pode estar cheio — tente remover itens antigos ou recarregar a página.",
    );
  }
}

export function resetDb() {
  localStorage.removeItem(STORAGE_KEY);
  scheduleDbChangedBroadcast();
}

function seedDb(): Db {
  const companyId = uid("cmp");
  const company: Company = {
    id: companyId,
    ...defaultCompanyBrand(),
    createdAt: nowIso(),
  };

  // Mantemos departamentos-base para facilitar criação de trilhas/usuários.
  const departments: Department[] = [
    { id: uid("dept"), companyId, name: "Financeiro" },
    { id: uid("dept"), companyId, name: "Suporte" },
    { id: uid("dept"), companyId, name: "Customer Success" },
    { id: uid("dept"), companyId, name: "Comercial" },
    { id: uid("dept"), companyId, name: "Marketing" },
    { id: uid("dept"), companyId, name: "Produto" },
  ];

  // Produção: começa limpo (somente 1 Master Admin + 1 Admin)
  const users: User[] = [
    {
      id: uid("usr"),
      name: "Guilherme Nastrini",
      email: "guilhermenastrini@gmail.com",
      role: "MASTERADMIN",
      active: true,
      password: "Med1-01875",
      mustChangePassword: false,
      joinedAt: nowIso(),
    },
    {
      id: uid("usr"),
      companyId,
      name: "Guilherme",
      email: "guilherme@sinaxys.com",
      role: "ADMIN",
      active: true,
      password: "Sinaxys@123",
      mustChangePassword: false,
      joinedAt: nowIso(),
    },
  ];

  const tracks: LearningTrack[] = [];
  const modules: TrackModule[] = [];
  const quizQuestions: QuizQuestion[] = [];
  const quizOptions: QuizOption[] = [];
  const assignments: TrackAssignment[] = [];
  const moduleProgress: ModuleProgress[] = [];
  const certificates: Certificate[] = [];
  const invoices: Invoice[] = [];
  const notifications: Notification[] = [];
  const contractAttachments: ContractAttachment[] = [];
  const compensationEvents: CompensationEvent[] = [];
  const vacationRequests: VacationRequest[] = [];
  const rewardTiers: RewardTier[] = [];

  const pointsRules = defaultPointsRules(companyId);
  const pointsEvents: PointsEvent[] = [];

  return {
    companies: [company],
    invites: [],
    departments,
    users,
    tracks,
    modules,
    quizQuestions,
    quizOptions,
    assignments,
    moduleProgress,
    certificates,
    rewardTiers,
    pointsRules,
    pointsEvents,
    invoices,
    notifications,
    contractAttachments,
    compensationEvents,
    vacationRequests,
  };
}

export type AssignmentDetail = {
  assignment: TrackAssignment;
  track: LearningTrack;
  modules: TrackModule[];
  progressByModuleId: Record<string, ModuleProgress>;
};

export type CollaboratorOverview = {
  user: User;
  assignments: {
    assignment: TrackAssignment;
    track: LearningTrack;
    completedModules: number;
    totalModules: number;
    progressPct: number;
    currentModuleTitle?: string;
    needsAttention?: boolean;
  }[];
};

function computeAssignmentStats(db: Db, assignmentId: string) {
  const mps = db.moduleProgress.filter((p) => p.assignmentId === assignmentId);
  const done = mps.filter((p) => p.status === "COMPLETED").length;
  const total = mps.length;
  const progressPct = total ? Math.round((done / total) * 100) : 0;
  return { done, total, progressPct, mps };
}

function unlockNextIfAny(db: Db, assignmentId: string) {
  const trackId = db.assignments.find((a) => a.id === assignmentId)!.trackId;
  const orderedModules = db.modules
    .filter((m) => m.trackId === trackId)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const progress = db.moduleProgress
    .filter((p) => p.assignmentId === assignmentId)
    .sort(
      (a, b) =>
        orderedModules.find((m) => m.id === a.moduleId)!.orderIndex -
        orderedModules.find((m) => m.id === b.moduleId)!.orderIndex,
    );

  // ensure there is at most one AVAILABLE
  const anyAvailable = progress.some((p) => p.status === "AVAILABLE");
  if (anyAvailable) return;

  const nextLocked = progress.find((p) => p.status === "LOCKED");
  if (nextLocked) nextLocked.status = "AVAILABLE";
}

function issueCertificateIfCompleted(db: Db, assignmentId: string) {
  const assignment = db.assignments.find((a) => a.id === assignmentId);
  if (!assignment) return;

  const stats = computeAssignmentStats(db, assignmentId);
  if (stats.done !== stats.total || stats.total === 0) return;

  if (assignment.status !== "COMPLETED") {
    assignment.status = "COMPLETED";
    assignment.completedAt = nowIso();
  }

  const existing = db.certificates.find((c) => c.assignmentId === assignmentId);
  if (existing) return;

  const user = db.users.find((u) => u.id === assignment.userId)!;
  const track = db.tracks.find((t) => t.id === assignment.trackId)!;
  const dept = db.departments.find((d) => d.id === track.departmentId)!;

  const cert: Certificate = {
    id: uid("crt"),
    assignmentId,
    certificateCode: randomCode(),
    issuedAt: nowIso(),
    publicSlug: `${slugify(user.name)}-${slugify(track.title)}-${Math.random().toString(16).slice(2, 6)}`,
    snapshotUserName: user.name,
    snapshotTrackTitle: track.title,
    snapshotDepartmentName: dept.name,
  };

  db.certificates.push(cert);
}

function computeNeedsAttention(db: Db, assignmentId: string) {
  const mps = db.moduleProgress.filter((p) => p.assignmentId === assignmentId);
  // needs attention when current AVAILABLE quiz has been attempted and not passed
  const available = mps.find((p) => p.status === "AVAILABLE");
  if (!available) return false;
  const mod = db.modules.find((m) => m.id === available.moduleId);
  if (!mod || mod.type !== "QUIZ") return false;
  return (available.attemptsCount ?? 0) > 0 && available.passed === false;
}

function computeCurrentModuleTitle(db: Db, assignmentId: string) {
  const assignment = db.assignments.find((a) => a.id === assignmentId);
  if (!assignment) return undefined;
  const orderedModules = db.modules
    .filter((m) => m.trackId === assignment.trackId)
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const mp = db.moduleProgress
    .filter((p) => p.assignmentId === assignmentId)
    .find((p) => p.status === "AVAILABLE");
  const mod = mp ? orderedModules.find((m) => m.id === mp.moduleId) : undefined;
  return mod?.title;
}

function companyOfUser(db: Db, userId: string) {
  const u = db.users.find((x) => x.id === userId);
  return u?.companyId;
}

function normalizeText(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

function findDepartmentIdByName(db: Db, companyId: string, name: string) {
  const n = normalizeText(name);
  const d = db.departments.find((x) => x.companyId === companyId && normalizeText(x.name) === n);
  return d?.id ?? null;
}

function wouldCreateCycle(db: Db, userId: string, nextManagerId: string) {
  const byId = new Map(db.users.map((x) => [x.id, x] as const));
  let cursor: string | undefined = nextManagerId;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === userId) return true;
    if (seen.has(cursor)) return true;
    seen.add(cursor);
    cursor = byId.get(cursor)?.managerId;
  }
  return false;
}

function computeUserXpFromTracks(db: Db, userId: string) {
  const assignmentIds = db.assignments.filter((a) => a.userId === userId).map((a) => a.id);
  const completedMp = db.moduleProgress.filter((p) => assignmentIds.includes(p.assignmentId) && p.status === "COMPLETED");
  const byModuleId = new Map(db.modules.map((m) => [m.id, m] as const));
  return completedMp.reduce((acc, p) => acc + (byModuleId.get(p.moduleId)?.xpReward ?? 0), 0);
}

function computeTenureXp(db: Db, userId: string) {
  const u = db.users.find((x) => x.id === userId);
  if (!u || !u.joinedAt) return 0;
  if (!u.companyId) return 0;

  const joinedMs = new Date(u.joinedAt).getTime();
  if (!Number.isFinite(joinedMs)) return 0;

  const months = (Date.now() - joinedMs) / (1000 * 60 * 60 * 24 * 30);

  const rules = (db.pointsRules ?? []).filter((r) => r.companyId === u.companyId && r.active);
  const r6 = rules.find((r) => r.key === "TEMPO_6M");
  const r12 = rules.find((r) => r.key === "TEMPO_12M");

  let xp = 0;
  if (months >= 6) xp += r6?.points ?? 0;
  if (months >= 12) xp += r12?.points ?? 0;
  return xp;
}

function computeUserXpFromEvents(db: Db, userId: string) {
  return (db.pointsEvents ?? []).filter((e) => e.userId === userId).reduce((acc, e) => acc + (e.points ?? 0), 0);
}

function computeUserXp(db: Db, userId: string) {
  return computeUserXpFromTracks(db, userId) + computeUserXpFromEvents(db, userId) + computeTenureXp(db, userId);
}

function computeUserTier(db: Db, companyId: string, xp: number) {
  const tiers = (db.rewardTiers ?? [])
    .filter((t) => t.companyId === companyId && t.active)
    .slice()
    .sort((a, b) => a.minXp - b.minXp);
  let current: RewardTier | null = null;
  for (const t of tiers) {
    if (xp >= t.minXp) current = t;
  }
  return current;
}

export const mockDb = {
  uid,
  nowIso,
  get() {
    return loadDb();
  },
  set(db: Db) {
    saveDb(db);
  },
  reset() {
    resetDb();
  },

  // Multi-company
  getCompanies() {
    return loadDb().companies.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  getCompany(companyId: string) {
    return loadDb().companies.find((c) => c.id === companyId) ?? null;
  },
  createCompany(params: { name: string; tagline?: string }) {
    const db = loadDb();

    const name = params.name.trim();
    if (name.length < 3) throw new Error("Nome da empresa inválida.");

    const id = uid("cmp");
    const brand = defaultCompanyBrand();

    const company: Company = {
      id,
      ...brand,
      name,
      tagline: params.tagline?.trim() || brand.tagline,
      createdAt: nowIso(),
    };

    db.companies.push(company);

    // Departments baseline
    const deptNames: Department["name"][] = [
      "Financeiro",
      "Suporte",
      "Customer Success",
      "Comercial",
      "Marketing",
      "Produto",
    ];
    for (const depName of deptNames) {
      db.departments.push({ id: uid("dept"), companyId: id, name: depName });
    }

    // Baseline points rules
    ensurePointsSetup(db);

    saveDb(db);
    return company;
  },

  // Sinaxys Points
  getPointsRules(companyId: string) {
    const db = loadDb();
    ensurePointsSetup(db);
    return (db.pointsRules ?? [])
      .filter((r) => r.companyId === companyId)
      .slice()
      .sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
  },
  upsertPointsRule(companyId: string, data: Omit<PointsRule, "id" | "companyId" | "createdAt"> & { id?: string }) {
    const db = loadDb();
    ensurePointsSetup(db);

    const points = Math.floor(Number(data.points) || 0);

    if (data.id) {
      const existing = (db.pointsRules ?? []).find((r) => r.id === data.id);
      if (!existing) throw new Error("Regra não encontrada.");
      existing.label = data.label.trim();
      existing.category = data.category;
      existing.key = data.key;
      existing.points = points;
      existing.description = data.description?.trim() || undefined;
      existing.active = !!data.active;
      saveDb(db);
      return existing;
    }

    const r: PointsRule = {
      id: uid("pr"),
      companyId,
      key: data.key,
      category: data.category,
      label: data.label.trim(),
      points,
      description: data.description?.trim() || undefined,
      active: !!data.active,
      createdAt: nowIso(),
    };
    db.pointsRules = db.pointsRules ?? [];
    db.pointsRules.push(r);
    saveDb(db);
    return r;
  },
  getPointsEventsForUser(companyId: string, userId: string) {
    const db = loadDb();
    ensurePointsSetup(db);
    return (db.pointsEvents ?? [])
      .filter((e) => e.companyId === companyId && e.userId === userId)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  awardPoints(params: { companyId: string; userId: string; ruleKey: PointsRuleKey; points: number; note?: string; createdByUserId?: string }) {
    const db = loadDb();
    ensurePointsSetup(db);

    const points = Math.floor(Number(params.points) || 0);
    if (!Number.isFinite(points)) throw new Error("Pontos inválidos.");

    const e: PointsEvent = {
      id: uid("pe"),
      companyId: params.companyId,
      userId: params.userId,
      ruleKey: params.ruleKey,
      points,
      note: params.note?.trim() || undefined,
      createdAt: nowIso(),
      createdByUserId: params.createdByUserId,
    };

    db.pointsEvents = db.pointsEvents ?? [];
    db.pointsEvents.push(e);
    saveDb(db);
    return e;
  },
  getUserXpBreakdown(userId: string) {
    const db = loadDb();
    const u = db.users.find((x) => x.id === userId);
    const companyId = u?.companyId;
    return {
      tracksXp: computeUserXpFromTracks(db, userId),
      eventsXp: computeUserXpFromEvents(db, userId),
      tenureXp: computeTenureXp(db, userId),
      totalXp: computeUserXp(db, userId),
      companyId: companyId ?? null,
    };
  },

  createInvite(params: { companyId: string; email: string; role: User["role"]; name?: string }) {
    const db = loadDb();
    const email = params.email.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("E-mail inválido.");

    const inv: Invite = {
      id: uid("inv"),
      token: randomToken(),
      companyId: params.companyId,
      email,
      role: params.role,
      name: params.name?.trim() || undefined,
      createdAt: nowIso(),
    };
    db.invites.push(inv);
    saveDb(db);
    return inv;
  },
  getInviteByToken(token: string) {
    const db = loadDb();
    return db.invites.find((i) => i.token === token) ?? null;
  },
  acceptInvite(token: string, params?: { name?: string }) {
    const db = loadDb();
    const inv = db.invites.find((i) => i.token === token);
    if (!inv) throw new Error("Convite inválido.");
    if (inv.usedAt) throw new Error("Este convite já foi utilizado.");

    const existing = db.users.find((u) => u.email.toLowerCase() === inv.email.toLowerCase());
    if (existing) {
      inv.usedAt = nowIso();
      // ensure companyId/role
      existing.companyId = inv.companyId;
      existing.role = inv.role;
      existing.name = (params?.name ?? inv.name ?? existing.name).trim();
      existing.active = true;
      existing.joinedAt = existing.joinedAt ?? nowIso();
      saveDb(db);
      return existing;
    }

    const u: User = {
      id: uid("usr"),
      companyId: inv.companyId,
      name: (params?.name ?? inv.name ?? inv.email.split("@")[0]).trim(),
      email: inv.email,
      role: inv.role,
      active: true,
      joinedAt: nowIso(),
    };

    db.users.push(u);
    inv.usedAt = nowIso();
    saveDb(db);
    return u;
  },

  // Auth
  findUserByEmail(email: string) {
    const db = loadDb();
    return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.active);
  },
  verifyPassword(email: string, password: string) {
    const u = this.findUserByEmail(email);
    if (!u) return { ok: false as const, message: "Usuário não encontrado." };
    if (!u.password) return { ok: true as const, user: u };
    if (u.password !== password) return { ok: false as const, message: "Senha incorreta." };
    return { ok: true as const, user: u };
  },

  setUserPassword(userId: string, nextPassword: string, opts?: { mustChangePassword?: boolean }) {
    const db = loadDb();
    const u = db.users.find((x) => x.id === userId);
    if (!u) throw new Error("Usuário não encontrado.");

    const p = nextPassword.trim();
    if (p.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");

    u.password = p;
    if (typeof opts?.mustChangePassword === "boolean") u.mustChangePassword = opts.mustChangePassword;
    saveDb(db);
    return u;
  },

  // Queries
  getDepartments(companyId?: string) {
    const db = loadDb();
    if (!companyId) return db.departments;
    return db.departments.filter((d) => d.companyId === companyId);
  },
  getUsers(companyId?: string) {
    const db = loadDb();
    if (!companyId) return db.users;
    return db.users.filter((u) => u.companyId === companyId);
  },
  getTracks(companyId?: string) {
    const db = loadDb();
    if (!companyId) return db.tracks;
    return db.tracks.filter((t) => t.companyId === companyId);
  },
  getTrack(trackId: string) {
    return loadDb().tracks.find((t) => t.id === trackId);
  },
  getModulesByTrack(trackId: string) {
    return loadDb()
      .modules.filter((m) => m.trackId === trackId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  },
  getAssignmentDetail(assignmentId: string): AssignmentDetail | null {
    const db = loadDb();
    const assignment = db.assignments.find((a) => a.id === assignmentId);
    if (!assignment) return null;

    syncAssignmentProgress(db, assignmentId);
    const refreshed = loadDb();
    const assignment2 = refreshed.assignments.find((a) => a.id === assignmentId)!;

    const track = refreshed.tracks.find((t) => t.id === assignment2.trackId)!;
    const modules = refreshed.modules
      .filter((m) => m.trackId === track.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const progress = refreshed.moduleProgress.filter((p) => p.assignmentId === assignmentId);
    const progressByModuleId = Object.fromEntries(progress.map((p) => [p.moduleId, p]));
    return { assignment: assignment2, track, modules, progressByModuleId };
  },

  getAssignmentsForUser(userId: string) {
    const db = loadDb();
    db.assignments.filter((a) => a.userId === userId).forEach((a) => syncAssignmentProgress(db, a.id));
    const refreshed = loadDb();

    return refreshed.assignments
      .filter((a) => a.userId === userId)
      .map((a) => {
        const track = refreshed.tracks.find((t) => t.id === a.trackId)!;
        const stats = computeAssignmentStats(refreshed, a.id);
        return {
          assignment: a,
          track,
          completedModules: stats.done,
          totalModules: stats.total,
          progressPct: stats.progressPct,
        };
      })
      .sort((x, y) => {
        const ax = x.assignment.completedAt ? 1 : 0;
        const ay = y.assignment.completedAt ? 1 : 0;
        return ax - ay;
      });
  },

  getCertificatesForUser(userId: string) {
    const db = loadDb();
    const assignmentIds = db.assignments.filter((a) => a.userId === userId).map((a) => a.id);
    return db.certificates
      .filter((c) => assignmentIds.includes(c.assignmentId))
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  },

  getCertificate(certificateId: string) {
    const db = loadDb();
    return db.certificates.find((c) => c.id === certificateId) ?? null;
  },

  // Head views
  getCollaboratorsOverview(departmentId: string): CollaboratorOverview[] {
    const db = loadDb();
    const collaborators = db.users.filter((u) => u.departmentId === departmentId && u.role === "COLABORADOR" && u.active);
    db.assignments
      .filter((a) => collaborators.some((c) => c.id === a.userId))
      .forEach((a) => syncAssignmentProgress(db, a.id));

    const refreshed = loadDb();
    const collaborators2 = refreshed.users.filter(
      (u) => u.departmentId === departmentId && u.role === "COLABORADOR" && u.active,
    );

    return collaborators2.map((user) => {
      const assignments = refreshed.assignments
        .filter((a) => a.userId === user.id)
        .map((assignment) => {
          const track = refreshed.tracks.find((t) => t.id === assignment.trackId)!;
          const stats = computeAssignmentStats(refreshed, assignment.id);
          return {
            assignment,
            track,
            completedModules: stats.done,
            totalModules: stats.total,
            progressPct: stats.progressPct,
            currentModuleTitle: computeCurrentModuleTitle(refreshed, assignment.id),
            needsAttention: computeNeedsAttention(refreshed, assignment.id),
          };
        });
      return { user, assignments };
    });
  },

  getTracksByDepartment(departmentId: string) {
    const db = loadDb();
    return db.tracks
      .filter((t) => t.departmentId === departmentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  // Gamificação
  getRewardTiers(companyId: string) {
    const db = loadDb();
    return (db.rewardTiers ?? [])
      .filter((t) => t.companyId === companyId)
      .slice()
      .sort((a, b) => a.minXp - b.minXp);
  },

  upsertRewardTier(
    companyId: string,
    data: Omit<RewardTier, "id" | "companyId" | "createdAt"> & { id?: string },
  ) {
    const db = loadDb();
    if (!Array.isArray((db as any).rewardTiers)) (db as any).rewardTiers = [];

    const minXp = Math.max(0, Math.floor(Number(data.minXp) || 0));
    const name = data.name.trim();

    if (name.length < 2) throw new Error("Nome do tier é obrigatório.");

    const clash = (db.rewardTiers ?? []).find(
      (t) => t.companyId === companyId && t.minXp === minXp && t.id !== data.id,
    );
    if (clash) throw new Error(`Já existe um tier com XP mínimo ${minXp}.`);

    if (data.id) {
      const existing = db.rewardTiers.find((t) => t.id === data.id);
      if (!existing) throw new Error("Tier não encontrado.");
      existing.name = name;
      existing.minXp = minXp;
      existing.prize = data.prize.trim();
      existing.description = data.description?.trim() || undefined;
      existing.active = !!data.active;
      saveDb(db);
      return existing;
    }

    const tier: RewardTier = {
      id: uid("tier"),
      companyId,
      name,
      minXp,
      prize: data.prize.trim(),
      description: data.description?.trim() || undefined,
      active: !!data.active,
      createdAt: nowIso(),
    };
    db.rewardTiers.push(tier);
    saveDb(db);
    return tier;
  },

  deleteRewardTier(tierId: string) {
    const db = loadDb();
    db.rewardTiers = (db.rewardTiers ?? []).filter((t) => t.id !== tierId);
    saveDb(db);
  },

  getXpLeaderboard(companyId: string) {
    const db = loadDb();

    const users = db.users
      .filter((u) => u.companyId === companyId)
      .filter((u) => u.active)
      .filter((u) => u.role === "HEAD" || u.role === "COLABORADOR")
      .slice();

    const entries = users
      .map((u) => {
        const xp = computeUserXp(db, u.id);
        return { user: u, xp, tier: computeUserTier(db, companyId, xp) };
      })
      .sort((a, b) => b.xp - a.xp || a.user.name.localeCompare(b.user.name));

    return entries.map((e, idx) => ({ ...e, rank: idx + 1 }));
  },

  getTeamXpLeaderboard(companyId: string) {
    const db = loadDb();
    const depts = db.departments.filter((d) => d.companyId === companyId);

    const eligibleUsers = db.users
      .filter((u) => u.companyId === companyId)
      .filter((u) => u.active)
      .filter((u) => u.role === "HEAD" || u.role === "COLABORADOR")
      .filter((u) => !!u.departmentId);

    const xpByUserId = new Map(eligibleUsers.map((u) => [u.id, computeUserXp(db, u.id)] as const));

    return depts
      .map((d) => {
        const members = eligibleUsers.filter((u) => u.departmentId === d.id);
        const totalXp = members.reduce((acc, u) => acc + (xpByUserId.get(u.id) ?? 0), 0);
        const membersCount = members.length;
        const avgXp = membersCount ? Math.round(totalXp / membersCount) : 0;
        return { departmentId: d.id, membersCount, totalXp, avgXp };
      })
      .filter((x) => x.membersCount > 0);
  },

  // Mutations: assignment progress
  startAssignmentIfNeeded(assignmentId: string) {
    const db = loadDb();
    const a = db.assignments.find((x) => x.id === assignmentId);
    if (!a) return;
    if (a.status === "NOT_STARTED") {
      a.status = "IN_PROGRESS";
      a.startedAt = nowIso();
      saveDb(db);
    }
  },

  completeVideo(assignmentId: string, moduleId: string) {
    const db = loadDb();
    const p = db.moduleProgress.find((x) => x.assignmentId === assignmentId && x.moduleId === moduleId);
    if (!p || p.status !== "AVAILABLE") return;

    p.status = "COMPLETED";
    p.completedAt = nowIso();
    unlockNextIfAny(db, assignmentId);

    const a = db.assignments.find((x) => x.id === assignmentId);
    if (a && (a.status === "NOT_STARTED" || a.status === "LOCKED")) {
      a.status = "IN_PROGRESS";
      a.startedAt = a.startedAt ?? nowIso();
    }

    issueCertificateIfCompleted(db, assignmentId);
    saveDb(db);
  },

  submitCheckpoint(assignmentId: string, moduleId: string, answer: string) {
    const db = loadDb();
    const p = db.moduleProgress.find((x) => x.assignmentId === assignmentId && x.moduleId === moduleId);
    if (!p || p.status !== "AVAILABLE") return;

    p.checkpointAnswerText = answer.trim();
    p.status = "COMPLETED";
    p.completedAt = nowIso();
    unlockNextIfAny(db, assignmentId);

    const a = db.assignments.find((x) => x.id === assignmentId);
    if (a && (a.status === "NOT_STARTED" || a.status === "LOCKED")) {
      a.status = "IN_PROGRESS";
      a.startedAt = a.startedAt ?? nowIso();
    }

    issueCertificateIfCompleted(db, assignmentId);
    saveDb(db);
  },

  submitQuiz(
    assignmentId: string,
    moduleId: string,
    answersByQuestionId: Record<string, string>,
  ): { score: number; passed: boolean; minScore: number } {
    const db = loadDb();
    const mod = db.modules.find((m) => m.id === moduleId);
    const p = db.moduleProgress.find((x) => x.assignmentId === assignmentId && x.moduleId === moduleId);

    const minScore = mod?.minScore ?? 70;
    if (!mod || !p || p.status !== "AVAILABLE") return { score: 0, passed: false, minScore };

    const questions = db.quizQuestions
      .filter((q) => q.moduleId === moduleId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    let correct = 0;
    for (const q of questions) {
      const pickedOptionId = answersByQuestionId[q.id];
      const opts = db.quizOptions.filter((o) => o.questionId === q.id);
      const chosen = opts.find((o) => o.id === pickedOptionId);
      if (chosen?.isCorrect) correct += 1;
    }

    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
    const passed = score >= minScore;

    p.attemptsCount += 1;
    p.score = score;
    p.passed = passed;

    if (passed) {
      p.status = "COMPLETED";
      p.completedAt = nowIso();
      unlockNextIfAny(db, assignmentId);
      issueCertificateIfCompleted(db, assignmentId);

      const a = db.assignments.find((x) => x.id === assignmentId);
      if (a && (a.status === "NOT_STARTED" || a.status === "LOCKED")) {
        a.status = "IN_PROGRESS";
        a.startedAt = a.startedAt ?? nowIso();
      }
    }

    saveDb(db);
    return { score, passed, minScore };
  },

  // Mutations: Head/admin
  assignTrack(params: { trackId: string; userId: string; assignedByUserId: string; dueAt?: string }) {
    const db = loadDb();
    const track = db.tracks.find((t) => t.id === params.trackId);
    if (!track) return null;

    const already = db.assignments.find((a) => a.userId === params.userId && a.trackId === params.trackId);
    if (already) {
      // Update deadline / delegator without resetting progress
      already.dueAt = params.dueAt ?? already.dueAt;
      already.assignedByUserId = params.assignedByUserId;
      saveDb(db);
      return already;
    }

    const a: TrackAssignment = {
      id: uid("asg"),
      trackId: params.trackId,
      userId: params.userId,
      status: "NOT_STARTED",
      assignedByUserId: params.assignedByUserId,
      assignedAt: nowIso(),
      dueAt: params.dueAt,
    };

    db.assignments.push(a);

    const ordered = db.modules
      .filter((m) => m.trackId === params.trackId)
      .sort((x, y) => x.orderIndex - y.orderIndex);

    ordered.forEach((m, idx) => {
      db.moduleProgress.push({
        id: uid("mpr"),
        assignmentId: a.id,
        moduleId: m.id,
        status: idx === 0 ? "AVAILABLE" : "LOCKED",
        attemptsCount: 0,
      });
    });

    // Notify assigned user
    const target = db.users.find((u) => u.id === params.userId);
    const assignedBy = db.users.find((u) => u.id === params.assignedByUserId);
    if (target && target.active) {
      let href = "/tracks";
      if (target.role === "COLABORADOR") href = `/app/tracks/${a.id}`;
      else if (target.role === "HEAD") href = "/head/tracks";

      const dueLabel = params.dueAt ? new Date(params.dueAt).toLocaleDateString("pt-BR") : null;
      const message = `Você recebeu a trilha " ${track.title} " ${assignedBy ? ` de ${assignedBy.name}` : ""}${dueLabel ? ` (prazo: ${dueLabel})` : ""}.`;
      pushNotification(db, {
        companyId: track.companyId,
        userId: target.id,
        type: "TRACK_ASSIGNED",
        title: "Nova trilha atribuída",
        message,
        href,
      });
    }

    saveDb(db);
    return a;
  },

  createTrack(params: { departmentId: string; title: string; description: string; createdByUserId: string }) {
    const db = loadDb();
    const creatorCompanyId = companyOfUser(db, params.createdByUserId);
    const dept = db.departments.find((d) => d.id === params.departmentId);
    if (!dept) throw new Error("Departamento inválido.");

    const t: LearningTrack = {
      id: uid("trk"),
      companyId: creatorCompanyId ?? dept.companyId,
      departmentId: params.departmentId,
      title: params.title.trim(),
      description: params.description.trim(),
      published: false,
      createdByUserId: params.createdByUserId,
      createdAt: nowIso(),
    };
    db.tracks.push(t);
    saveDb(db);
    return t;
  },

  updateTrack(params: { trackId: string; title: string; description: string }) {
    const db = loadDb();
    const t = db.tracks.find((x) => x.id === params.trackId);
    if (!t) return null;
    t.title = params.title.trim();
    t.description = params.description.trim();
    saveDb(db);
    return t;
  },

  setTrackPublished(trackId: string, published: boolean) {
    const db = loadDb();
    const t = db.tracks.find((x) => x.id === trackId);
    if (!t) return;
    t.published = published;
    saveDb(db);
  },

  upsertModule(module: TrackModule) {
    const db = loadDb();
    const idx = db.modules.findIndex((m) => m.id === module.id);
    if (idx >= 0) db.modules[idx] = module;
    else db.modules.push(module);
    saveDb(db);
  },

  deleteModule(moduleId: string) {
    const db = loadDb();

    // Remove module
    db.modules = db.modules.filter((m) => m.id !== moduleId);

    // Remove quiz data for this module
    const questionIds = db.quizQuestions.filter((q) => q.moduleId === moduleId).map((q) => q.id);
    db.quizQuestions = db.quizQuestions.filter((q) => q.moduleId !== moduleId);
    db.quizOptions = db.quizOptions.filter((o) => !questionIds.includes(o.questionId));

    // IMPORTANT: remove progress rows that point to the deleted module
    const affectedAssignmentIds = Array.from(
      new Set(db.moduleProgress.filter((p) => p.moduleId === moduleId).map((p) => p.assignmentId)),
    );
    db.moduleProgress = db.moduleProgress.filter((p) => p.moduleId !== moduleId);

    // Ensure each affected assignment still has a single AVAILABLE if needed
    for (const asgId of affectedAssignmentIds) {
      unlockNextIfAny(db, asgId);
    }

    saveDb(db);
  },

  getQuizForModule(moduleId: string) {
    const db = loadDb();
    const questions = db.quizQuestions
      .filter((q) => q.moduleId === moduleId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const optionsByQuestionId = Object.fromEntries(
      questions.map((q) => [q.id, db.quizOptions.filter((o) => o.questionId === q.id)]),
    ) as Record<string, QuizOption[]>;

    return { questions, optionsByQuestionId };
  },

  replaceQuiz(
    moduleId: string,
    data: { questions: { prompt: string; type: "TRUE_FALSE" | "MULTIPLE_CHOICE"; options: { text: string; isCorrect: boolean }[] }[] },
  ) {
    const db = loadDb();

    const oldQIds = db.quizQuestions.filter((q) => q.moduleId === moduleId).map((q) => q.id);
    db.quizQuestions = db.quizQuestions.filter((q) => q.moduleId !== moduleId);
    db.quizOptions = db.quizOptions.filter((o) => !oldQIds.includes(o.questionId));

    data.questions.forEach((q, idx) => {
      const qId = uid("qq");
      db.quizQuestions.push({
        id: qId,
        moduleId,
        type: q.type,
        prompt: q.prompt,
        orderIndex: idx + 1,
      });
      q.options.forEach((o) => {
        db.quizOptions.push({
          id: uid("qo"),
          questionId: qId,
          text: o.text,
          isCorrect: o.isCorrect,
        });
      });
    });

    saveDb(db);
  },

  // Admin
  createUser(params: { companyId?: string; name: string; email: string; role: User["role"]; departmentId?: string }) {
    const db = loadDb();
    const exists = db.users.some((u) => u.email.toLowerCase() === params.email.toLowerCase());
    if (exists) throw new Error("E-mail já cadastrado.");

    if (params.role !== "MASTERADMIN" && !params.companyId) {
      throw new Error("Empresa é obrigatória para este papel.");
    }

    const u: User = {
      id: uid("usr"),
      companyId: params.role === "MASTERADMIN" ? undefined : params.companyId,
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      role: params.role,
      departmentId: params.role === "ADMIN" || params.role === "MASTERADMIN" ? undefined : params.departmentId,
      active: true,
      monthlyCostBRL: undefined,
      joinedAt: nowIso(),
    };

    db.users.push(u);
    saveDb(db);
    return u;
  },

  updateUserAdmin(userId: string, data: Partial<Pick<User, "name" | "role" | "companyId" | "departmentId" | "active">>) {
    const db = loadDb();
    const u = db.users.find((x) => x.id === userId);
    if (!u) return null;

    if (typeof data.name === "string" && data.name.trim()) u.name = data.name.trim();

    if (data.role) {
      u.role = data.role;
      if (u.role === "MASTERADMIN") {
        u.companyId = undefined;
        u.departmentId = undefined;
      }
      if (u.role === "ADMIN") {
        u.departmentId = undefined;
      }
    }

    if (data.companyId !== undefined) {
      // only applies to non-master roles
      if (u.role !== "MASTERADMIN") {
        u.companyId = data.companyId;
      }
    }

    if (data.departmentId !== undefined) {
      if (u.role === "HEAD" || u.role === "COLABORADOR") {
        u.departmentId = data.departmentId;
      } else {
        u.departmentId = undefined;
      }
    }

    if (typeof data.active === "boolean") u.active = data.active;

    saveDb(db);
    return u;
  },

  setUserActive(userId: string, active: boolean) {
    const db = loadDb();
    const u = db.users.find((x) => x.id === userId);
    if (!u) return;
    u.active = active;
    saveDb(db);
  },

  updateUserProfile(userId: string, data: { name?: string; avatarUrl?: string; contractUrl?: string; phone?: string; jobTitle?: string }) {
    const db = loadDb();
    const u = db.users.find((x) => x.id === userId);
    if (!u) return null;

    if (typeof data.name === "string") u.name = data.name.trim();
    if (typeof data.avatarUrl === "string") u.avatarUrl = data.avatarUrl.trim() || undefined;
    if (typeof data.contractUrl === "string") u.contractUrl = data.contractUrl.trim() || undefined;
    if (typeof data.phone === "string") u.phone = data.phone.trim() || undefined;
    if (typeof data.jobTitle === "string") u.jobTitle = data.jobTitle.trim() || undefined;

    saveDb(db);
    return u;
  },

  updateUserManager(userId: string, managerId: string | null) {
    const db = loadDb();
    const u = db.users.find((x) => x.id === userId);
    if (!u) return null;

    const nextManagerId = managerId ?? undefined;
    if (nextManagerId === u.id) throw new Error("Um usuário não pode ser gestor dele mesmo.");

    // Prevent cycles (simple): ensure new manager is not a descendant of the user.
    if (nextManagerId) {
      const byId = new Map(db.users.map((x) => [x.id, x] as const));
      let cursor: string | undefined = nextManagerId;
      const seen = new Set<string>();
      while (cursor) {
        if (cursor === u.id) throw new Error("Movimento inválido: criaria um ciclo no organograma.");
        if (seen.has(cursor)) break; // defensive
        seen.add(cursor);
        cursor = byId.get(cursor)?.managerId;
      }
    }

    u.managerId = nextManagerId;
    saveDb(db);
    return u;
  },

  // Financeiro
  getInvoicesForUser(userId: string) {
    const db = loadDb();
    return (db.invoices ?? [])
      .filter((i) => i.userId === userId)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  createInvoice(params: {
    userId: string;
    title: string;
    invoiceUrl: string;
    amountBRL?: number;
    issuedAt?: string;
  }) {
    const db = loadDb();
    const u = db.users.find((x) => x.id === params.userId);
    if (!u) throw new Error("Usuário inválido.");
    if (!u.companyId) throw new Error("Usuário sem empresa.");

    const url = params.invoiceUrl.trim();
    if (!url.startsWith("data:")) throw new Error("Envie um arquivo válido (PDF/imagem) para a nota fiscal.");

    const inv: Invoice = {
      id: uid("invf"),
      userId: params.userId,
      companyId: u.companyId,
      title: params.title.trim() || "Nota fiscal",
      invoiceUrl: url,
      amountBRL: typeof params.amountBRL === "number" && Number.isFinite(params.amountBRL) ? Math.max(0, params.amountBRL) : undefined,
      issuedAt: params.issuedAt,
      status: "PENDING",
      paidAt: undefined,
      createdAt: nowIso(),
    };

    db.invoices = db.invoices ?? [];
    db.invoices.push(inv);

    // Notify all people in Financeiro department
    const financeDeptId = db.departments.find((d) => d.companyId === u.companyId && d.name === "Financeiro")?.id;
    if (financeDeptId) {
      const recipients = db.users
        .filter((x) => x.active)
        .filter((x) => x.companyId === u.companyId)
        .filter((x) => x.departmentId === financeDeptId);

      const amountLabel = typeof inv.amountBRL === "number" ? ` (R$ ${inv.amountBRL.toFixed(2).replace(".", ",")})` : "";
      for (const r of recipients) {
        pushNotification(db, {
          companyId: u.companyId,
          userId: r.id,
          type: "INVOICE_SUBMITTED",
          title: "Nova nota fiscal enviada",
          message: `${u.name} enviou “${inv.title}”${amountLabel}.`,
          href: "/profile",
        });
      }
    }

    saveDb(db);
    return inv;
  },

  setInvoicePaid(invoiceId: string, paid: boolean) {
    const db = loadDb();
    const inv = (db.invoices ?? []).find((i) => i.id === invoiceId);
    if (!inv) throw new Error("Nota fiscal não encontrada.");

    inv.status = paid ? "PAID" : "PENDING";
    inv.paidAt = paid ? nowIso() : undefined;
    saveDb(db);
    return inv;
  },

  deleteInvoice(invoiceId: string, userId: string) {
    const db = loadDb();
    const inv = (db.invoices ?? []).find((i) => i.id === invoiceId);
    if (!inv) return;
    if (inv.userId !== userId) throw new Error("Você não pode remover esta nota.");
    if (inv.status === "PAID") throw new Error("Não é possível remover uma nota já paga.");
    db.invoices = (db.invoices ?? []).filter((i) => i.id !== invoiceId);
    saveDb(db);
  },

  importUsersBulk(params: {
    companyId: string;
    rows: Array<{
      email: string;
      name: string;
      role: "ADMIN" | "HEAD" | "COLABORADOR";
      // Departamento é obrigatório apenas para HEAD/COLABORADOR.
      department?: string;
      managerEmail?: string;
      phone?: string;
      monthlyCostBRL?: number;
      contractUrl?: string;
      avatarUrl?: string;
      active?: boolean;
      initialPassword?: string;
      joinedAt?: string;
    }>;
  }) {
    const db = loadDb();

    // Ensure departments exist for company
    const deptIds = new Map(
      db.departments
        .filter((d) => d.companyId === params.companyId)
        .map((d) => [normalizeText(d.name), d.id] as const),
    );

    const ensureDepartmentId = (depName: string) => {
      const name = depName.trim();
      if (!name) throw new Error("Departamento vazio.");

      const key = normalizeText(name);
      const existing = deptIds.get(key);
      if (existing) return existing;

      // Create department on-the-fly if it doesn't exist.
      const d: Department = {
        id: uid("dept"),
        companyId: params.companyId,
        name,
      };
      db.departments.push(d);
      deptIds.set(key, d.id);
      return d.id;
    };

    const byEmail = new Map(
      db.users
        .filter((u) => u.companyId === params.companyId)
        .map((u) => [u.email.toLowerCase(), u] as const),
    );

    let created = 0;
    let updated = 0;

    // First pass: create/update users (without managerId)
    for (const r of params.rows) {
      const email = r.email.trim().toLowerCase();
      if (!email.includes("@")) throw new Error(`E-mail inválido: ${r.email}`);
      if (!r.name.trim()) throw new Error(`Nome ausente para ${email}`);
      if (r.role !== "ADMIN" && r.role !== "HEAD" && r.role !== "COLABORADOR") {
        throw new Error(`Role inválido para ${email}`);
      }

      let deptId: string | null = null;
      if (r.role === "HEAD" || r.role === "COLABORADOR") {
        const depName = String(r.department ?? "").trim();
        if (!depName) throw new Error(`Departamento é obrigatório para ${email}.`);

        // NEW: create the department if it doesn't exist.
        deptId = ensureDepartmentId(depName);
      }

      const password = r.initialPassword?.trim();
      if (password && password.length < 6) {
        throw new Error(`Senha inicial muito curta para ${email} (mínimo 6 caracteres).`);
      }

      const existing = byEmail.get(email);

      if (!existing) {
        const u: User = {
          id: uid("usr"),
          companyId: params.companyId,
          name: r.name.trim(),
          email,
          role: r.role,
          departmentId: r.role === "ADMIN" ? undefined : (deptId ?? undefined),
          active: typeof r.active === "boolean" ? r.active : true,
          avatarUrl: r.avatarUrl?.trim() || undefined,
          contractUrl: r.contractUrl?.trim() || undefined,
          monthlyCostBRL: typeof r.monthlyCostBRL === "number" ? Math.max(0, r.monthlyCostBRL) : undefined,
          phone: r.phone?.trim() || undefined,
          managerId: undefined,
          password: password || undefined,
          mustChangePassword: !!password,
          joinedAt: r.joinedAt ?? nowIso(),
        };

        db.users.push(u);
        byEmail.set(email, u);
        created += 1;
      } else {
        existing.name = r.name.trim();
        existing.role = r.role;

        if (r.role === "ADMIN") {
          existing.departmentId = undefined;
          existing.managerId = undefined;
        } else {
          existing.departmentId = deptId ?? undefined;
        }

        if (typeof r.active === "boolean") existing.active = r.active;
        if (typeof r.monthlyCostBRL === "number") existing.monthlyCostBRL = Math.max(0, r.monthlyCostBRL);
        if (typeof r.phone === "string") existing.phone = r.phone.trim() || undefined;
        if (typeof r.contractUrl === "string") existing.contractUrl = r.contractUrl.trim() || undefined;
        if (typeof r.avatarUrl === "string") existing.avatarUrl = r.avatarUrl.trim() || undefined;
        if (typeof r.joinedAt === "string") existing.joinedAt = r.joinedAt;
        if (password) {
          existing.password = password;
          existing.mustChangePassword = true;
        }
        updated += 1;
      }
    }

    // Second pass: set managerId by managerEmail (after ensuring all targets exist)
    let managersLinked = 0;

    for (const r of params.rows) {
      const email = r.email.trim().toLowerCase();
      const u = byEmail.get(email);
      if (!u) continue;
      if (u.role === "ADMIN") continue;

      const mEmail = r.managerEmail?.trim().toLowerCase();
      if (!mEmail) continue;
      const manager = byEmail.get(mEmail);
      if (!manager) {
        throw new Error(
          `Gestor não encontrado para ${email}: ${mEmail}. Garanta que ele exista na planilha ou já esteja cadastrado.`,
        );
      }
      if (manager.id === u.id) throw new Error(`Gestor inválido para ${email}: não pode ser ele mesmo.`);
      if (wouldCreateCycle(db, u.id, manager.id)) {
        throw new Error(`Vínculo inválido para ${email}: criaria um ciclo no organograma.`);
      }

      u.managerId = manager.id;
      managersLinked += 1;
    }

    saveDb(db);
    return { created, updated, managersLinked };
  },

  // Notifications
  getNotificationsForUser(userId: string, opts?: { unreadOnly?: boolean }) {
    const db = loadDb();
    ensureNotifications(db);
    const unreadOnly = !!opts?.unreadOnly;
    return (db.notifications ?? [])
      .filter((n) => n.userId === userId)
      .filter((n) => (unreadOnly ? !n.readAt : true))
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  getUnreadNotificationsCount(userId: string) {
    return this.getNotificationsForUser(userId, { unreadOnly: true }).length;
  },
  markNotificationRead(userId: string, notificationId: string) {
    const db = loadDb();
    ensureNotifications(db);
    const n = (db.notifications ?? []).find((x) => x.id === notificationId && x.userId === userId);
    if (!n) return;
    n.readAt = n.readAt ?? nowIso();
    saveDb(db);
  },
  markAllNotificationsRead(userId: string) {
    const db = loadDb();
    ensureNotifications(db);
    let changed = false;
    for (const n of db.notifications ?? []) {
      if (n.userId !== userId) continue;
      if (n.readAt) continue;
      n.readAt = nowIso();
      changed = true;
    }
    if (changed) saveDb(db);
  },

  // Contracts (additivos)
  getContractAttachmentsForUser(userId: string) {
    const db = loadDb();
    ensureContractAttachments(db);
    return (db.contractAttachments ?? [])
      .filter((c) => c.userId === userId)
      .map((c) => {
        const url = (c.url ?? c.fileDataUrl ?? "").trim();
        const kind = c.kind ?? (url.startsWith("data:") ? "FILE" : "LINK");
        return { ...c, url, kind };
      })
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  addContractAttachment(params: { userId: string; title: string; url: string; kind?: "FILE" | "LINK"; fileDataUrl?: string }) {
    const db = loadDb();
    ensureContractAttachments(db);

    const u = db.users.find((x) => x.id === params.userId);
    if (!u) throw new Error("Usuário não encontrado.");
    if (!u.companyId) throw new Error("Usuário sem empresa.");

    const title = params.title.trim() || "Contrato";

    const rawUrl = (params.url ?? params.fileDataUrl ?? "").trim();
    if (!rawUrl) throw new Error("Informe um arquivo ou um link.");

    const inferredKind = params.kind ?? (rawUrl.startsWith("data:") ? "FILE" : "LINK");

    if (inferredKind === "FILE") {
      if (!rawUrl.startsWith("data:")) throw new Error("Arquivo inválido.");
    } else {
      if (!/^https?:\/\//i.test(rawUrl)) throw new Error("Link inválido. Use um URL completo (https://...).");
    }

    const c: ContractAttachment = {
      id: uid("ctrt"),
      companyId: u.companyId,
      userId: u.id,
      title,
      kind: inferredKind,
      url: rawUrl,
      // retrocompat (para registros antigos/preview)
      fileDataUrl: inferredKind === "FILE" ? rawUrl : undefined,
      createdAt: nowIso(),
    };

    db.contractAttachments.push(c);
    saveDb(db);
    return c;
  },
  deleteContractAttachment(params: { userId: string; contractAttachmentId: string }) {
    const db = loadDb();
    ensureContractAttachments(db);
    const before = db.contractAttachments.length;
    db.contractAttachments = db.contractAttachments.filter(
      (c) => !(c.id === params.contractAttachmentId && c.userId === params.userId),
    );
    if (db.contractAttachments.length !== before) saveDb(db);
  },

  // Remuneração
  getCompensationHistoryForUser(userId: string) {
    const db = loadDb();
    ensureCompensationEvents(db);
    return (db.compensationEvents ?? [])
      .filter((e) => e.userId === userId)
      .slice()
      .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt));
  },

  // Férias
  getVacationRequestsForUser(userId: string) {
    const db = loadDb();
    ensureVacationRequests(db);
    return (db.vacationRequests ?? [])
      .filter((r) => r.userId === userId)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  requestPaidVacation(params: { userId: string; startDate: string }) {
    const db = loadDb();
    ensureVacationRequests(db);
    ensureNotifications(db);

    const u = db.users.find((x) => x.id === params.userId);
    if (!u) throw new Error("Usuário não encontrado.");
    if (!u.companyId) throw new Error("Usuário sem empresa.");

    // Eligibility: only after 1 year
    const joinedMs = u.joinedAt ? new Date(u.joinedAt).getTime() : NaN;
    if (!Number.isFinite(joinedMs)) throw new Error("Não foi possível validar sua data de entrada.");
    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    if (Date.now() - joinedMs < ONE_YEAR_MS) {
      throw new Error("Pedidos de férias remuneradas são liberados apenas após 1 ano de Sinaxys.");
    }

    const startIso = startOfDayIso(params.startDate);
    if (!startIso) throw new Error("Data inválida.");

    // Lead time: 45 days
    const startMs = new Date(startIso).getTime();
    const LEAD_MS = 45 * 24 * 60 * 60 * 1000;
    if (startMs - Date.now() < LEAD_MS) {
      throw new Error("Solicite férias com pelo menos 45 dias de antecedência.");
    }

    const year = new Date(startIso).getUTCFullYear();
    const existing = (db.vacationRequests ?? []).filter(
      (r) => r.userId === u.id && new Date(r.startDate).getUTCFullYear() === year && r.status !== "REJECTED",
    );

    // 20 days/year split into 2 periods of 10
    if (existing.length >= 2) {
      throw new Error("Você já solicitou as 2 parcelas de férias remuneradas deste ano.");
    }

    const req: VacationRequest = {
      id: uid("vac"),
      companyId: u.companyId,
      userId: u.id,
      startDate: startIso,
      days: 10,
      status: "PENDING",
      createdAt: nowIso(),
      decidedAt: undefined,
      decidedByUserId: undefined,
      decisionNote: undefined,
    };

    db.vacationRequests.push(req);

    // Notify: direct manager (if any) + all admins
    const recipients = new Set<string>();
    if (u.managerId) recipients.add(u.managerId);
    db.users
      .filter((x) => x.companyId === u.companyId && x.role === "ADMIN" && x.active)
      .forEach((x) => recipients.add(x.id));
    recipients.delete(u.id);

    const startLabel = new Date(startIso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
    for (const toUserId of recipients) {
      pushNotification(db, {
        companyId: u.companyId,
        userId: toUserId,
        type: "VACATION_REQUEST",
        title: "Pedido de férias remuneradas",
        message: `${u.name} solicitou 10 dias a partir de ${startLabel}.`,
        href: `/people/${u.id}`,
      });
    }

    saveDb(db);
    return req;
  },

  decidePaidVacation(params: {
    requestId: string;
    decidedByUserId: string;
    status: "APPROVED" | "REJECTED";
    note: string;
  }) {
    const db = loadDb();
    ensureVacationRequests(db);
    ensureNotifications(db);

    const req = (db.vacationRequests ?? []).find((r) => r.id === params.requestId);
    if (!req) throw new Error("Pedido não encontrado.");
    if (req.status !== "PENDING") throw new Error("Este pedido já foi decidido.");

    const decider = db.users.find((u) => u.id === params.decidedByUserId && u.active);
    if (!decider) throw new Error("Decisor inválido.");

    const target = db.users.find((u) => u.id === req.userId);
    if (!target) throw new Error("Usuário do pedido não encontrado.");

    const note = params.note.trim();
    if (!note) throw new Error("Informe uma justificativa.");

    const canDecide =
      (decider.role === "ADMIN" && decider.companyId && decider.companyId === req.companyId) ||
      (decider.role === "HEAD" && target.managerId === decider.id);

    if (!canDecide) throw new Error("Você não tem permissão para decidir este pedido.");

    req.status = params.status;
    req.decidedAt = nowIso();
    req.decidedByUserId = decider.id;
    req.decisionNote = note;

    const startLabel = new Date(req.startDate).toLocaleDateString("pt-BR", { timeZone: "UTC" });
    pushNotification(db, {
      companyId: req.companyId,
      userId: req.userId,
      type: "VACATION_DECISION",
      title: params.status === "APPROVED" ? "Férias aprovadas" : "Férias recusadas",
      message: `${params.status === "APPROVED" ? "Aprovado" : "Recusado"} (início ${startLabel}). Justificativa: ${note}`,
      href: "/profile",
    });

    saveDb(db);
    return req;
  },

  // Admin
  updateUserCompensation(userId: string, data: { monthlyCostBRL?: number }, opts?: { createdByUserId?: string; effectiveAt?: string; note?: string }) {
    const db = loadDb();
    const u = db.users.find((x) => x.id === userId);
    if (!u) return null;

    const prev = u.monthlyCostBRL;

    if (typeof data.monthlyCostBRL === "number" && Number.isFinite(data.monthlyCostBRL)) {
      u.monthlyCostBRL = Math.max(0, data.monthlyCostBRL);
    }

    // Record compensation change
    if (u.companyId && typeof u.monthlyCostBRL === "number" && u.monthlyCostBRL !== (prev ?? undefined)) {
      ensureCompensationEvents(db);
      (db.compensationEvents ?? []).push({
        id: uid("cmpc"),
        companyId: u.companyId,
        userId: u.id,
        monthlyCostBRL: u.monthlyCostBRL,
        effectiveAt: opts?.effectiveAt ?? nowIso(),
        createdAt: nowIso(),
        createdByUserId: opts?.createdByUserId,
        note: opts?.note,
      });
    }

    saveDb(db);
    return u;
  },
};