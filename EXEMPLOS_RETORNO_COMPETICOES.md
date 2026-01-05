# Exemplos de Retorno - API de Competições

## Base URL
```
/competitions
```

---

## 1. CRUD DE COMPETIÇÕES

### 1.1 POST /competitions - Criar Competição

**Request Body:**
```json
{
  "title": "Olimpíada de Matemática 2025",
  "description": "Competição de matemática para alunos do ensino fundamental",
  "instrucoes": "Leia atentamente cada questão antes de responder",
  "recompensas": {
    "ouro": 100,
    "prata": 50,
    "bronze": 25,
    "participacao": 10
  },
  "modo_selecao": "manual",
  "icone": "trophy",
  "cor": "#FFD700",
  "dificuldade": ["facil", "medio", "dificil"],
  "duration": 60,
  "time_limit": "2025-02-01T08:00:00",
  "end_time": "2025-02-01T18:00:00",
  "max_participantes": 100,
  "subject": "subject-uuid-123",
  "grade_id": "grade-uuid-456",
  "questions": ["question-uuid-1", "question-uuid-2"],
  "classes": ["class-uuid-1", "class-uuid-2"]
}
```

**Response 201 (Sucesso):**
```json
{
  "mensagem": "Competição criada com sucesso",
  "data": {
    "id": "competition-uuid-789",
    "title": "Olimpíada de Matemática 2025"
  }
}
```

**Response 400 (Erro):**
```json
{
  "erro": "Campo obrigatório ausente: title"
}
```

---

### 1.2 GET /competitions - Listar Competições

**Response 200 (Sucesso):**
```json
[
  {
    "id": "competition-uuid-789",
    "title": "Olimpíada de Matemática 2025",
    "description": "Competição de matemática para alunos do ensino fundamental",
    "status": "aberta",
    "participantes_atual": 45,
    "max_participantes": 100,
    "time_limit": "2025-02-01T08:00:00",
    "end_time": "2025-02-01T18:00:00",
    "recompensas": {
      "ouro": 100,
      "prata": 50,
      "bronze": 25,
      "participacao": 10
    },
    "icone": "trophy",
    "cor": "#FFD700"
  },
  {
    "id": "competition-uuid-790",
    "title": "Desafio de Português",
    "description": "Competição de língua portuguesa",
    "status": "em_andamento",
    "participantes_atual": 80,
    "max_participantes": 100,
    "time_limit": "2025-01-15T08:00:00",
    "end_time": "2025-01-15T20:00:00",
    "recompensas": {
      "ouro": 150,
      "prata": 75,
      "bronze": 30,
      "participacao": 15
    },
    "icone": "book",
    "cor": "#4169E1"
  }
]
```

---

### 1.3 GET /competitions/<competition_id> - Obter Competição

**Response 200 (Sucesso):**
```json
{
  "id": "competition-uuid-789",
  "title": "Olimpíada de Matemática 2025",
  "description": "Competição de matemática para alunos do ensino fundamental",
  "instrucoes": "Leia atentamente cada questão antes de responder",
  "status": "aberta",
  "recompensas": {
    "ouro": 100,
    "prata": 50,
    "bronze": 25,
    "participacao": 10
  },
  "modo_selecao": "manual",
  "icone": "trophy",
  "cor": "#FFD700",
  "dificuldade": ["facil", "medio", "dificil"],
  "participantes_atual": 45,
  "max_participantes": 100,
  "time_limit": "2025-02-01T08:00:00",
  "end_time": "2025-02-01T18:00:00",
  "duration": 60,
  "questions": [
    {
      "id": "question-uuid-1",
      "number": 1,
      "text": "Qual é o resultado de 2 + 2?"
    },
    {
      "id": "question-uuid-2",
      "number": 2,
      "text": "Calcule a área de um quadrado de lado 5cm"
    }
  ]
}
```

**Response 404 (Erro):**
```json
{
  "erro": "Competição não encontrada"
}
```

---

### 1.4 PUT /competitions/<competition_id> - Atualizar Competição

**Request Body:**
```json
{
  "title": "Olimpíada de Matemática 2025 - Atualizada",
  "status": "em_andamento",
  "recompensas": {
    "ouro": 150,
    "prata": 75,
    "bronze": 30,
    "participacao": 15
  }
}
```

**Response 200 (Sucesso):**
```json
{
  "mensagem": "Competição atualizada com sucesso",
  "data": {
    "id": "competition-uuid-789"
  }
}
```

---

### 1.5 DELETE /competitions/<competition_id> - Excluir Competição

**Response 200 (Sucesso):**
```json
{
  "mensagem": "Competição excluída com sucesso"
}
```

---

## 2. INSCRIÇÃO

### 2.1 GET /competitions/available - Listar Competições Disponíveis

**Response 200 (Sucesso):**
```json
[
  {
    "id": "competition-uuid-789",
    "title": "Olimpíada de Matemática 2025",
    "description": "Competição de matemática para alunos do ensino fundamental",
    "status": "aberta",
    "participantes_atual": 45,
    "max_participantes": 100,
    "time_limit": "2025-02-01T08:00:00",
    "end_time": "2025-02-01T18:00:00",
    "recompensas": {
      "ouro": 100,
      "prata": 50,
      "bronze": 25,
      "participacao": 10
    },
    "inscrito": true,
    "enrollment_status": "inscrito"
  },
  {
    "id": "competition-uuid-790",
    "title": "Desafio de Português",
    "description": "Competição de língua portuguesa",
    "status": "aberta",
    "participantes_atual": 80,
    "max_participantes": 100,
    "time_limit": "2025-01-15T08:00:00",
    "end_time": "2025-01-15T20:00:00",
    "recompensas": {
      "ouro": 150,
      "prata": 75,
      "bronze": 30,
      "participacao": 15
    },
    "inscrito": false,
    "enrollment_status": null
  }
]
```

---

### 2.2 POST /competitions/<competition_id>/enroll - Inscrever em Competição

**Response 201 (Sucesso - Nova Inscrição):**
```json
{
  "mensagem": "Inscrição realizada com sucesso",
  "data": {
    "enrollment_id": "enrollment-uuid-123"
  }
}
```

**Response 200 (Já Inscrito):**
```json
{
  "mensagem": "Aluno já está inscrito",
  "data": {
    "enrollment_id": "enrollment-uuid-123"
  }
}
```

**Response 400 (Erro):**
```json
{
  "erro": "Competição não está aberta para inscrições"
}
```

ou

```json
{
  "erro": "Competição atingiu o limite de participantes"
}
```

**Response 403 (Erro):**
```json
{
  "erro": "Você não pertence a uma turma elegível para esta competição"
}
```

---

### 2.3 GET /competitions/<competition_id>/enrollment-status - Status de Inscrição

**Response 200 (Inscrito):**
```json
{
  "inscrito": true,
  "status": "inscrito",
  "enrolled_at": "2025-01-20T10:30:00"
}
```

**Response 200 (Não Inscrito):**
```json
{
  "inscrito": false,
  "status": null
}
```

---

## 3. EXECUÇÃO

### 3.1 GET /competitions/<competition_id>/can-start - Verificar se Pode Iniciar

**Response 200 (Pode Iniciar):**
```json
{
  "pode_iniciar": true
}
```

**Response 200 (Não Pode Iniciar):**
```json
{
  "pode_iniciar": false,
  "motivo": "Aluno não está inscrito na competição"
}
```

ou

```json
{
  "pode_iniciar": false,
  "motivo": "Competição já foi finalizada"
}
```

ou

```json
{
  "pode_iniciar": false,
  "motivo": "Competição ainda não iniciou"
}
```

ou

```json
{
  "pode_iniciar": false,
  "motivo": "Competição já expirou"
}
```

---

### 3.2 POST /competitions/<competition_id>/start - Iniciar Competição

**Response 201 (Sucesso):**
```json
{
  "mensagem": "Competição iniciada com sucesso",
  "data": {
    "session_id": "session-uuid-456",
    "started_at": "2025-02-01T10:15:30",
    "time_limit_minutes": 60,
    "questions": [
      {
        "id": "question-uuid-1",
        "number": 1,
        "text": "Qual é o resultado de 2 + 2?",
        "formatted_text": "<p>Qual é o resultado de <strong>2 + 2</strong>?</p>",
        "alternatives": [
          {"id": "A", "text": "3"},
          {"id": "B", "text": "4"},
          {"id": "C", "text": "5"},
          {"id": "D", "text": "6"}
        ],
        "question_type": "multiple_choice",
        "images": []
      },
      {
        "id": "question-uuid-2",
        "number": 2,
        "text": "Calcule a área de um quadrado de lado 5cm",
        "formatted_text": "<p>Calcule a área de um quadrado de lado <strong>5cm</strong></p>",
        "alternatives": null,
        "question_type": "essay",
        "images": [
          {
            "id": "image-uuid-1",
            "name": "quadrado.png",
            "type": "image/png",
            "size": 12345,
            "url": "https://example.com/images/quadrado.png"
          }
        ]
      }
    ]
  }
}
```

**Response 200 (Sessão Já Iniciada):**
```json
{
  "mensagem": "Sessão já iniciada",
  "data": {
    "session_id": "session-uuid-456",
    "started_at": "2025-02-01T10:15:30"
  }
}
```

---

### 3.3 POST /competitions/submit - Submeter Competição

**Request Body:**
```json
{
  "session_id": "session-uuid-456",
  "answers": [
    {
      "question_id": "question-uuid-1",
      "answer": "B"
    },
    {
      "question_id": "question-uuid-2",
      "answer": "25cm²"
    }
  ]
}
```

**Response 200 (Sucesso):**
```json
{
  "mensagem": "Competição submetida com sucesso",
  "data": {
    "result_id": "result-uuid-789",
    "grade": 8.5,
    "proficiency": 350.0,
    "classification": "Avançado",
    "correct_answers": 17,
    "total_questions": 20
  }
}
```

**Response 400 (Erro):**
```json
{
  "erro": "session_id é obrigatório"
}
```

---

## 4. RESULTADOS

### 4.1 GET /competitions/<competition_id>/results - Resultados Completos

**Response 200 (Sucesso):**
```json
{
  "disciplinas": [
    {
      "id": "subject-uuid-math",
      "nome": "Matemática",
      "questoes": [
        {
          "numero": 1,
          "habilidade": "Operações com números naturais",
          "codigo_habilidade": "EF01MA05",
          "question_id": "question-uuid-1"
        },
        {
          "numero": 2,
          "habilidade": "Geometria plana",
          "codigo_habilidade": "EF04MA18",
          "question_id": "question-uuid-2"
        }
      ],
      "alunos": [
        {
          "id": "student-uuid-123",
          "nome": "João Silva",
          "escola": "Escola Municipal Central",
          "serie": "5º Ano",
          "turma": "5º A",
          "respostas_por_questao": [
            {
              "questao": 1,
              "acertou": true,
              "respondeu": true,
              "resposta": "B"
            },
            {
              "questao": 2,
              "acertou": true,
              "respondeu": true,
              "resposta": "25cm²"
            }
          ],
          "total_acertos": 18,
          "total_erros": 2,
          "total_respondidas": 20,
          "total_questoes_disciplina": 20,
          "total_em_branco": 0,
          "nivel_proficiencia": "Avançado",
          "nota": 9.0,
          "proficiencia": 380.5,
          "status": "concluida",
          "percentual_acertos": 90.0,
          "posicao": 1,
          "moedas_ganhas": 110,
          "tempo_gasto": 3200
        },
        {
          "id": "student-uuid-456",
          "nome": "Maria Santos",
          "escola": "Escola Municipal Central",
          "serie": "5º Ano",
          "turma": "5º A",
          "respostas_por_questao": [
            {
              "questao": 1,
              "acertou": true,
              "respondeu": true,
              "resposta": "B"
            },
            {
              "questao": 2,
              "acertou": false,
              "respondeu": true,
              "resposta": "20cm²"
            }
          ],
          "total_acertos": 15,
          "total_erros": 5,
          "total_respondidas": 20,
          "total_questoes_disciplina": 20,
          "total_em_branco": 0,
          "nivel_proficiencia": "Adequado",
          "nota": 7.5,
          "proficiencia": 320.0,
          "status": "concluida",
          "percentual_acertos": 75.0,
          "posicao": 2,
          "moedas_ganhas": 60,
          "tempo_gasto": 3500
        }
      ]
    }
  ],
  "geral": {
    "alunos": [
      {
        "id": "student-uuid-123",
        "nome": "João Silva",
        "escola": "Escola Municipal Central",
        "serie": "5º Ano",
        "turma": "5º A",
        "nota_geral": 9.0,
        "proficiencia_geral": 380.5,
        "nivel_proficiencia_geral": "Avançado",
        "total_acertos_geral": 18,
        "total_questoes_geral": 20,
        "total_respondidas_geral": 20,
        "total_em_branco_geral": 0,
        "percentual_acertos_geral": 90.0,
        "status_geral": "concluida",
        "posicao": 1,
        "moedas_ganhas": 110,
        "tempo_gasto": 3200
      },
      {
        "id": "student-uuid-456",
        "nome": "Maria Santos",
        "escola": "Escola Municipal Central",
        "serie": "5º Ano",
        "turma": "5º A",
        "nota_geral": 7.5,
        "proficiencia_geral": 320.0,
        "nivel_proficiencia_geral": "Adequado",
        "total_acertos_geral": 15,
        "total_questoes_geral": 20,
        "total_respondidas_geral": 20,
        "total_em_branco_geral": 0,
        "percentual_acertos_geral": 75.0,
        "status_geral": "concluida",
        "posicao": 2,
        "moedas_ganhas": 60,
        "tempo_gasto": 3500
      }
    ]
  }
}
```

---

### 4.2 GET /competitions/<competition_id>/my-result - Meu Resultado

**Response 200 (Com Resultado):**
```json
{
  "mensagem": "Resultado obtido com sucesso",
  "data": {
    "id": "result-uuid-789",
    "competition_id": "competition-uuid-789",
    "student_id": "student-uuid-123",
    "session_id": "session-uuid-456",
    "correct_answers": 17,
    "total_questions": 20,
    "score_percentage": 85.0,
    "grade": 8.5,
    "proficiency": 350.0,
    "classification": "Avançado",
    "posicao": 1,
    "moedas_ganhas": 110,
    "tempo_gasto": 3200,
    "acertos": 17,
    "erros": 3,
    "em_branco": 0,
    "calculated_at": "2025-02-01T11:20:45"
  }
}
```

**Response 200 (Sem Resultado):**
```json
{
  "mensagem": "Resultado não encontrado",
  "data": null
}
```

---

## 5. RESPOSTAS DE ERRO COMUNS

### 5.1 Erro 400 - Bad Request
```json
{
  "erro": "Dados não fornecidos"
}
```

ou

```json
{
  "erro": "Campo obrigatório ausente: title"
}
```

### 5.2 Erro 401 - Unauthorized
```json
{
  "erro": "Token de autenticação inválido ou expirado"
}
```

### 5.3 Erro 403 - Forbidden
```json
{
  "erro": "Você não tem permissão para acessar este recurso"
}
```

### 5.4 Erro 404 - Not Found
```json
{
  "erro": "Competição não encontrada"
}
```

ou

```json
{
  "erro": "Usuário não encontrado"
}
```

### 5.5 Erro 500 - Internal Server Error
```json
{
  "erro": "Erro interno do servidor",
  "detalhes": "Mensagem de erro detalhada para debug"
}
```

---

## Observações

1. Todos os timestamps estão no formato ISO 8601: `YYYY-MM-DDTHH:MM:SS`
2. UUIDs são strings no formato padrão UUID v4
3. Campos numéricos podem ser `null` quando não aplicáveis
4. Arrays podem estar vazios `[]` quando não há dados
5. O campo `recompensas` é um objeto JSON com as moedas por posição
6. O campo `dificuldade` é um array de strings
7. A estrutura de resultados detalhados segue o padrão de `_gerar_tabela_detalhada_por_disciplina`

