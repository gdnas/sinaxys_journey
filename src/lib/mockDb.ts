import {
  type Certificate,
  type Db,
  type Department,
  type LearningTrack,
  type ModuleProgress,
  type QuizOption,
  type QuizQuestion,
  type TrackAssignment,
  type TrackModule,
  type User,
} from "@/lib/domain";

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

export function loadDb(): Db {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedDb();
    saveDb(seeded);
    return seeded;
  }

  try {
    return JSON.parse(raw) as Db;
  } catch {
    const seeded = seedDb();
    saveDb(seeded);
    return seeded;
  }
}

export function saveDb(db: Db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function resetDb() {
  localStorage.removeItem(STORAGE_KEY);
}

function seedDb(): Db {
  const departments: Department[] = [
    { id: uid("dept"), name: "Financeiro" },
    { id: uid("dept"), name: "Suporte" },
    { id: uid("dept"), name: "Customer Success" },
    { id: uid("dept"), name: "Comercial" },
    { id: uid("dept"), name: "Marketing" },
    { id: uid("dept"), name: "Produto" },
  ];

  const deptByName = (name: Department["name"]) =>
    departments.find((d) => d.name === name)!.id;

  const users: User[] = [
    {
      id: uid("usr"),
      name: "Aline Ramos",
      email: "aline@sinaxys.com",
      role: "COLABORADOR",
      departmentId: deptByName("Produto"),
      active: true,
    },
    {
      id: uid("usr"),
      name: "Bruno Teixeira",
      email: "bruno@sinaxys.com",
      role: "COLABORADOR",
      departmentId: deptByName("Customer Success"),
      active: true,
    },
    {
      id: uid("usr"),
      name: "Camila Souza",
      email: "camila@sinaxys.com",
      role: "HEAD",
      departmentId: deptByName("Produto"),
      active: true,
    },
    {
      id: uid("usr"),
      name: "Diego Martins",
      email: "diego@sinaxys.com",
      role: "HEAD",
      departmentId: deptByName("Customer Success"),
      active: true,
    },
    {
      id: uid("usr"),
      name: "Admin Sinaxys",
      email: "admin@sinaxys.com",
      role: "ADMIN",
      active: true,
    },
  ];

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

  // Auth
  findUserByEmail(email: string) {
    const db = loadDb();
    return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.active);
  },

  // Queries
  getDepartments() {
    return loadDb().departments;
  },
  getUsers() {
    return loadDb().users;
  },
  getTracks() {
    return loadDb().tracks;
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
  assignTrack(params: { trackId: string; userId: string; assignedByUserId: string }) {
    const db = loadDb();
    const track = db.tracks.find((t) => t.id === params.trackId);
    if (!track) return null;

    const already = db.assignments.find((a) => a.userId === params.userId && a.trackId === params.trackId);
    if (already) return already;

    const a: TrackAssignment = {
      id: uid("asg"),
      trackId: params.trackId,
      userId: params.userId,
      status: "NOT_STARTED",
      assignedByUserId: params.assignedByUserId,
      assignedAt: nowIso(),
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
    const t: LearningTrack = {
      id: uid("trk"),
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
    db.modules = db.modules.filter((m) => m.id !== moduleId);
    db.quizQuestions = db.quizQuestions.filter((q) => q.moduleId !== moduleId);
    const questionIds = db.quizQuestions.filter((q) => q.moduleId === moduleId).map((q) => q.id);
    db.quizOptions = db.quizOptions.filter((o) => !questionIds.includes(o.questionId));
    // keep progress as-is (MVP simplificação)
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

  replaceQuiz(moduleId: string, data: { questions: { prompt: string; type: "TRUE_FALSE" | "MULTIPLE_CHOICE"; options: { text: string; isCorrect: boolean }[] }[] }) {
    const db = loadDb();
    db.quizQuestions = db.quizQuestions.filter((q) => q.moduleId !== moduleId);
    const oldQIds = db.quizQuestions.filter((q) => q.moduleId === moduleId).map((q) => q.id);
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
  createUser(params: { name: string; email: string; role: User["role"]; departmentId?: string }) {
    const db = loadDb();
    const exists = db.users.some((u) => u.email.toLowerCase() === params.email.toLowerCase());
    if (exists) throw new Error("E-mail já cadastrado.");

    const u: User = {
      id: uid("usr"),
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      role: params.role,
      departmentId: params.role === "ADMIN" ? undefined : params.departmentId,
      active: true,
    };

    db.users.push(u);
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

  updateUserProfile(userId: string, data: { name?: string; avatarUrl?: string; contractUrl?: string }) {
    const db = loadDb();
    const u = db.users.find((x) => x.id === userId);
    if (!u) return null;

    if (typeof data.name === "string") u.name = data.name.trim();
    if (typeof data.avatarUrl === "string") u.avatarUrl = data.avatarUrl.trim() || undefined;
    if (typeof data.contractUrl === "string") u.contractUrl = data.contractUrl.trim() || undefined;

    saveDb(db);
    return u;
  },
};