import { api } from '@/lib/api';

export interface StudentPreferences {
  frame_id?: string | null;
  stamp_id?: string | null;
  sidebar_theme_id?: string | null;
}

// Backend retorna preferências junto com user-settings no mesmo objeto settings
interface UserSettingsWithPreferences {
  settings?: {
    theme?: string;
    fontFamily?: string;
    fontSize?: string;
    frame_id?: string | null;
    stamp_id?: string | null;
    sidebar_theme_id?: string | null;
  };
}

function pickStudentPreferences(settings: UserSettingsWithPreferences['settings']): StudentPreferences {
  if (!settings) return {};
  return {
    frame_id: settings.frame_id ?? null,
    stamp_id: settings.stamp_id ?? null,
    sidebar_theme_id: settings.sidebar_theme_id ?? null,
  };
}

export async function getStudentPreferences(userId: string): Promise<StudentPreferences> {
  try {
    const { data } = await api.get<UserSettingsWithPreferences>(`/users/user-settings/${userId}`);
    return pickStudentPreferences(data?.settings) ?? {};
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) {
      return {};
    }
    throw err;
  }
}

export async function updateStudentPreferences(
  userId: string,
  prefs: Partial<StudentPreferences>
): Promise<StudentPreferences> {
  const { data: current } = await api.get<UserSettingsWithPreferences>(`/users/user-settings/${userId}`);
  const settings = current?.settings ?? {};
  const merged = {
    ...settings,
    ...(prefs.frame_id !== undefined && { frame_id: prefs.frame_id }),
    ...(prefs.stamp_id !== undefined && { stamp_id: prefs.stamp_id }),
    ...(prefs.sidebar_theme_id !== undefined && { sidebar_theme_id: prefs.sidebar_theme_id }),
  };
  await api.post(`/users/user-settings/${userId}`, { settings: merged });
  return pickStudentPreferences(merged);
}
