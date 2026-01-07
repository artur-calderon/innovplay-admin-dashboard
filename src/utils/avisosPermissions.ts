import type { AvisosPermissions } from '@/types/avisos';

/**
 * Verifica se o usuário pode criar avisos baseado em sua role
 */
export const canCreateAvisos = (role: string): boolean => {
  const allowedRoles = ['admin', 'tecadm', 'diretor'];
  return allowedRoles.includes(role);
};

/**
 * Verifica se o usuário pode enviar avisos para todos
 */
export const canSendToAll = (role: string): boolean => {
  return role === 'admin';
};

/**
 * Verifica se o usuário pode selecionar município
 */
export const canSelectMunicipality = (role: string): boolean => {
  return role === 'admin';
};

/**
 * Verifica se o usuário pode selecionar escola
 */
export const canSelectSchool = (role: string): boolean => {
  const allowedRoles = ['admin', 'tecadm'];
  return allowedRoles.includes(role);
};

/**
 * Retorna o escopo de visualização de avisos do usuário
 */
export const getAvisosScope = (role: string): 'todos' | 'municipio' | 'escola' => {
  switch (role) {
    case 'admin':
      return 'todos';
    case 'tecadm':
      return 'municipio';
    case 'diretor':
    case 'coordenador':
    case 'professor':
    case 'aluno':
      return 'escola';
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
    canSendToAll: canSendToAll(role),
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
      return 'Você pode enviar avisos para todos, municípios específicos ou escolas específicas';
    case 'tecadm':
      return 'Você pode enviar avisos para todo o município ou escolas específicas do município';
    case 'diretor':
      return 'Você pode enviar avisos apenas para sua escola';
    default:
      return 'Você não tem permissão para enviar avisos';
  }
};

