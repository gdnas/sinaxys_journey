export type Role = "MASTERADMIN" | "ADMIN" | "HEAD" | "COLABORADOR";

export type DepartmentName =
  | "Financeiro"
  | "Suporte"
  | "Customer Success"
  | "Comercial"
  | "Marketing"
  | "Produto";

export type CompanyColors = {
  ink: string;
  primary: string;
  bg: string;
  tint: string;
  border: string;
};

export type Company = {
  id: string;
  name: string;
  tagline: string;
  logoDataUrl?: string;
  colors: CompanyColors;
  createdAt: string;
};

export type Invite = {
  id: string;
  token: string;
  companyId: string;
  email: string;
  role: Role; // geralmente ADMIN/HEAD/COLABORADOR
  name?: string;
  createdAt: string;
  usedAt?: string;
};

export type Department = {
  id: string;
  companyId: string;
  name: DepartmentName;
};

export type User = {
  id: string;
  companyId?: string; // MASTERADMIN pode ser global
  name: string;
  email: string;
  role: Role;
  departmentId?: string;
  active: boolean;
  avatarUrl?: string; // URL (ou data URL) da foto
  contractUrl?: string; // link do contrato assinado (ex.: Clicksign)
  monthlyCostBRL?: number; // custo mensal (salário/encargos) em BRL
  managerId?: string; // id do gestor direto (pode ser HEAD ou ADMIN)
  phone?: string; // celular para contato (E.164 ou texto livre)
  password?: string; // senha inicial (definida pelo admin) / senha atual
  mustChangePassword?: boolean; // exige troca no primeiro acesso
};

export type TrackStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "LOCKED";

export type LearningTrack = {
  id: string;
  companyId: string;
  departmentId: string;
  title: string;
  description: string;
  published: boolean;
  createdByUserId: string;
  createdAt: string;
};

export type ModuleType = "VIDEO" | "QUIZ" | "CHECKPOINT" | "MATERIAL";

export type TrackModule = {
  id: string;
  trackId: string;
  orderIndex: number;
  type: ModuleType;
  title: string;
  description?: string;
  xpReward: number;
  // VIDEO
  youtubeUrl?: string;
  // MATERIAL (link externo: ex.: Figma, ClickUp, Notion)
  materialUrl?: string;
  // QUIZ
  minScore?: number; // 0..100
  // CHECKPOINT
  checkpointPrompt?: string;
};

export type QuizQuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE";

export type QuizQuestion = {
  id: string;
  moduleId: string;
  type: QuizQuestionType;
  prompt: string;
  orderIndex: number;
};

export type QuizOption = {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
};

export type TrackAssignment = {
  id: string;
  trackId: string;
  userId: string;
  status: TrackStatus;
  assignedByUserId: string;
  assignedAt: string;
  dueAt?: string; // prazo para concluir a trilha
  startedAt?: string;
  completedAt?: string;
};

export type ModuleProgressStatus = "LOCKED" | "AVAILABLE" | "COMPLETED";

export type ModuleProgress = {
  id: string;
  assignmentId: string;
  moduleId: string;
  status: ModuleProgressStatus;
  score?: number;
  passed?: boolean;
  attemptsCount: number;
  completedAt?: string;
  checkpointAnswerText?: string;
};

export type Certificate = {
  id: string;
  assignmentId: string;
  certificateCode: string;
  issuedAt: string;
  publicSlug: string;
  snapshotUserName: string;
  snapshotTrackTitle: string;
  snapshotDepartmentName: string;
};

export type RewardTier = {
  id: string;
  companyId: string;
  name: string;
  minXp: number;
  prize: string;
  description?: string;
  active: boolean;
  createdAt: string;
};

export type InvoiceStatus = "PENDING" | "PAID";

export type Invoice = {
  id: string;
  userId: string;
  companyId: string;
  title: string;
  invoiceUrl: string; // link no Conta Azul (ou outra ferramenta)
  amountBRL?: number;
  issuedAt?: string; // ISO
  status: InvoiceStatus;
  paidAt?: string; // ISO
  createdAt: string;
};

export type Db = {
  companies: Company[];
  invites: Invite[];
  departments: Department[];
  users: User[];
  tracks: LearningTrack[];
  modules: TrackModule[];
  quizQuestions: QuizQuestion[];
  quizOptions: QuizOption[];
  assignments: TrackAssignment[];
  moduleProgress: ModuleProgress[];
  certificates: Certificate[];
  rewardTiers: RewardTier[];
  invoices: Invoice[];
};