// Tipos para os dashboards por role

// ===== DASHBOARD ADMIN E TECADM =====

export interface DashboardKPI {
  id: string;
  label: string;
  value: number;
  trend?: {
    current: number;
    previous: number;
  };
}

export interface SecondaryCard {
  id: string;
  label: string;
  value: number | null;
  status?: "in_implementation";
}

export interface SchoolRanking {
  position: number;
  school_id: string;
  school_name: string;
  municipality: string;
  average_score: number;
  completion_rate: number;
  total_students: number;
  total_evaluations: number;
}

export interface StudentRanking {
  student_id: string;
  name: string;
  school_name: string;
  class_name: string;
  average_score: number;
  completed_evaluations: number;
}

export interface TeacherRanking {
  teacher_id: string;
  teacher_name: string;
  average_score: number;
  total_evaluations: number;
  classes_count: number;
}

export interface RecentEvaluation {
  evaluation_id: string;
  title: string;
  subject: string;
  school: string;
  status: "completed" | "in_progress" | "pending" | "expired";
  progress_percentage: number;
  total_students: number;
  completed_students: number;
  average_score: number;
  start_date: string;
  end_date: string;
}

export interface RecentStudent {
  student_id: string;
  name: string;
  email: string;
  registration: string;
  school: string;
  class: string;
  created_at: string;
}

export interface ActiveUsers {
  today: number;
  this_week: number;
  this_month: number;
  growth_percentage: number;
}

export interface SessionTime {
  average_minutes: number;
  total_minutes: number;
  growth_percentage: number;
}

export interface PopularEvaluation {
  evaluation_id: string;
  title: string;
  views: number;
  completions: number;
}

export interface ReturnRate {
  percentage: number;
  total_users: number;
  returning_users: number;
  growth_percentage: number;
}

export interface Engagement {
  active_users: ActiveUsers;
  session_time: SessionTime;
  popular_evaluations: PopularEvaluation[];
  return_rate: ReturnRate;
}

export interface AdminDashboardSummary {
  students: number;
  schools: number;
  evaluations: number;
  games: number;
  users: number;
  questions: number;
  classes: number;
  teachers: number;
  last_sync: string;
}

export interface AdminDashboard {
  summary: AdminDashboardSummary;
  kpis: DashboardKPI[];
  secondary_cards: SecondaryCard[];
  rankings: {
    schools: SchoolRanking[];
    students: StudentRanking[];
    teacher_rankings: TeacherRanking[];
  };
  recent_evaluations: RecentEvaluation[];
  recent_students: RecentStudent[];
  engagement: Engagement;
}

// ===== DASHBOARD DIRETOR/COORDENADOR =====

export interface DiretorDashboardSummary {
  students: number;
  classes: number;
  evaluations: number;
  teachers: number;
  last_sync: string;
}

export interface ClassRanking {
  class_id: string;
  class_name: string;
  average_score: number;
  completion_rate: number;
  active_students: number;
}

export interface TeacherRankingDiretor {
  teacher_id: string;
  teacher_name: string;
  average_score: number;
  total_evaluations: number;
  classes_count: number;
}

export interface RecentEvaluationDiretor {
  evaluation_id: string;
  title: string;
  class_name: string;
  status: "completed" | "in_progress" | "pending" | "expired";
  progress_percentage: number;
  average_score: number;
  start_date: string;
  end_date: string;
}

export interface NewStudent {
  student_id: string;
  name: string;
  class: string;
  created_at: string;
}

export interface InactiveStudent {
  student_id: string;
  name: string;
  last_login: string;
}

export interface StudentsOverview {
  new_students: NewStudent[];
  inactive_students: InactiveStudent[];
}

export interface Notification {
  id: string;
  type: "warning" | "info" | "success" | "error";
  title: string;
  message: string;
  created_at: string;
  is_read?: boolean;
  priority: "high" | "medium" | "low";
  category?: string;
  action_url?: string;
  action_text?: string;
}

export interface DiretorDashboard {
  summary: DiretorDashboardSummary;
  kpis: DashboardKPI[];
  class_ranking: ClassRanking[];
  teacher_ranking: TeacherRankingDiretor[];
  recent_evaluations: RecentEvaluationDiretor[];
  students_overview: StudentsOverview;
  notifications: Notification[];
}

// ===== DASHBOARD PROFESSOR =====

export interface ProfessorDashboardSummary {
  students: number;
  classes: number;
  evaluations: number;
  active_students: number;
  last_sync: string;
}

export interface ProfessorKPI {
  id: string;
  label: string;
  value: number;
  active_this_week?: number;
  created_this_month?: number;
  pending_corrections?: number;
  trend_percentage?: number;
}

export interface ProfessorClass {
  class_id: string;
  class_name: string;
  students: number;
  active_students: number;
  average_score: number;
  pending_evaluations: number;
}

export interface ProfessorEvaluation {
  evaluation_id: string;
  title: string;
  class_name: string;
  status: "draft" | "active" | "completed" | "pending";
  total_questions: number;
  total_students: number;
  completed_students: number;
  created_at: string;
  due_date: string;
  average_score: number;
}

export interface ProfessorDashboard {
  summary: ProfessorDashboardSummary;
  kpis: ProfessorKPI[];
  classes: ProfessorClass[];
  evaluations: ProfessorEvaluation[];
  notifications: Notification[];
}

