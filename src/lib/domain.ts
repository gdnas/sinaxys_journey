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
  jobTitle?: string; // cargo
  contractUrl?: string; // link do contrato assinado (ex.: Clicksign)
  monthlyCostBRL?: number; // custo mensal (salário/encargos) em BRL
  managerId?: string; // id do gestor direto (pode ser HEAD ou ADMIN)
  phone?: string; // celular para contato (E.164 ou texto livre)
  password?: string; // senha inicial (definida pelo admin) / senha atual
  mustChangePassword?: boolean; // exige troca no primeiro acesso
  joinedAt?: string; // data de entrada na empresa (ISO)
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

export type PointsRuleCategory = "Trilhas" | "Contribuição" | "Aprimoramento" | "Tempo de casa" | "Reconhecimento";

export type PointsRuleKey =
  | "VIDEO_ASSISTIDO"
  | "CHECKPOINT_ENTREGUE"
  | "QUIZ_APROVADO"
  | "MATERIAL_CONSUMIDO"
  | "CURSO_APRIMORAMENTO"
  | "GRAVACAO_AULA"
  | "SUBIR_VIDEO"
  | "TEMPO_6M"
  | "TEMPO_12M"
  | "BONUS_ADMIN";

export type PointsRule = {
  id: string;
  companyId: string;
  key: PointsRuleKey;
  category: PointsRuleCategory;
  label: string;
  points: number;
  description?: string;
  active: boolean;
  createdAt: string;
};

export type PointsEvent = {
  id: string;
  companyId: string;
  userId: string;
  ruleKey: PointsRuleKey;
  points: number;
  note?: string;
  createdAt: string;
  createdByUserId?: string;
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

export type NotificationType =
  | "TRACK_ASSIGNED"
  | "VACATION_REQUEST"
  | "VACATION_DECISION"
  | "INVOICE_SUBMITTED";

export type Notification = {
  id: string;
  companyId?: string;
  userId: string; // destinatário
  type: NotificationType;
  title: string;
  message?: string;
  href?: string;
  readAt?: string;
  createdAt: string;
};

export type ContractAttachmentKind = "FILE" | "LINK";

export type ContractAttachment = {
  id: string;
  companyId: string;
  userId: string;
  title: string;
  /**
   * Tipo do anexo.
   * - FILE: PDF/imagem (data URL)
   * - LINK: URL externo (ex.: Clicksign)
   */
  kind?: ContractAttachmentKind;
  /**
   * URL do recurso. Para retrocompatibilidade, alguns registros antigos podem ter apenas fileDataUrl.
   */
  url?: string;
  /** @deprecated Use `url` + `kind`. Mantido para retrocompatibilidade. */
  fileDataUrl?: string; // PDF/image data URL
  createdAt: string;
};

export type CompensationEvent = {
  id: string;
  companyId: string;
  userId: string;
  monthlyCostBRL: number;
  effectiveAt: string; // ISO
  createdAt: string;
  createdByUserId?: string;
  note?: string;
};

export type VacationRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type VacationRequest = {
  id: string;
  companyId: string;
  userId: string;
  startDate: string; // ISO date (00:00)
  days: number; // we use 10-day periods
  status: VacationRequestStatus;
  createdAt: string;
  decidedAt?: string;
  decidedByUserId?: string;
  decisionNote?: string; // justificativa da decisão (aprovação/recusa)
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
  pointsRules: PointsRule[];
  pointsEvents: PointsEvent[];
  invoices: Invoice[];
  notifications: Notification[];
  contractAttachments: ContractAttachment[];
  compensationEvents: CompensationEvent[];
  vacationRequests: VacationRequest[];
};