import {
  type Certificate,
  type Company,
  type Db,
  type Department,
  type Invite,
  type LearningTrack,
  type ModuleProgress,
  type QuizOption,
  type QuizQuestion,
  type TrackAssignment,
  type TrackModule,
  type User,
} from "@/lib/domain";
import { SINAXYS_LOGO_DATA_URL } from "@/lib/brand";

const STORAGE_KEY = "sinaxys-journey-db:v1";

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

  if (changed) saveDb(db);
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

  saveDb(db);
}

export function loadDb(): Db {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedDb();
    saveDb(seeded);
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as Db;

    ensureMultiCompany(parsed);

    // Migration: add dueAt field (optional) for older assignments (no-op but keeps shape stable)
    if (Array.isArray((parsed as any).assignments)) {
      for (const a of (parsed as any).assignments) {
        if (a && typeof a === "object" && !("dueAt" in a)) {
          a.dueAt = undefined;
        }
      }
      saveDb(parsed);
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

      saveDb(parsed);
    }

    return parsed;
  } catch {
    const seeded = seedDb();
    saveDb(seeded);
    return seeded;
  }
}

export function saveDb(db: Db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    // Surface storage issues (e.g. quota exceeded) so UI can show an error toast.
    throw new Error(
      "Não foi possível salvar. O armazenamento do navegador pode estar cheio — tente remover itens antigos ou recarregar a página.",
    );
  }
}

export function resetDb() {
  localStorage.removeItem(STORAGE_KEY);
}

function seedDb(): Db {
  const companyId = uid("cmp");
  const company: Company = {
    id: companyId,
    ...defaultCompanyBrand(),
    createdAt: nowIso(),
  };

  const departments: Department[] = [
    { id: uid("dept"), companyId, name: "Financeiro" },
    { id: uid("dept"), companyId, name: "Suporte" },
    { id: uid("dept"), companyId, name: "Customer Success" },
    { id: uid("dept"), companyId, name: "Comercial" },
    { id: uid("dept"), companyId, name: "Marketing" },
    { id: uid("dept"), companyId, name: "Produto" },
  ];

  const deptByName = (name: Department["name"]) =>
    departments.find((d) => d.name === name)!.id;

  const users: User[] = [
    {
      id: uid("usr"),
      companyId,
      name: "Aline Ramos",
      email: "aline@sinaxys.com",
      role: "COLABORADOR",
      departmentId: deptByName("Produto"),
      active: true,
      monthlyCostBRL: 9500,
      phone: "+55 11 98888-1111",
      // managerId set after we create the heads
    },
    {
      id: uid("usr"),
      companyId,
      name: "Bruno Teixeira",
      email: "bruno@sinaxys.com",
      role: "COLABORADOR",
      departmentId: deptByName("Customer Success"),
      active: true,
      monthlyCostBRL: 6500,
      phone: "+55 21 97777-2222",
      // managerId set after we create the heads
    },
    {
      id: uid("usr"),
      companyId,
      name: "Camila Souza",
      email: "camila@sinaxys.com",
      role: "HEAD",
      departmentId: deptByName("Produto"),
      active: true,
      monthlyCostBRL: 16500,
      phone: "+55 11 96666-3333",
      // managerId set after we create the admin
    },
    {
      id: uid("usr"),
      companyId,
      name: "Diego Martins",
      email: "diego@sinaxys.com",
      role: "HEAD",
      departmentId: deptByName("Customer Success"),
      active: true,
      monthlyCostBRL: 14500,
      phone: "+55 21 95555-4444",
      // managerId set after we create the admin
    },
    {
      id: uid("usr"),
      companyId,
      name: "Admin Sinaxys",
      email: "admin@sinaxys.com",
      role: "ADMIN",
      active: true,
      phone: "+55 11 90000-0000",
      // topo do organograma (sem gestor)
    },
    {
      id: uid("usr"),
      name: "Master Admin",
      email: "master@sinaxys.com",
      role: "MASTERADMIN",
      active: true,
      // global
    },
  ];

  // Seed: organograma simples (admin -> heads -> colaboradores)
  const admin = users.find((u) => u.role === "ADMIN")!;
  const camila = users.find((u) => u.email === "camila@sinaxys.com")!;
  const diego = users.find((u) => u.email === "diego@sinaxys.com")!;
  const aline = users.find((u) => u.email === "aline@sinaxys.com")!;
  const bruno = users.find((u) => u.email === "bruno@sinaxys.com")!;

  camila.managerId = admin.id;
  diego.managerId = admin.id;
  aline.managerId = camila.id;
  bruno.managerId = diego.id;

  const findUser = (email: string) => users.find((u) => u.email === email)!;

  const tracks: LearningTrack[] = [];
  const modules: TrackModule[] = [];
  const quizQuestions: QuizQuestion[] = [];
  const quizOptions: QuizOption[] = [];

  function createTrack(params: {
    departmentName: Department["name"];
    title: string;
    description: string;
    createdByEmail: string;
    published?: boolean;
  }) {
    const t: LearningTrack = {
      id: uid("trk"),
      companyId,
      departmentId: deptByName(params.departmentName),
      title: params.title,
      description: params.description,
      published: params.published ?? true,
      createdByUserId: findUser(params.createdByEmail).id,
      createdAt: nowIso(),
    };
    tracks.push(t);
    return t;
  }

  function addVideo(trackId: string, orderIndex: number, data: Partial<TrackModule> & { title: string; youtubeUrl: string }) {
    modules.push({
      id: uid("mod"),
      trackId,
      orderIndex,
      type: "VIDEO",
      title: data.title,
      description: data.description,
      xpReward: data.xpReward ?? 20,
      youtubeUrl: data.youtubeUrl,
    });
  }

  function addCheckpoint(trackId: string, orderIndex: number, data: Partial<TrackModule> & { title: string; prompt: string }) {
    modules.push({
      id: uid("mod"),
      trackId,
      orderIndex,
      type: "CHECKPOINT",
      title: data.title,
      description: data.description,
      xpReward: data.xpReward ?? 30,
      checkpointPrompt: data.prompt,
    });
  }

  function addTrueFalseQuiz(trackId: string, orderIndex: number, data: { title: string; description?: string; minScore?: number; questions: { prompt: string; correct: boolean }[] }) {
    const modId = uid("mod");
    modules.push({
      id: modId,
      trackId,
      orderIndex,
      type: "QUIZ",
      title: data.title,
      description: data.description,
      xpReward: 40,
      minScore: data.minScore ?? 70,
    });

    data.questions.forEach((q, idx) => {
      const qId = uid("qq");
      quizQuestions.push({
        id: qId,
        moduleId: modId,
        type: "TRUE_FALSE",
        prompt: q.prompt,
        orderIndex: idx + 1,
      });
      quizOptions.push(
        { id: uid("qo"), questionId: qId, text: "Verdadeiro", isCorrect: q.correct === true },
        { id: uid("qo"), questionId: qId, text: "Falso", isCorrect: q.correct === false },
      );
    });
  }

  // Seed: Trilhas exemplo (Produto e CS)
  const trkProduto = createTrack({
    departmentName: "Produto",
    title: "Onboarding — Produto na Sinaxys",
    description:
      "Uma jornada objetiva para entender o contexto de saúde, os princípios de produto e como entregamos valor com responsabilidade.",
    createdByEmail: "camila@sinaxys.com",
  });

  addVideo(trkProduto.id, 1, {
    title: "Boas-vindas e contexto da Sinaxys",
    description: "Visão do negócio, impacto em saúde e como operamos no dia a dia.",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  });

  addTrueFalseQuiz(trkProduto.id, 2, {
    title: "Quiz — Fundamentos da jornada",
    description: "Checagem rápida para consolidar os pontos essenciais.",
    minScore: 70,
    questions: [
      { prompt: "A Sinaxys atua como fintech de saúde, integrando tecnologia e operação regulada.", correct: true },
      { prompt: "Concluir um módulo não influencia o desbloqueio do próximo na Journey.", correct: false },
    ],
  });

  addCheckpoint(trkProduto.id, 3, {
    title: "Checkpoint — Como você pretende gerar impacto?",
    prompt:
      "Em 4–6 linhas, descreva como você pretende contribuir para a experiência do cliente e para a evolução do produto.",
  });

  addVideo(trkProduto.id, 4, {
    title: "Ritual de produto e alinhamentos",
    description: "Como priorizamos, decidimos e comunicamos. Clareza antes de velocidade.",
    youtubeUrl: "https://www.youtube.com/watch?v=ysz5S6PUM-U",
  });

  const trkCS = createTrack({
    departmentName: "Customer Success",
    title: "Onboarding — Customer Success",
    description:
      "Uma trilha direta para entender a jornada do cliente, padrões de atendimento e os critérios de excelência da Sinaxys.",
    createdByEmail: "diego@sinaxys.com",
  });

  addVideo(trkCS.id, 1, {
    title: "Padrões de atendimento e tom de voz",
    description:
      "Profissional, acolhedor e pragmático. A clareza é parte da confiança.",
    youtubeUrl: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    xpReward: 15,
  });

  addCheckpoint(trkCS.id, 2, {
    title: "Checkpoint — Simule uma resposta",
    prompt:
      "Responda a um cliente que está confuso com o status do pagamento. Seja claro, objetivo e acolhedor.",
  });

  addTrueFalseQuiz(trkCS.id, 3, {
    title: "Quiz — Critérios de excelência",
    minScore: 70,
    questions: [
      { prompt: "Engajamento é importante, mas nunca deve comprometer precisão e compliance.", correct: true },
      { prompt: "Se o cliente insiste, podemos prometer prazos sem validação interna.", correct: false },
    ],
  });

  // Assignments
  const assignments: TrackAssignment[] = [];
  const moduleProgress: ModuleProgress[] = [];
  const certificates: Certificate[] = [];

  function createAssignment(trackId: string, userEmail: string, assignedByEmail: string) {
    const a: TrackAssignment = {
      id: uid("asg"),
      trackId,
      userId: findUser(userEmail).id,
      status: "NOT_STARTED",
      assignedByUserId: findUser(assignedByEmail).id,
      assignedAt: nowIso(),
    };
    assignments.push(a);

    const trackModules = modules
      .filter((m) => m.trackId === trackId)
      .sort((x, y) => x.orderIndex - y.orderIndex);

    trackModules.forEach((m, idx) => {
      moduleProgress.push({
        id: uid("mpr"),
        assignmentId: a.id,
        moduleId: m.id,
        status: idx === 0 ? "AVAILABLE" : "LOCKED",
        attemptsCount: 0,
      });
    });

    return a;
  }

  createAssignment(trkProduto.id, "aline@sinaxys.com", "camila@sinaxys.com");
  createAssignment(trkCS.id, "bruno@sinaxys.com", "diego@sinaxys.com");

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
    const base = defaultCompanyBrand();
    const c: Company = {
      id: uid("cmp"),
      name: params.name.trim(),
      tagline: params.tagline?.trim() || base.tagline,
      logoDataUrl: base.logoDataUrl,
      colors: base.colors,
      createdAt: nowIso(),
    };
    db.companies.push(c);

    // Seed departments for the new company
    const names: Department["name"][] = ["Financeiro", "Suporte", "Customer Success", "Comercial", "Marketing", "Produto"];
    for (const n of names) {
      db.departments.push({ id: uid("dept"), companyId: c.id, name: n });
    }

    saveDb(db);
    return c;
  },
  updateCompanyBrand(companyId: string, data: Partial<Pick<Company, "name" | "tagline" | "logoDataUrl" | "colors">>) {
    const db = loadDb();
    const c = db.companies.find((x) => x.id === companyId);
    if (!c) return null;

    if (typeof data.name === "string" && data.name.trim()) c.name = data.name.trim();
    if (typeof data.tagline === "string" && data.tagline.trim()) c.tagline = data.tagline.trim();
    if (typeof data.logoDataUrl === "string") c.logoDataUrl = data.logoDataUrl || undefined;
    if (data.colors && typeof data.colors === "object") c.colors = data.colors as any;

    saveDb(db);
    return c;
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

  updateUserProfile(userId: string, data: { name?: string; avatarUrl?: string; contractUrl?: string; phone?: string }) {
    const db = loadDb();
    const u = db.users.find((x) => x.id === userId);
    if (!u) return null;

    if (typeof data.name === "string") u.name = data.name.trim();
    if (typeof data.avatarUrl === "string") u.avatarUrl = data.avatarUrl.trim() || undefined;
    if (typeof data.contractUrl === "string") u.contractUrl = data.contractUrl.trim() || undefined;
    if (typeof data.phone === "string") u.phone = data.phone.trim() || undefined;

    saveDb(db);
    return u;
  },

  updateUserCompensation(userId: string, data: { monthlyCostBRL?: number }) {
    const db = loadDb();
    const u = db.users.find((x) => x.id === userId);
    if (!u) return null;

    if (typeof data.monthlyCostBRL === "number" && Number.isFinite(data.monthlyCostBRL)) {
      u.monthlyCostBRL = Math.max(0, data.monthlyCostBRL);
    }

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

  importUsersBulk(params: {
    companyId: string;
    rows: Array<{
      email: string;
      name: string;
      role: "HEAD" | "COLABORADOR";
      department: string;
      managerEmail?: string;
      phone?: string;
      monthlyCostBRL?: number;
      contractUrl?: string;
      avatarUrl?: string;
      active?: boolean;
    }>;
  }) {
    const db = loadDb();

    // Ensure departments exist for company
    const deptIds = new Map(db.departments.filter((d) => d.companyId === params.companyId).map((d) => [normalizeText(d.name), d.id] as const));

    const byEmail = new Map(
      db.users
        .filter((u) => u.companyId === params.companyId)
        .map((u) => [u.email.toLowerCase(), u] as const),
    );

    const createdEmails: string[] = [];
    let created = 0;
    let updated = 0;

    // First pass: create/update users (without managerId)
    for (const r of params.rows) {
      const email = r.email.trim().toLowerCase();
      if (!email.includes("@")) throw new Error(`E-mail inválido: ${r.email}`);
      if (!r.name.trim()) throw new Error(`Nome ausente para ${email}`);
      if (r.role !== "HEAD" && r.role !== "COLABORADOR") throw new Error(`Role inválido para ${email}`);

      const deptId = findDepartmentIdByName(db, params.companyId, r.department);
      if (!deptId) {
        const known = Array.from(deptIds.keys()).join(", ");
        throw new Error(`Departamento não encontrado para ${email}: “${r.department}”.`);
      }

      const existing = byEmail.get(email);

      if (!existing) {
        const u: User = {
          id: uid("usr"),
          companyId: params.companyId,
          name: r.name.trim(),
          email,
          role: r.role,
          departmentId: deptId,
          active: typeof r.active === "boolean" ? r.active : true,
          avatarUrl: r.avatarUrl?.trim() || undefined,
          contractUrl: r.contractUrl?.trim() || undefined,
          monthlyCostBRL: typeof r.monthlyCostBRL === "number" ? Math.max(0, r.monthlyCostBRL) : undefined,
          phone: r.phone?.trim() || undefined,
          managerId: undefined,
        };

        db.users.push(u);
        byEmail.set(email, u);
        created += 1;
        createdEmails.push(email);
      } else {
        existing.name = r.name.trim();
        existing.role = r.role;
        existing.departmentId = deptId;
        if (typeof r.active === "boolean") existing.active = r.active;
        if (typeof r.monthlyCostBRL === "number") existing.monthlyCostBRL = Math.max(0, r.monthlyCostBRL);
        if (typeof r.phone === "string") existing.phone = r.phone.trim() || undefined;
        if (typeof r.contractUrl === "string") existing.contractUrl = r.contractUrl.trim() || undefined;
        if (typeof r.avatarUrl === "string") existing.avatarUrl = r.avatarUrl.trim() || undefined;
        updated += 1;
      }
    }

    // Second pass: set managerId by managerEmail (after ensuring all targets exist)
    let managersLinked = 0;

    for (const r of params.rows) {
      const email = r.email.trim().toLowerCase();
      const u = byEmail.get(email);
      if (!u) continue;

      const mEmail = r.managerEmail?.trim().toLowerCase();
      if (!mEmail) continue;
      const manager = byEmail.get(mEmail);
      if (!manager) {
        throw new Error(`Gestor não encontrado para ${email}: ${mEmail}. Garanta que ele exista na planilha ou já esteja cadastrado.`);
      }
      if (manager.id === u.id) throw new Error(`Gestor inválido para ${email}: não pode ser ele mesmo.`);
      if (wouldCreateCycle(db, u.id, manager.id)) throw new Error(`Vínculo inválido para ${email}: criaria um ciclo no organograma.`);

      u.managerId = manager.id;
      managersLinked += 1;
    }

    saveDb(db);
    return { created, updated, managersLinked };
  },
};