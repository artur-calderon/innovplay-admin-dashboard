/**
 * Tipos para o endpoint GET /lista-frequencia/
 */

export type Legenda = Record<string, string>;

export interface Cabecalho {
  nome_prova_ano: string;
  lista_presenca_curso: string;
  municipio_uf: string;
  rede: string | null;
  nome_escola: string;
  /** Série: Grade.name da turma (ex.: "6º ano") */
  serie?: string;
  /** Turma: atributo turma da Class ou última parte do nome (ex.: "A" em "6° ANO A") */
  turma?: string;
  /** Nome completo da turma (ex.: "6° ANO A"); mantido para compatibilidade */
  serie_turma?: string;
  turno: string | null;
  disciplina: string;
  legenda: Legenda;
  instrucoes_aplicador: string;
}

export interface Estudante {
  numero: number;
  nome_estudante: string;
  status: string | null;
}

export interface ListaFrequenciaResponse {
  cabecalho: Cabecalho;
  estudantes: Estudante[];
}

export type TipoListaFrequencia = 'avaliacao' | 'prova_fisica' | 'frequencia_diaria';
