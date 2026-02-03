export type Role = "ADMIN" | "HEAD" | "COLABORADOR";

export type DepartmentName =
  | "Financeiro"
  | "Suporte"
  | "Customer Success"
  | "Comercial"
  | "Marketing"
  | "Produto";

export type Department = {
  id: string;
  name: DepartmentName;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId?: string;
  active: boolean;
};

export type TrackStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "LOCKED";

export type LearningTrack = {
  id: string;
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
  // MATERIAL (ex.: apresentação no Figma)
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

export type Db = {
  departments: Department[];
  users: User[];
  tracks: LearningTrack[];
  modules: TrackModule[];
  quizQuestions: QuizQuestion[];
  quizOptions: QuizOption[];
  assignments: TrackAssignment[];
  moduleProgress: ModuleProgress[];
  certificates: Certificate[];
};