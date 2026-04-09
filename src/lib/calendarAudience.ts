import type { CalendarTargetsResponse } from '@/services/calendarApi';
import type {
  CalendarRoleGroupId,
  CalendarTargetPayload,
  CalendarVisibilityScope,
} from '@/services/calendarApi';

export type AudienceMode = 'self' | 'entities' | 'role_group';

const ROLE_GROUP_LABELS: Record<CalendarRoleGroupId, string> = {
  admin: 'Administradores',
  tecadm: 'Técnicos administrativos',
  diretor: 'Diretores',
  coordenador: 'Coordenadores',
  professor: 'Professores',
  aluno: 'Alunos',
};

export function roleGroupLabel(id: CalendarRoleGroupId): string {
  return ROLE_GROUP_LABELS[id] ?? id;
}

export interface BuildAudienceInput {
  mode: AudienceMode;
  userId?: string;
  userRole?: string;
  /** Admin/tecnm: envia para todo o município via target ALL */
  allMunicipality: boolean;
  roleGroupId: CalendarRoleGroupId | '';
  roleGroupSchoolIds: string[];
  roleGroupGradeIds: string[];
  roleGroupClassIds: string[];
  selectedMunicipioIds: string[];
  selectedEscolaIds: string[];
  selectedTurmaIds: string[];
  targetsData: CalendarTargetsResponse;
}

export function buildEventTargetsFromAudience(
  input: BuildAudienceInput
): {
  visibility_scope: CalendarVisibilityScope;
  targets: CalendarTargetPayload[];
} {
  const {
    mode,
    userId,
    userRole,
    allMunicipality,
    roleGroupId,
    roleGroupSchoolIds,
    roleGroupGradeIds,
    roleGroupClassIds,
    selectedMunicipioIds,
    selectedEscolaIds,
    selectedTurmaIds,
    targetsData,
  } = input;

  if (userRole === 'aluno' && userId) {
    return {
      visibility_scope: 'USERS',
      targets: [{ target_type: 'USER', target_id: userId }],
    };
  }

  if (mode === 'self') {
    if (!userId) {
      throw new Error('Usuário não identificado');
    }
    return {
      visibility_scope: 'USERS',
      targets: [{ target_type: 'USER', target_id: userId }],
    };
  }

  if (mode === 'role_group') {
    if (!roleGroupId) {
      throw new Error('Selecione um perfil de destinatário');
    }
    const filters: { school_ids?: string[]; grade_ids?: string[]; class_ids?: string[] } = {};
    if (roleGroupSchoolIds.length > 0) filters.school_ids = roleGroupSchoolIds;
    if (roleGroupGradeIds.length > 0) filters.grade_ids = roleGroupGradeIds;
    if (roleGroupClassIds.length > 0) filters.class_ids = roleGroupClassIds;

    const hasFilters = Object.keys(filters).length > 0;
    const target: CalendarTargetPayload = hasFilters
      ? { target_type: 'ROLE_GROUP', target_id: roleGroupId, filters }
      : { target_type: 'ROLE_GROUP', target_id: roleGroupId };

    let visibility_scope: CalendarVisibilityScope = 'MUNICIPALITY';
    if (roleGroupClassIds.length > 0) {
      visibility_scope = 'CLASS';
    } else if (roleGroupGradeIds.length > 0) {
      visibility_scope = 'GRADE';
    } else if (roleGroupSchoolIds.length > 0) {
      visibility_scope = 'SCHOOL';
    } else if (userRole === 'admin' || userRole === 'tecadm') {
      visibility_scope = 'MUNICIPALITY';
    } else {
      visibility_scope = 'SCHOOL';
    }

    return { visibility_scope, targets: [target] };
  }

  // mode === 'entities'
  if ((userRole === 'admin' || userRole === 'tecadm') && allMunicipality) {
    return {
      visibility_scope: 'MUNICIPALITY',
      targets: [{ target_type: 'ALL' }],
    };
  }

  if (selectedTurmaIds.length > 0) {
    const turmasSelecionadas =
      targetsData.turmas?.filter((t) => selectedTurmaIds.includes(t.id)) || [];
    if (turmasSelecionadas.length > 0) {
      return {
        visibility_scope: 'CLASS',
        targets: turmasSelecionadas.map((turma) => ({
          target_type: 'CLASS' as const,
          target_id: turma.id,
        })),
      };
    }
  }

  if (selectedEscolaIds.length > 0 && userRole !== 'professor') {
    const escolasSelecionadas =
      targetsData.escolas?.filter((e) => selectedEscolaIds.includes(e.id)) || [];
    if (escolasSelecionadas.length > 0) {
      return {
        visibility_scope: 'SCHOOL',
        targets: escolasSelecionadas.map((escola) => ({
          target_type: 'SCHOOL' as const,
          target_id: escola.id,
        })),
      };
    }
  }

  if (
    (userRole === 'diretor' || userRole === 'coordenador') &&
    selectedTurmaIds.length === 0 &&
    targetsData.turmas &&
    targetsData.turmas.length > 0
  ) {
    const escolaIds = new Set(
      targetsData.turmas.map((t) => t.escola_id).filter((id): id is string => !!id)
    );
    if (escolaIds.size === 1) {
      const escolaId = Array.from(escolaIds)[0];
      return {
        visibility_scope: 'SCHOOL',
        targets: [{ target_type: 'SCHOOL', target_id: escolaId }],
      };
    }
  }

  if (selectedMunicipioIds.length > 0) {
    const municipiosSelecionados =
      targetsData.municipios?.filter((m) => selectedMunicipioIds.includes(m.id)) || [];
    if (municipiosSelecionados.length > 0) {
      return {
        visibility_scope: 'MUNICIPALITY',
        targets: municipiosSelecionados.map((municipio) => ({
          target_type: 'MUNICIPALITY' as const,
          target_id: municipio.id,
        })),
      };
    }
  }

  if (userRole === 'admin' || userRole === 'tecadm') {
    return {
      visibility_scope: 'MUNICIPALITY',
      targets: [{ target_type: 'ALL' }],
    };
  }

  throw new Error('Nenhum destinatário selecionado');
}

export interface AudienceSummaryContext {
  targetsData: CalendarTargetsResponse;
  userName?: string;
  userId?: string;
  /** Texto neutro para telas de detalhe (ex.: “um usuário”), sem assumir que é o visitante */
  neutralSelfWording?: boolean;
}

export function summarizeAudience(
  mode: AudienceMode,
  ctx: AudienceSummaryContext & {
    allMunicipality: boolean;
    roleGroupId: CalendarRoleGroupId | '';
    roleGroupSchoolIds: string[];
    roleGroupGradeIds: string[];
    roleGroupClassIds: string[];
    selectedMunicipioIds: string[];
    selectedEscolaIds: string[];
    selectedTurmaIds: string[];
    userId?: string;
  }
): string[] {
  const lines: string[] = [];
  const { targetsData } = ctx;

  if (mode === 'self') {
    if (ctx.neutralSelfWording) {
      lines.push('Visível apenas para um usuário específico (agenda individual).');
    } else if (ctx.userId) {
      lines.push(
        ctx.userName
          ? `Somente você (${ctx.userName}) verá este evento.`
          : 'Somente você verá este evento na sua agenda.'
      );
    } else {
      lines.push('Visível apenas para um usuário específico.');
    }
    return lines;
  }

  if (mode === 'role_group' && ctx.roleGroupId) {
    const roleLabel = roleGroupLabel(ctx.roleGroupId);
    const parts: string[] = [`Todos com perfil: ${roleLabel}`];
    if (ctx.roleGroupClassIds.length > 0) {
      const names =
        targetsData.turmas
          ?.filter((t) => ctx.roleGroupClassIds.includes(t.id))
          .map((t) => t.nome)
          .join(', ') || `${ctx.roleGroupClassIds.length} turma(s)`;
      parts.push(`nas turmas: ${names}`);
    }
    if (ctx.roleGroupGradeIds.length > 0) {
      const gradeNames = new Map<string, string>();
      targetsData.turmas?.forEach((t) => {
        if (t.serie_id && ctx.roleGroupGradeIds.includes(t.serie_id)) {
          gradeNames.set(t.serie_id, t.serie_nome || t.serie_id);
        }
      });
      parts.push(
        `nas séries: ${ctx.roleGroupGradeIds.map((id) => gradeNames.get(id) || id).join(', ')}`
      );
    }
    if (ctx.roleGroupSchoolIds.length > 0) {
      const names =
        targetsData.escolas
          ?.filter((e) => ctx.roleGroupSchoolIds.includes(e.id))
          .map((e) => e.nome)
          .join(', ') || `${ctx.roleGroupSchoolIds.length} escola(s)`;
      parts.push(`nas escolas: ${names}`);
    }
    if (
      ctx.roleGroupSchoolIds.length === 0 &&
      ctx.roleGroupGradeIds.length === 0 &&
      ctx.roleGroupClassIds.length === 0
    ) {
      parts.push('sem recorte adicional (escopo amplo conforme sua permissão).');
    } else {
      parts.push('(filtros combinados: todos os critérios ao mesmo tempo).');
    }
    lines.push(parts.join(' · '));
    return lines;
  }

  if (ctx.allMunicipality) {
    lines.push('Todo o município (todas as escolas e públicos permitidos).');
    return lines;
  }

  if (ctx.selectedTurmaIds.length > 0) {
    const names =
      targetsData.turmas
        ?.filter((t) => ctx.selectedTurmaIds.includes(t.id))
        .map((t) => `${t.nome}${t.escola_nome ? ` (${t.escola_nome})` : ''}`)
        .join(', ') || `${ctx.selectedTurmaIds.length} turma(s)`;
    lines.push(`Turmas: ${names}`);
  } else if (ctx.selectedEscolaIds.length > 0) {
    const names =
      targetsData.escolas
        ?.filter((e) => ctx.selectedEscolaIds.includes(e.id))
        .map((e) => e.nome)
        .join(', ') || `${ctx.selectedEscolaIds.length} escola(s)`;
    lines.push(`Escolas inteiras: ${names}`);
  } else if (ctx.selectedMunicipioIds.length > 0) {
    const names =
      targetsData.municipios
        ?.filter((m) => ctx.selectedMunicipioIds.includes(m.id))
        .map((m) => m.nome)
        .join(', ') || `${ctx.selectedMunicipioIds.length} município(s)`;
    lines.push(`Municípios: ${names}`);
  } else {
    lines.push('Selecione destinatários ou marque “todo o município” (se disponível).');
  }

  return lines;
}

export function parseTargetsFromEvent(
  targets: any[]
): {
  mode: AudienceMode;
  allMunicipality: boolean;
  roleGroupId: CalendarRoleGroupId | '';
  roleGroupSchoolIds: string[];
  roleGroupGradeIds: string[];
  roleGroupClassIds: string[];
  selectedMunicipioIds: string[];
  selectedEscolaIds: string[];
  selectedTurmaIds: string[];
} {
  const empty = {
    mode: 'entities' as AudienceMode,
    allMunicipality: false,
    roleGroupId: '' as const,
    roleGroupSchoolIds: [] as string[],
    roleGroupGradeIds: [] as string[],
    roleGroupClassIds: [] as string[],
    selectedMunicipioIds: [] as string[],
    selectedEscolaIds: [] as string[],
    selectedTurmaIds: [] as string[],
  };

  if (!targets?.length) return empty;

  const onlyAll = targets.length === 1 && targets[0]?.target_type === 'ALL';
  if (onlyAll) {
    return { ...empty, allMunicipality: true, mode: 'entities' };
  }

  const roleGroups = targets.filter((t) => t?.target_type === 'ROLE_GROUP');
  if (roleGroups.length === 1) {
    const t = roleGroups[0];
    const fid = String(t.target_id || '') as CalendarRoleGroupId;
    const f = t.filters || {};
    return {
      ...empty,
      mode: 'role_group',
      roleGroupId: fid,
      roleGroupSchoolIds: Array.isArray(f.school_ids) ? f.school_ids.map(String) : [],
      roleGroupGradeIds: Array.isArray(f.grade_ids) ? f.grade_ids.map(String) : [],
      roleGroupClassIds: Array.isArray(f.class_ids) ? f.class_ids.map(String) : [],
    };
  }

  const users = targets.filter((t) => t?.target_type === 'USER' && t?.target_id);
  if (users.length === 1) {
    return { ...empty, mode: 'self' };
  }

  return {
    ...empty,
    selectedMunicipioIds: targets
      .filter((t) => t?.target_type === 'MUNICIPALITY' && t?.target_id)
      .map((t) => String(t.target_id)),
    selectedEscolaIds: targets
      .filter((t) => t?.target_type === 'SCHOOL' && t?.target_id)
      .map((t) => String(t.target_id)),
    selectedTurmaIds: targets
      .filter((t) => t?.target_type === 'CLASS' && t?.target_id)
      .map((t) => String(t.target_id)),
    mode: 'entities',
  };
}

/** Resume targets já persistidos no evento (modal de visualização / detalhe). */
export function summarizeStoredTargets(
  targets: unknown[] | undefined,
  targetsData: CalendarTargetsResponse,
  options?: { neutralSelf?: boolean }
): string[] {
  if (!targets || !Array.isArray(targets) || targets.length === 0) {
    return ['Destinatários não informados para este evento.'];
  }
  const parsed = parseTargetsFromEvent(targets as any[]);
  return summarizeAudience(parsed.mode, {
    targetsData,
    neutralSelfWording: options?.neutralSelf ?? true,
    allMunicipality: parsed.allMunicipality,
    roleGroupId: parsed.roleGroupId,
    roleGroupSchoolIds: parsed.roleGroupSchoolIds,
    roleGroupGradeIds: parsed.roleGroupGradeIds,
    roleGroupClassIds: parsed.roleGroupClassIds,
    selectedMunicipioIds: parsed.selectedMunicipioIds,
    selectedEscolaIds: parsed.selectedEscolaIds,
    selectedTurmaIds: parsed.selectedTurmaIds,
  });
}
