import type { ComponentType } from 'react';
import { FormMultiSelect } from '@/components/ui/form-multi-select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { AudienceMode } from '@/lib/calendarAudience';
import { roleGroupLabel } from '@/lib/calendarAudience';
import type { CalendarRoleGroupId, CalendarTarget, CalendarTargetsResponse } from '@/services/calendarApi';
import {
  AlertCircle,
  Building2,
  Check,
  Globe,
  Info,
  Layers,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ROLE_IDS: CalendarRoleGroupId[] = [
  'admin',
  'tecadm',
  'diretor',
  'coordenador',
  'professor',
  'aluno',
];

export interface EventAudiencePanelProps {
  user: { id?: string; role?: string; name?: string };
  targetsData: CalendarTargetsResponse;
  isLoadingTargets: boolean;
  filteredEscolas: CalendarTarget[];
  /** Turmas para o modo “escola / turma” (município + escolas selecionadas) */
  entityFilteredTurmas: CalendarTarget[];
  /** Séries disponíveis ao filtrar “por perfil” (após escolha de escola, se houver) */
  roleGroupGradeOptions: Array<{ id: string; name: string }>;
  /** Turmas disponíveis ao filtrar “por perfil” */
  roleGroupClassTurmas: CalendarTarget[];
  audienceMode: AudienceMode;
  onAudienceModeChange: (mode: AudienceMode) => void;
  allMunicipality: boolean;
  onAllMunicipalityChange: (v: boolean) => void;
  roleGroupIds: CalendarRoleGroupId[];
  onRoleGroupIdsChange: (ids: CalendarRoleGroupId[]) => void;
  roleGroupSchoolIds: string[];
  onRoleGroupSchoolIdsChange: (ids: string[]) => void;
  roleGroupGradeIds: string[];
  onRoleGroupGradeIdsChange: (ids: string[]) => void;
  roleGroupClassIds: string[];
  onRoleGroupClassIdsChange: (ids: string[]) => void;
  selectedMunicipioIds: string[];
  onSelectedMunicipioIdsChange: (ids: string[]) => void;
  selectedEscolaIds: string[];
  onSelectedEscolaIdsChange: (ids: string[]) => void;
  selectedTurmaIds: string[];
  onSelectedTurmaIdsChange: (ids: string[]) => void;
  summaryLines: string[];
}

function ModeCard({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-all',
        'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        selected &&
          'border-primary/60 bg-primary/5 shadow-sm ring-1 ring-primary/20',
        disabled && 'pointer-events-none opacity-50'
      )}
    >
      {selected && (
        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <span className="font-semibold text-sm leading-tight">{title}</span>
      <span className="text-xs text-muted-foreground leading-snug">{description}</span>
    </button>
  );
}

export function EventAudiencePanel({
  user,
  targetsData,
  isLoadingTargets,
  filteredEscolas,
  entityFilteredTurmas,
  roleGroupGradeOptions,
  roleGroupClassTurmas,
  audienceMode,
  onAudienceModeChange,
  allMunicipality,
  onAllMunicipalityChange,
  roleGroupIds,
  onRoleGroupIdsChange,
  roleGroupSchoolIds,
  onRoleGroupSchoolIdsChange,
  roleGroupGradeIds,
  onRoleGroupGradeIdsChange,
  roleGroupClassIds,
  onRoleGroupClassIdsChange,
  selectedMunicipioIds,
  onSelectedMunicipioIdsChange,
  selectedEscolaIds,
  onSelectedEscolaIdsChange,
  selectedTurmaIds,
  onSelectedTurmaIdsChange,
  summaryLines,
}: EventAudiencePanelProps) {
  const isStudent = user.role === 'aluno';
  const canAllMunicipality = user.role === 'admin' || user.role === 'tecadm';
  const canRoleGroup = !isStudent;
  const showMunicipios = !!(targetsData.municipios?.length && user.role === 'admin');
  const showEscolasMulti = !!(
    targetsData.escolas?.length &&
    (user.role === 'admin' || user.role === 'tecadm')
  );
  const showEscolaProfessor = !!(targetsData.escolas?.length && user.role === 'professor');
  const showTurmas = !!targetsData.turmas?.length;
  const hasAnyTargetSource = !!(
    targetsData.municipios?.length ||
    targetsData.escolas?.length ||
    targetsData.turmas?.length
  );
  const includesAlunoRole = roleGroupIds.includes('aluno');

  if (isStudent) {
    return (
      <div className="space-y-4 rounded-xl border bg-gradient-to-br from-muted/40 via-background to-muted/20 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <UserRound className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Sua agenda pessoal</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Como aluno, o evento será criado apenas para você.
            </p>
          </div>
        </div>
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm leading-relaxed">
            {summaryLines[0] ?? 'Somente você verá este evento na sua agenda.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-xl border bg-gradient-to-br from-muted/30 via-background to-muted/10 p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Quem vai receber?
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Escolha o tipo de público. Você verá um resumo abaixo antes de salvar.
          </p>
        </div>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        role="radiogroup"
        aria-label="Tipo de público do evento"
      >
        <ModeCard
          selected={audienceMode === 'self'}
          onClick={() => onAudienceModeChange('self')}
          icon={UserRound}
          title="Só eu"
          description="Lembrete ou evento visível apenas na sua agenda."
          disabled={!user.id}
        />
        <ModeCard
          selected={audienceMode === 'entities'}
          onClick={() => onAudienceModeChange('entities')}
          icon={Building2}
          title="Por escola / turma"
          description="Município, escolas ou turmas específicas."
        />
        <ModeCard
          selected={audienceMode === 'role_group'}
          onClick={() => canRoleGroup && onAudienceModeChange('role_group')}
          icon={Users}
          title="Por perfil"
          description="Ex.: só professores da escola X."
          disabled={!canRoleGroup}
        />
      </div>

      {isLoadingTargets ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
          <AlertCircle className="h-4 w-4 animate-spin" />
          Carregando opções de destinatário…
        </div>
      ) : (
        <>
          {audienceMode === 'self' && (
            <Alert className="border-primary/20 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription>
                Ninguém mais receberá este evento — ideal para anotações pessoais ou lembretes.
              </AlertDescription>
            </Alert>
          )}

          {audienceMode === 'role_group' && canRoleGroup && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Perfil de destinatário</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ROLE_IDS.map((id) => (
                    <Button
                      key={id}
                      type="button"
                      variant={roleGroupIds.includes(id) ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-auto min-h-[2.75rem] py-2 px-3 justify-center text-center font-medium leading-tight',
                        roleGroupIds.includes(id) && 'shadow-sm'
                      )}
                      onClick={() =>
                        onRoleGroupIdsChange(
                          roleGroupIds.includes(id)
                            ? roleGroupIds.filter((roleId) => roleId !== id)
                            : [...roleGroupIds, id]
                        )
                      }
                    >
                      {roleGroupLabel(id)}
                    </Button>
                  ))}
                </div>
              </div>

              <Card className="border-dashed bg-muted/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    Refinar o público (opcional)
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Escolas refinam todos os perfis escolhidos. Série e turma aparecem apenas quando
                    “Alunos” estiver selecionado. O sistema aplica os filtros em conjunto.
                  </p>
                  <Separator />
                  <div className="space-y-3">
                    {showEscolasMulti && (user.role === 'admin' || user.role === 'tecadm') && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Escolas</Label>
                        <FormMultiSelect
                          options={filteredEscolas.map((e) => ({
                            id: e.id,
                            name: e.municipio_nome ? `${e.nome} (${e.municipio_nome})` : e.nome,
                          }))}
                          selected={roleGroupSchoolIds}
                          onChange={onRoleGroupSchoolIdsChange}
                          placeholder="Todas as escolas (do seu acesso)"
                        />
                      </div>
                    )}
                    {showEscolaProfessor && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Escola</Label>
                        <Select
                          value={roleGroupSchoolIds[0] || ''}
                          onValueChange={(v) => onRoleGroupSchoolIdsChange(v ? [v] : [])}
                          disabled={filteredEscolas.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Escola para filtrar" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredEscolas.map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {(user.role === 'diretor' || user.role === 'coordenador') &&
                      targetsData.escolas &&
                      targetsData.escolas.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground">Escola</Label>
                          <FormMultiSelect
                            options={targetsData.escolas.map((e) => ({
                              id: e.id,
                              name: e.nome,
                            }))}
                            selected={roleGroupSchoolIds}
                            onChange={onRoleGroupSchoolIdsChange}
                            placeholder="Escola(s) da sua gestão"
                          />
                        </div>
                      )}
                    {includesAlunoRole && roleGroupGradeOptions.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Séries</Label>
                        <FormMultiSelect
                          options={roleGroupGradeOptions.map((g) => ({ id: g.id, name: g.name }))}
                          selected={roleGroupGradeIds}
                          onChange={onRoleGroupGradeIdsChange}
                          placeholder="Qualquer série"
                        />
                      </div>
                    )}
                    {includesAlunoRole && roleGroupClassTurmas.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Turmas</Label>
                        <FormMultiSelect
                          options={roleGroupClassTurmas.map((t) => ({
                            id: t.id,
                            name: `${t.nome}${t.serie_nome ? ` — ${t.serie_nome}` : ''}${t.escola_nome ? ` (${t.escola_nome})` : ''}`,
                          }))}
                          selected={roleGroupClassIds}
                          onChange={onRoleGroupClassIdsChange}
                          placeholder="Qualquer turma"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {audienceMode === 'entities' && (
            <div className="space-y-4">
              {canAllMunicipality && (
                <Card
                  className={cn(
                    'cursor-pointer transition-all',
                    allMunicipality && 'ring-2 ring-primary/30 border-primary/40 bg-primary/5'
                  )}
                  onClick={() => onAllMunicipalityChange(!allMunicipality)}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">Todo o município</div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Envia para todas as escolas e públicos permitidos na rede municipal (equivalente ao
                        destino “ALL”).
                      </p>
                    </div>
                    <div
                      className={cn(
                        'mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0',
                        allMunicipality ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                      )}
                    >
                      {allMunicipality && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                  </CardContent>
                </Card>
              )}

              {!allMunicipality && (
                <>
                  {!hasAnyTargetSource && (
                    <Alert variant="destructive" className="border-destructive/50">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Nenhuma opção de destinatário disponível para o seu usuário.
                      </AlertDescription>
                    </Alert>
                  )}

                  {showMunicipios && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Municípios</Label>
                      <FormMultiSelect
                        options={targetsData.municipios!.map((m) => ({ id: m.id, name: m.nome }))}
                        selected={selectedMunicipioIds}
                        onChange={(values) => {
                          onSelectedMunicipioIdsChange(values);
                          onSelectedEscolaIdsChange([]);
                          onSelectedTurmaIdsChange([]);
                        }}
                        placeholder="Selecione município(s)"
                      />
                    </div>
                  )}

                  {showEscolasMulti && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Escolas</Label>
                      <FormMultiSelect
                        options={filteredEscolas.map((e) => ({
                          id: e.id,
                          name: e.municipio_nome ? `${e.nome} (${e.municipio_nome})` : e.nome,
                        }))}
                        selected={selectedEscolaIds}
                        onChange={(values) => {
                          onSelectedEscolaIdsChange(values);
                          onSelectedTurmaIdsChange([]);
                        }}
                        placeholder={
                          filteredEscolas.length
                            ? 'Selecione escola(s)'
                            : 'Nenhuma escola para este recorte'
                        }
                        className={filteredEscolas.length === 0 ? 'opacity-50' : ''}
                      />
                    </div>
                  )}

                  {showEscolaProfessor && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Escola</Label>
                      <Select
                        value={selectedEscolaIds[0] || ''}
                        onValueChange={(value) => {
                          onSelectedEscolaIdsChange(value ? [value] : []);
                          onSelectedTurmaIdsChange([]);
                        }}
                        disabled={filteredEscolas.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma escola para filtrar turmas" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredEscolas.map((escola) => (
                            <SelectItem key={escola.id} value={escola.id}>
                              {escola.nome}
                              {escola.municipio_nome && ` (${escola.municipio_nome})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {showTurmas && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex flex-wrap items-center gap-2">
                        Turmas
                        {(user.role === 'diretor' || user.role === 'coordenador') && (
                          <span className="text-xs font-normal text-muted-foreground">
                            (vazio = escola inteira)
                          </span>
                        )}
                      </Label>
                      <FormMultiSelect
                        options={entityFilteredTurmas.map((t) => ({
                          id: t.id,
                          name: `${t.nome}${t.serie_nome ? ` — ${t.serie_nome}` : ''}${t.escola_nome ? ` (${t.escola_nome})` : ''}`,
                        }))}
                        selected={selectedTurmaIds}
                        onChange={onSelectedTurmaIdsChange}
                        placeholder={
                          entityFilteredTurmas.length === 0
                            ? user.role === 'professor' && selectedEscolaIds.length === 0
                              ? 'Selecione uma escola primeiro'
                              : 'Nenhuma turma disponível'
                            : selectedTurmaIds.length === 0
                              ? user.role === 'diretor' || user.role === 'coordenador'
                                ? 'Turmas ou deixe vazio para a escola toda'
                                : 'Selecione turma(s)'
                              : `${selectedTurmaIds.length} selecionada(s)`
                        }
                        className={entityFilteredTurmas.length === 0 ? 'opacity-50' : ''}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary/80">
              Resumo do envio
            </div>
            <ul className="text-sm text-foreground space-y-1.5 list-disc list-inside marker:text-primary">
              {summaryLines.map((line, i) => (
                <li key={i} className="leading-relaxed">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}