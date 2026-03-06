import { api } from '@/lib/api';

export interface StudentPreferences {
  frame_id?: string | null;
  stamp_id?: string | null;
  sidebar_theme_id?: string | null;
}

export async function getStudentPreferences(): Promise<StudentPreferences> {
  try {
    const { data } = await api.get<StudentPreferences>('/student/me/preferences');
    return data ?? {};
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) {
      return {};
    }
    throw err;
  }
}

export async function updateStudentPreferences(
  prefs: Partial<StudentPreferences>
): Promise<StudentPreferences> {
  const { data } = await api.put<StudentPreferences>('/student/me/preferences', prefs);
  return data ?? {};
}
