# 📊 Endpoints para Resultados de Avaliações

## 🔗 Base URL
```
/evaluation-results
```

## 📋 **1. Listar Avaliações com Estatísticas**
**`GET /evaluation-results/avaliacoes`**

Lista todas as avaliações com estatísticas completas de desempenho.

**Query Parameters:**
- `estado` (opcional): Filtrar por estado
- `municipio` (opcional): Filtrar por município  
- `escola` (opcional): Filtrar por escola
- `serie` (opcional): Filtrar por série
- `turma` (opcional): Filtrar por turma
- `avaliacao` (opcional): Filtrar por avaliação
- `page` (opcional): Número da página (padrão: 1)
- `per_page` (opcional): Itens por página (padrão: 10, máximo: 100)

**⚠️ Requer mínimo 2 filtros**

**Resposta:**
```json
{
  "data": [
    {
      "id": "test_id",
      "titulo": "TESTE DOMINGO",
      "disciplina": "Matemática",
      "curso": "Anos Iniciais",
      "serie": "N/A",
      "escola": "Escola ABC",
      "municipio": "São Paulo",
      "data_aplicacao": "2024-01-01T10:00:00",
      "data_correcao": "2024-01-02T15:30:00",
      "status": "concluida",
      "total_alunos": 25,
      "alunos_participantes": 23,
      "alunos_pendentes": 0,
      "alunos_ausentes": 2,
      "media_nota": 7.2,
      "media_proficiencia": 645.5,
      "distribuicao_classificacao": {
        "abaixo_do_basico": 3,
        "basico": 8,
        "adequado": 10,
        "avancado": 2
      }
    }
  ],
  "total": 15,
  "page": 1,
  "per_page": 10,
  "total_pages": 2
}
```

---

## 👥 **2. Listar Alunos de uma Avaliação**
**`GET /evaluation-results/alunos?avaliacao_id={id}`**

Retorna todos os alunos com seus resultados de uma avaliação específica.

**Query Parameters:**
- `avaliacao_id` (obrigatório): ID da avaliação

**Resposta:**
```json
{
  "data": [
    {
      "id": "student_id",
      "nome": "Tamaro Barbosa",
      "turma": "Turma A",
      "grade": "9º Ano",
      "nota": 3.44,
      "proficiencia": 150.0,
      "classificacao": "Abaixo do Básico",
      "questoes_respondidas": 10,
      "acertos": 4,
      "erros": 6,
      "em_branco": 0,
      "tempo_gasto": 3600,
      "status": "concluida"
    }
  ]
}
```

---

## 🎯 **3. Resultados de Aluno Específico**
**`GET /evaluation-results/{test_id}/student/{student_id}/results`**

Resultados detalhados de um aluno específico em uma avaliação.

**Query Parameters:**
- `include_answers` (opcional): "true" para incluir respostas detalhadas

**Resposta:**
```json
{
  "test_id": "test_id",
  "student_id": "student_id",
  "student_db_id": "student_db_id",
  "total_questions": 10,
  "answered_questions": 10,
  "correct_answers": 4,
  "score_percentage": 40.0,
  "total_score": 4.0,
  "max_possible_score": 10.0,
  "proficiency": 150.0,
  "grade": 3.44,
  "classification": "Abaixo do Básico",
  "answers": [
    {
      "question_id": "q1",
      "question_text": "Questão sobre números",
      "question_type": "multipleChoice",
      "correct_answer": "A",
      "student_answer": "D",
      "options": ["A", "B", "C", "D"],
      "is_correct": false,
      "score": 0.0
    }
  ]
}
```

---

## 📊 **4. Avaliação Específica**
**`GET /evaluation-results/avaliacoes/{evaluation_id}`**

Retorna dados detalhados de uma avaliação específica.

**Resposta:**
```json
{
  "id": "test_id",
  "titulo": "TESTE DOMINGO",
  "disciplina": "Matemática",
  "curso": "Anos Iniciais",
  "serie": "N/A",
  "escola": "Escola ABC",
  "municipio": "São Paulo",
  "data_aplicacao": "2024-01-01T10:00:00",
  "data_correcao": "2024-01-02T15:30:00",
  "status": "concluida",
  "total_alunos": 25,
  "alunos_participantes": 23,
  "alunos_pendentes": 0,
  "alunos_ausentes": 2,
  "media_nota": 7.2,
  "media_proficiencia": 645.5,
  "distribuicao_classificacao": {
    "abaixo_do_basico": 3,
    "basico": 8,
    "adequado": 10,
    "avancado": 2
  }
}
```

---

## 📈 **5. Relatório Detalhado**
**`GET /evaluation-results/relatorio-detalhado/{evaluation_id}`**

Relatório completo com estatísticas detalhadas de uma avaliação.

**Resposta:**
```json
{
  "avaliacao": {
    "id": "test_id",
    "titulo": "TESTE DOMINGO",
    "disciplina": "Matemática",
    "curso": "Anos Iniciais"
  },
  "questoes": [
    {
      "id": "q1",
      "numero": 1,
      "texto": "Questão sobre números",
      "habilidade": "Números",
      "tipo": "multipleChoice",
      "dificuldade": "Médio",
      "porcentagem_acertos": 60.0,
      "porcentagem_erros": 40.0
    }
  ],
  "alunos": [
    {
      "id": "student_id",
      "nome": "Tamaro Barbosa",
      "turma": "Turma A",
      "total_acertos": 4,
      "total_erros": 6,
      "total_em_branco": 0,
      "nota": 3.44,
      "proficiencia": 150.0,
      "classificacao": "Abaixo do Básico",
      "status": "concluida"
    }
  ]
}
```

---

## 🔧 **6. Calcular Notas**
**`POST /evaluation-results/{test_id}/calculate-scores`**

Calcula as notas de todos os alunos para uma avaliação específica.

**Body (opcional):**
```json
{
  "student_ids": ["uuid1", "uuid2"]
}
```

**Resposta:**
```json
{
  "test_id": "test_id",
  "test_title": "TESTE DOMINGO",
  "total_students": 25,
  "total_questions": 10,
  "calculation_timestamp": "2024-01-02T15:30:00",
  "results": {
    "student_id": {
      "total_questions": 10,
      "answered_questions": 10,
      "correct_answers": 4,
      "score_percentage": 40.0,
      "total_score": 4.0,
      "max_possible_score": 10.0
    }
  }
}
```

---

## 📋 **7. Lista de Avaliações com Resultados**
**`GET /evaluation-results/list`**

Lista de avaliações com resultados agregados.

**Resposta:**
```json
[
  {
    "id": "test_id",
    "title": "TESTE DOMINGO",
    "subject_name": "Matemática",
    "grade_name": "9º Ano",
    "total_students": 25,
    "completed_students": 23,
    "average_score": 72.5,
    "status": "completed",
    "created_at": "2024-01-01T10:00:00",
    "last_updated": "2024-01-02T15:30:00"
  }
]
```

---

## 📊 **8. Estatísticas Gerais**
**`GET /evaluation-results/stats`**

Estatísticas gerais do sistema de avaliações.

**Resposta:**
```json
{
  "completed_evaluations": 45,
  "pending_results": 12,
  "total_evaluations": 67,
  "average_score": 72.5,
  "total_students": 1250,
  "average_completion_time": 65,
  "top_performance_subject": "Matemática"
}
```

---

## 🔍 **9. Respostas de Aluno**
**`GET /evaluation-results/{test_id}/student/{student_id}/answers`**

Respostas detalhadas de um aluno em uma avaliação.

**Resposta:**
```json
{
  "test_id": "test_id",
  "student_id": "student_id",
  "answers": [
    {
      "question_id": "q1",
      "question_text": "Questão sobre números",
      "question_type": "multipleChoice",
      "student_answer": "D",
      "correct_answer": "A",
      "is_correct": false,
      "score": 0.0,
      "feedback": null
    }
  ]
}
```

---

## 🔐 **Controle de Acesso**

### **Permissões por Papel:**

| Papel | Acesso às Avaliações | Acesso aos Resultados |
|-------|---------------------|----------------------|
| **Professor** | Apenas suas avaliações | Apenas suas avaliações |
| **Admin** | Todas as avaliações | Todas as avaliações |
| **Coordenador** | Todas as avaliações | Todas as avaliações |
| **Diretor** | Todas as avaliações | Todas as avaliações |
| **Aluno** | Apenas suas avaliações | Apenas seus resultados |

### **Autenticação:**
- Todos os endpoints requerem JWT token
- Token deve ser enviado no header: `Authorization: Bearer <token>`

---

## 📝 **Exemplo de Uso - Tamaro Barbosa**

Para obter os resultados do Tamaro Barbosa na avaliação "TESTE DOMINGO":

```bash
# 1. Obter ID da avaliação
GET /evaluation-results/avaliacoes?avaliacao=TESTE DOMINGO

# 2. Obter resultados do aluno
GET /evaluation-results/{test_id}/student/{student_id}/results

# Resposta esperada:
{
  "test_id": "c41c35c9-417b-4933-b651-08faa7fddb65",
  "student_id": "c9d298cd-09cd-4cf9-b620-a8b41afa4120",
  "total_questions": 10,
  "correct_answers": 4,
  "score_percentage": 40.0,
  "proficiency": 150.0,
  "grade": 3.44,
  "classification": "Abaixo do Básico"
}
``` 