import { supabase } from "@/integrations/supabase/client";
import type { QuizOption, QuizQuestion, TrackModule } from "@/lib/domain";

export type DbTrack = {
  id: string;
  company_id: string;
  department_id: string;
  title: string;
  description: string;
  published: boolean;
  strategic: boolean;
  onboarding: boolean;
  created_by_user_id: string | null;
  created_at: string;
};

export type DbModule = {
  id: string;
  track_id: string;
  order_index: number;
  type: TrackModule["type"];
  title: string;
  description: string | null;
  xp_reward: number;
  youtube_url: string | null;
  material_url: string | null;
  checkpoint_prompt: string | null;
  min_score: number | null;
  created_at: string;
};

export type DbAssignment = {
  id: string;
  company_id: string;
  track_id: string;
  user_id: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "LOCKED";
  assigned_by_user_id: string | null;
  assigned_at: string;
  started_at: string | null;
  due_at: string | null;
  completed_at: string | null;
};

export type DbModuleProgress = {
  id: string;
  assignment_id: string;
  module_id: string;
  status: "LOCKED" | "AVAILABLE" | "COMPLETED";
  attempts_count: number;
  score: number | null;
  passed: boolean | null;
  checkpoint_answer_text: string | null;
  completed_at: string | null;
  earned_xp: number | null;
};

export type XpLeaderboardRow = {
  user_id: string;
  total_xp: number;
};

export type AssignmentDetail = {
  assignment: DbAssignment;
  track: DbTrack;
  modules: DbModule[];
  progressByModuleId: Record<string, DbModuleProgress>;
};

const NIL = "00000000-0000-0000-0000-000000000000";

export async function getTrack(trackId: string) {
  const { data, error } = await supabase.from("learning_tracks").select("*").eq("id", trackId).maybeSingle();
  if (error) throw error;
  return data as any as DbTrack | null;
}

export async function getModulesByTrack(trackId: string) {
  const { data, error } = await supabase
    .from("track_modules")
    .select("*")
    .eq("track_id", trackId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as any as DbModule[];
}

export async function getTracksByDepartment(departmentId: string) {
  const { data, error } = await supabase
    .from("learning_tracks")
    .select("*")
    .eq("department_id", departmentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any as DbTrack[];
}

export async function getTracksByCompany(companyId: string) {
  const { data, error } = await supabase
    .from("learning_tracks")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any as DbTrack[];
}

export async function createTrack(params: {
  companyId: string;
  departmentId: string;
  title: string;
  description: string;
  createdByUserId: string;
}) {
  const { data, error } = await supabase
    .from("learning_tracks")
    .insert({
      company_id: params.companyId,
      department_id: params.departmentId,
      title: params.title.trim(),
      description: params.description.trim(),
      created_by_user_id: params.createdByUserId,
      published: false,
      strategic: false,
      onboarding: false,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as any as DbTrack;
}

export async function updateTrack(params: { trackId: string; title: string; description: string }) {
  const { data, error } = await supabase
    .from("learning_tracks")
    .update({ title: params.title.trim(), description: params.description.trim() })
    .eq("id", params.trackId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as any as DbTrack | null;
}

export async function setTrackPublished(trackId: string, published: boolean) {
  const { error } = await supabase.from("learning_tracks").update({ published }).eq("id", trackId);
  if (error) throw error;
}

export async function deleteTrack(trackId: string) {
  const { error } = await supabase.from("learning_tracks").delete().eq("id", trackId);
  if (error) throw error;
}

export async function setTrackFlags(trackId: string, data: { strategic?: boolean; onboarding?: boolean }) {
  const patch: any = {};
  if (typeof data.strategic === "boolean") patch.strategic = data.strategic;
  if (typeof data.onboarding === "boolean") patch.onboarding = data.onboarding;
  const { error } = await supabase.from("learning_tracks").update(patch).eq("id", trackId);
  if (error) throw error;
}

export async function setTrackDepartment(trackId: string, departmentId: string) {
  const { error } = await supabase.from("learning_tracks").update({ department_id: departmentId }).eq("id", trackId);
  if (error) throw error;
}

export async function upsertModule(next: TrackModule & { trackId: string }) {
  const payload: any = {
    id: next.id,
    track_id: next.trackId,
    order_index: next.orderIndex,
    type: next.type,
    title: next.title.trim(),
    description: next.description?.trim() || null,
    xp_reward: Math.max(0, Math.floor(Number(next.xpReward) || 0)),
    youtube_url: next.type === "VIDEO" ? next.youtubeUrl?.trim() || null : null,
    material_url: next.type === "MATERIAL" ? next.materialUrl?.trim() || null : null,
    checkpoint_prompt: next.type === "CHECKPOINT" ? next.checkpointPrompt?.trim() || null : null,
    min_score: next.type === "QUIZ" ? Math.max(0, Math.min(100, Math.floor(Number(next.minScore) || 70))) : null,
  };

  const { data, error } = await supabase.from("track_modules").upsert(payload).select("*").single();
  if (error) throw error;
  return data as any as DbModule;
}

export async function deleteModule(moduleId: string) {
  const { error } = await supabase.from("track_modules").delete().eq("id", moduleId);
  if (error) throw error;
}

export async function replaceQuiz(
  moduleId: string,
  payload: {
    questions: Array<{
      type: QuizQuestion["type"];
      prompt: string;
      options: Array<{ text: string; isCorrect: boolean }>;
    }>;
  },
) {
  // Replace by deleting existing (cascade) and inserting new.
  const { data: existing, error: eErr } = await supabase
    .from("quiz_questions")
    .select("id")
    .eq("module_id", moduleId);
  if (eErr) throw eErr;

  const existingIds = (existing ?? []).map((q) => q.id);
  if (existingIds.length) {
    const { error: delErr } = await supabase.from("quiz_questions").delete().in("id", existingIds);
    if (delErr) throw delErr;
  }

  // Insert questions
  const questionsToInsert = payload.questions.map((q, idx) => ({
    module_id: moduleId,
    type: q.type,
    prompt: q.prompt.trim(),
    order_index: idx + 1,
  }));

  const { data: insertedQ, error: insQErr } = await supabase
    .from("quiz_questions")
    .insert(questionsToInsert)
    .select("id, order_index");
  if (insQErr) throw insQErr;

  // Insert options
  const optionsToInsert: any[] = [];
  (insertedQ ?? []).forEach((q, idx) => {
    const spec = payload.questions[idx];
    spec.options.forEach((o) => {
      optionsToInsert.push({
        question_id: q.id,
        text: o.text.trim(),
        is_correct: !!o.isCorrect,
      });
    });
  });

  if (optionsToInsert.length) {
    const { error: insOErr } = await supabase.from("quiz_options").insert(optionsToInsert);
    if (insOErr) throw insOErr;
  }
}

export async function getAssignmentDetail(assignmentId: string): Promise<AssignmentDetail | null> {
  const { data: a, error: aErr } = await supabase
    .from("track_assignments")
    .select("*")
    .eq("id", assignmentId)
    .maybeSingle();
  if (aErr) throw aErr;
  if (!a) return null;

  const { data: t, error: tErr } = await supabase
    .from("learning_tracks")
    .select("*")
    .eq("id", a.track_id)
    .single();
  if (tErr) throw tErr;

  const { data: mods, error: mErr } = await supabase
    .from("track_modules")
    .select("*")
    .eq("track_id", a.track_id)
    .order("order_index", { ascending: true });
  if (mErr) throw mErr;

  const { data: prog, error: pErr } = await supabase
    .from("module_progress")
    .select("*")
    .eq("assignment_id", assignmentId);
  if (pErr) throw pErr;

  const progressByModuleId = Object.fromEntries((prog ?? []).map((p) => [p.module_id, p]));

  return {
    assignment: a as any,
    track: t as any,
    modules: (mods ?? []) as any,
    progressByModuleId,
  };
}

export async function getAssignmentsForUser(userId: string) {
  const { data: asgs, error: aErr } = await supabase
    .from("track_assignments")
    .select("*")
    .eq("user_id", userId)
    .order("assigned_at", { ascending: false });
  if (aErr) throw aErr;

  const trackIds = Array.from(new Set((asgs ?? []).map((a) => a.track_id)));

  const { data: tracks, error: tErr } = await supabase
    .from("learning_tracks")
    .select("*")
    .in("id", trackIds.length ? trackIds : [NIL]);
  if (tErr) throw tErr;
  const trackById = new Map((tracks ?? []).map((t) => [t.id, t] as const));

  const asgIds = (asgs ?? []).map((a) => a.id);
  const { data: progress, error: pErr } = await supabase
    .from("module_progress")
    .select("assignment_id,status")
    .in("assignment_id", asgIds.length ? asgIds : [NIL]);
  if (pErr) throw pErr;

  const stats = new Map<string, { done: number; total: number }>();
  for (const row of progress ?? []) {
    const s = stats.get(row.assignment_id) ?? { done: 0, total: 0 };
    s.total += 1;
    if (row.status === "COMPLETED") s.done += 1;
    stats.set(row.assignment_id, s);
  }

  return (asgs ?? []).map((a) => {
    const t = trackById.get(a.track_id) as any as DbTrack;
    const st = stats.get(a.id) ?? { done: 0, total: 0 };
    const stSafe = (st as any) ?? { done: 0, total: 0 };
    const progressPct = stSafe.total ? Math.round((stSafe.done / stSafe.total) * 100) : 0;
    return {
      assignment: a as any as DbAssignment,
      track: t,
      completedModules: stSafe.done,
      totalModules: stSafe.total,
      progressPct,
    };
  });
}

export async function getLatestAssignmentForUserAndTrack(params: { userId: string; trackId: string }) {
  const { data, error } = await supabase
    .from("track_assignments")
    .select("*")
    .eq("user_id", params.userId)
    .eq("track_id", params.trackId)
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as any as DbAssignment | null;
}

export async function getQuizForModule(moduleId: string): Promise<{
  questions: QuizQuestion[];
  optionsByQuestionId: Record<string, QuizOption[]>;
}> {
  const { data: questions, error: qErr } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("module_id", moduleId)
    .order("order_index", { ascending: true });
  if (qErr) throw qErr;

  const qIds = (questions ?? []).map((q) => q.id);
  const { data: options, error: oErr } = await supabase
    .from("quiz_options")
    .select("*")
    .in("question_id", qIds.length ? qIds : [NIL]);
  if (oErr) throw oErr;

  const optionsByQuestionId: Record<string, QuizOption[]> = {};
  for (const q of questions ?? []) optionsByQuestionId[q.id] = [];
  for (const o of options ?? []) {
    (optionsByQuestionId[o.question_id] ??= []).push({
      id: o.id,
      questionId: o.question_id,
      text: o.text,
      isCorrect: !!o.is_correct,
    });
  }

  const mappedQuestions: QuizQuestion[] = (questions ?? []).map((q: any) => ({
    id: q.id,
    moduleId: q.module_id,
    type: q.type,
    prompt: q.prompt,
    orderIndex: q.order_index,
  }));

  return { questions: mappedQuestions, optionsByQuestionId };
}

export async function completeModule(params: {
  assignmentId: string;
  moduleId: string;
  checkpointAnswer?: string;
  earnedXp?: number;
}) {
  const { error } = await supabase.rpc("complete_module", {
    p_assignment_id: params.assignmentId,
    p_module_id: params.moduleId,
    p_checkpoint_answer: params.checkpointAnswer ?? null,
    p_earned_xp: typeof params.earnedXp === "number" ? params.earnedXp : null,
  });
  if (error) throw error;
}

export async function submitQuizAttempt(params: {
  assignmentId: string;
  moduleId: string;
  score: number;
  passed: boolean;
  earnedXp?: number;
}) {
  const { error } = await supabase.rpc("submit_quiz_attempt", {
    p_assignment_id: params.assignmentId,
    p_module_id: params.moduleId,
    p_score: Math.max(0, Math.min(100, Math.round(params.score))),
    p_passed: params.passed,
    p_earned_xp: typeof params.earnedXp === "number" ? params.earnedXp : null,
  });
  if (error) throw error;
}

export async function assignTrack(params: {
  companyId: string;
  trackId: string;
  userId: string;
  assignedByUserId: string;
  dueAt?: string;
}) {
  const { data, error } = await supabase
    .from("track_assignments")
    .insert({
      company_id: params.companyId,
      track_id: params.trackId,
      user_id: params.userId,
      assigned_by_user_id: params.assignedByUserId,
      due_at: params.dueAt ?? null,
      status: "NOT_STARTED",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as any as DbAssignment;
}

export async function getCertificatesForUser(userId: string) {
  const { data: asgs, error: aErr } = await supabase
    .from("track_assignments")
    .select("id")
    .eq("user_id", userId);
  if (aErr) throw aErr;

  const ids = (asgs ?? []).map((a) => a.id);
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .in("assignment_id", ids.length ? ids : [NIL])
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCertificate(certificateId: string) {
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("id", certificateId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTotalXpForUser(params: { companyId: string; userId: string }) {
  const { data: asgs, error: aErr } = await supabase
    .from("track_assignments")
    .select("id")
    .eq("company_id", params.companyId)
    .eq("user_id", params.userId);
  if (aErr) throw aErr;

  const asgIds = (asgs ?? []).map((a) => a.id);
  if (!asgIds.length) return 0;

  const { data: prog, error: pErr } = await supabase
    .from("module_progress")
    .select("module_id,status,earned_xp,assignment_id")
    .in("assignment_id", asgIds.length ? asgIds : [NIL]);
  if (pErr) throw pErr;

  const completed = (prog ?? []).filter((p: any) => p.status === "COMPLETED");

  let total = 0;
  const missingModuleIds: string[] = [];

  for (const row of completed as any[]) {
    const v = typeof row.earned_xp === "number" ? row.earned_xp : null;
    if (typeof v === "number") total += v;
    else if (row.module_id) missingModuleIds.push(row.module_id);
  }

  if (missingModuleIds.length) {
    const uniq = Array.from(new Set(missingModuleIds));
    const { data: mods, error: mErr } = await supabase.from("track_modules").select("id,xp_reward").in("id", uniq);
    if (mErr) throw mErr;
    const byId = new Map((mods ?? []).map((m: any) => [m.id, m.xp_reward] as const));
    for (const mid of uniq) total += Math.max(0, Number(byId.get(mid) ?? 0) || 0);
  }

  return Math.max(0, Math.floor(total));
}

export async function fetchXpLeaderboard(companyId: string, limit = 200) {
  const { data, error } = await supabase.rpc("xp_leaderboard", { p_company_id: companyId, p_limit: limit });
  if (error) throw error;
  return (data ?? []) as XpLeaderboardRow[];
}