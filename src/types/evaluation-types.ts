// Interfaces para o sistema de provas/avaliações

export interface TestSession {
    session_id: string;
    status: 'em_andamento' | 'finalizada' | 'expirada';
    started_at: string;
    actual_start_time?: string; // ✅ NOVO: campo para cronômetro real
    created_at?: string; // ✅ NOVO: campo para data de criação
    remaining_time_minutes: number;
    time_limit_minutes?: number; // ✅ NOVO: tempo limite da sessão
    is_expired: boolean;
    total_questions: number;
    correct_answers: number;
    score: number;
    grade: string | null;
}

export interface Question {
    id: string;
    number: number;
    type: "multiple_choice" | "true_false" | "essay" | "multiple_answer" | "multipleChoice" | "truefalse" | "open" | "dissertativa";
    text: string;
    formattedText?: string;
    imageUrl?: string;
    images?: (string | { url?: string; src?: string; name?: string })[];
    secondstatement?: string;
    secondStatement?: string;
    subject?: { id: string; name: string };
    options?: {
        id: string;
        text: string;
    }[];
    alternatives?: {
        id?: string;
        text: string;
        isCorrect?: boolean;
    }[];
    points: number;
    difficulty: "easy" | "medium" | "hard";
}

export interface TestData {
    id: string;
    title: string;
    subject: { id: string; name: string };
    duration: number;
    totalQuestions?: number; // ✅ CORRIGIDO: Tornar opcional
    total_questions?: number; // ✅ NOVO: Campo alternativo do backend
    instructions: string;
    questions: Question[];
}

export interface StudentAnswer {
    question_id: string;
    answer: string;
    // Para questões dissertativas, o answer será um JSON string com o formato:
    // [{"text": "Resposta do aluno", "student_answer": true, "score": null}]
}

export interface TestResults {
    total_questions: number;
    correct_answers: number;
    score_percentage: number;
    grade: string;
    answers_saved: number;
}

export type EvaluationState = 'loading' | 'instructions' | 'active' | 'completed' | 'expired' | 'error';

// Interfaces para as APIs
export interface StartSessionRequest {
    test_id: string;
    time_limit_minutes: number;
}

export interface StartSessionResponse {
    message: string;
    session_id: string;
    started_at: string;
    actual_start_time?: string;
    time_limit_minutes: number;
    remaining_time_minutes: number;
}

export interface SessionStatusResponse {
    session_id: string;
    status: 'em_andamento' | 'finalizada' | 'expirada';
    started_at: string;
    actual_start_time?: string; // ✅ NOVO: campo para cronômetro real
    remaining_time_minutes: number;
    is_expired: boolean;
    total_questions: number;
    correct_answers: number;
    score: number;
    grade: string | null;
}

export interface SavePartialRequest {
    session_id: string;
    answers: {
        question_id: string;
        answer: string;
    }[];
}

export interface SubmitTestRequest {
    session_id: string;
    answers: {
        question_id: string;
        answer: string;
    }[];
}

export interface SubmitTestResponse {
    message: string;
    session_id: string;
    submitted_at: string;
    duration_minutes: number;
    results: TestResults;
} 