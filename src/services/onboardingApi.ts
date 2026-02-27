import { api } from "@/lib/api";

export interface OnboardingProfile {
  name?: string;
  birth_date?: string;
  phone?: string;
  gender?: string;
  nationality?: string;
  address?: string;
  traits?: string[];
  avatar_config?: {
    theme?: "light" | "dark" | "system";
    font?: string;
    icon?: string | number;
    [key: string]: unknown;
  };
}

export interface OnboardingStatusResponse {
  needs_onboarding: boolean;
  profile?: OnboardingProfile;
}

export interface OnboardingSubmitBody {
  name?: string;
  birth_date?: string;
  phone?: string;
  gender?: string;
  nationality?: string;
  address?: string;
  traits?: string[];
  theme?: "light" | "dark" | "system";
  font?: string;
  icon?: string | number;
}

export interface OnboardingSubmitResponse {
  message: string;
  user: Record<string, unknown>;
}

/** GET /users/me/onboarding-status - saber se deve mostrar o modal e obter profile para pré-preenchimento */
export async function getOnboardingStatus(): Promise<OnboardingStatusResponse> {
  const { data } = await api.get<OnboardingStatusResponse>("/users/me/onboarding-status");
  return data;
}

/** POST /users/me/onboarding - enviar configuração; backend marca onboarding_completed em avatar_config */
export async function submitOnboarding(
  body: OnboardingSubmitBody
): Promise<OnboardingSubmitResponse> {
  const { data } = await api.post<OnboardingSubmitResponse>("/users/me/onboarding", body);
  return data;
}
