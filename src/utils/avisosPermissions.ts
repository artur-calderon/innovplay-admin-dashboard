import type { AvisosPermissions } from '@/types/avisos';

/**
 * Verifica se o usuário pode criar avisos baseado em sua role
 */
export const canCreateAvisos = (role: string): boolean => {
  const allowedRoles = ['admin', 'tecadm', 'diretor'];
  return allowedRoles.includes(role);
};

/**
 * Apenas admin escolhe o município alvo explicitamente no formulário de aviso.
 */
export const canSelectMunicipality = (role: string): boolean => {
  return role === 'admin';
};

/**
 * Admin ou Tec adm podem endereçar aviso a uma escola específica.
 */
export const canSelectSchool = (role: string): boolean => {
  return role === 'admin' || role === 'tecadm';
};

/**
 * Escopo de visualização (nunca global no produto atual).
 */
export const getAvisosScope = (role: string): 'municipio' | 'escola' => {
  switch (role) {
    case 'admin':
    case 'tecadm':
      return 'municipio';
    case 'diretor':
    case 'coordenador':
    case 'professor':
    case 'aluno':
    default:
      return 'escola';
  }
};

/**
 * Retorna todas as permissões do usuário para o sistema de avisos
 */
export const getAvisosPermissions = (role: string): AvisosPermissions => {
  return {
    canCreate: canCreateAvisos(role),
    canSelectMunicipality: canSelectMunicipality(role),
    canSelectSchool: canSelectSchool(role),
    scope: getAvisosScope(role),
  };
};

/**
 * Retorna o texto descritivo do escopo de envio baseado na role
 */
export const getScopeDescription = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'Envie o aviso para um município inteiro ou para uma escola específica.';
    case 'tecadm':
      return 'Envie o aviso para todo o seu município ou para uma escola do município.';
    case 'diretor':
      return 'Você pode enviar avisos apenas para sua escola.';
    default:
      return 'Você não tem permissão para enviar avisos';
  }
};
