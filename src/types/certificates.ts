export interface CertificateTemplate {
  id?: string;
  evaluation_id: string;
  title?: string;
  text_content: string;
  background_color: string;
  text_color: string;
  accent_color: string;
  logo_url?: string;
  signature_url?: string;
  custom_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Certificate {
  id: string;
  student_id: string;
  student_name: string;
  evaluation_id: string;
  evaluation_title: string;
  grade: number;
  template: CertificateTemplate;
  issued_at: string;
  status: 'pending' | 'approved';
  created_at?: string;
}

export interface ApprovedStudent {
  id: string;
  name: string;
  grade: number;
  class_name?: string;
  certificate_id?: string;
  certificate_status?: 'pending' | 'approved';
}

export interface EvaluationWithCertificates {
  id: string;
  title: string;
  subject: string;
  applied_at: string;
  approved_students_count: number;
  total_students_count: number;
  certificate_status: 'none' | 'pending' | 'approved';
}

export interface CertificateApprovalRequest {
  evaluation_id: string;
  student_ids: string[];
  template: CertificateTemplate;
}

