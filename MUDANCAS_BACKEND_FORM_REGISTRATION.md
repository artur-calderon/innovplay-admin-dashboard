# Mudanças Necessárias no Backend - FormRegistration

## Resumo

O componente `FormRegistration.tsx` foi atualizado para permitir:
1. Seleção granular de destinatários através de filtros (Estado, Município, Escola, Série, Turma)
2. Determinação automática do tipo de formulário baseado na série selecionada
3. Editor de perguntas para adicionar/remover perguntas do questionário antes do envio

## Endpoints Necessários

### 1. Endpoint para Criar/Enviar Formulário com Filtros

**Rota:** `POST /forms/create`

**Payload Esperado:**

```json
{
  "formType": "aluno-jovem" | "aluno-velho" | "professor" | "diretor" | "secretario",
  "title": "Aluno (Anos Iniciais)",
  "description": "Questionário socioeconômico para estudantes dos anos iniciais...",
  "questions": [
    {
      "id": "q1",
      "texto": "Qual é o seu sexo?",
      "tipo": "selecao_unica",
      "opcoes": ["Masculino", "Feminino", "Não quero declarar"],
      "obrigatoria": true,
      "ordem": 1,
      "subPerguntas": [] // opcional, apenas se houver
    }
    // ... mais perguntas
  ],
  "filters": {
    "estado": "string (ID do estado)",
    "municipio": "string (ID do município)",
    "escola": "string (ID da escola)",
    "serie": "string (ID da série) | undefined", // opcional
    "turma": "string (ID da turma) | undefined"  // opcional
  },
  "selectedSchools": ["string (ID da escola)"],
  "selectedGrades": ["string (ID da série)"] | undefined, // opcional
  "selectedClasses": ["string (ID da turma)"] | undefined // opcional
}
```

**Resposta Esperada:**

```json
{
  "success": true,
  "message": "Formulário criado com sucesso",
  "data": {
    "id": "uuid-do-formulario",
    "formType": "aluno-jovem",
    "title": "Aluno (Anos Iniciais)",
    "createdAt": "2024-01-01T00:00:00Z",
    "filters": {
      "estado": "...",
      "municipio": "...",
      "escola": "...",
      "serie": "...",
      "turma": "..."
    }
  }
}
```

### 2. Endpoint para Buscar Informações da Série (já existe, mas precisa retornar education_stage_id)

**Rota:** `GET /grades/:gradeId`

**Resposta Esperada (atualizada):**

```json
{
  "id": "uuid-da-serie",
  "name": "1º Ano",
  "education_stage_id": "uuid-do-education-stage", // IMPORTANTE: necessário para determinar tipo de formulário
  "educationStageId": "uuid-do-education-stage", // alias para compatibilidade
  // ... outros campos
}
```

**Nota:** Este endpoint já deve existir, mas precisa garantir que retorne o campo `education_stage_id` ou `educationStageId` para permitir a determinação automática do tipo de formulário.

## Estrutura de Dados

### Filtros

O objeto `filters` contém:
- `estado`: ID do estado (obrigatório)
- `municipio`: ID do município (obrigatório)
- `escola`: ID da escola (obrigatório)
- `serie`: ID da série (opcional, pode ser `undefined`)
- `turma`: ID da turma (opcional, pode ser `undefined`)

### Perguntas

Cada pergunta no array `questions` deve ter:
- `id`: Identificador único da pergunta
- `texto`: Texto da pergunta
- `tipo`: Tipo da pergunta (`selecao_unica`, `multipla_escolha`, `matriz_selecao`, etc.)
- `opcoes`: Array de opções (se aplicável)
- `obrigatoria`: Boolean indicando se é obrigatória
- `ordem`: Número da ordem da pergunta no questionário
- `subPerguntas`: Array de sub-perguntas (opcional)

## Lógica de Determinação do Tipo de Formulário

O frontend determina o tipo de formulário baseado no `education_stage_id` da série:

### Mapeamento de Education Stages:

- **aluno-jovem:**
  - `d1142d12-ed98-46f4-ae78-62c963371464` (Educação Infantil)
  - `614b7d10-b758-42ec-a04e-86f78dc7740a` (Anos Iniciais)
  - `63cb6876-3221-4fa2-89e8-a82ad1733032` (EJA - períodos 1-5)

- **aluno-velho:**
  - `c78fcd8e-00a1-485d-8c03-70bcf59e3025` (Anos Finais)
  - `63cb6876-3221-4fa2-89e8-a82ad1733032` (EJA - períodos 6-9)

**Nota:** Para EJA, o frontend também verifica o número do período no nome da série para distinguir entre aluno-jovem (1-5) e aluno-velho (6-9).

## Validações Necessárias no Backend

1. **Filtros obrigatórios:**
   - Validar que `filters.estado`, `filters.municipio` e `filters.escola` estão presentes
   - Validar que os IDs existem no banco de dados

2. **Tipo de formulário:**
   - Validar que `formType` é um dos valores permitidos
   - Validar que o `formType` corresponde ao `education_stage_id` da série (se série fornecida)

3. **Perguntas:**
   - Validar que o array `questions` não está vazio
   - Validar que todas as perguntas têm `id`, `texto`, `tipo` e `ordem`
   - Validar que perguntas obrigatórias não foram removidas (opcional, dependendo da regra de negócio)

4. **Destinatários:**
   - Validar que `selectedSchools` contém pelo menos uma escola
   - Se `selectedGrades` for fornecido, validar que as séries pertencem às escolas selecionadas
   - Se `selectedClasses` for fornecido, validar que as turmas pertencem às séries selecionadas

## Processamento no Backend

1. **Criar o formulário:**
   - Salvar as informações do formulário (título, descrição, tipo)
   - Salvar as perguntas selecionadas com suas respectivas ordens
   - Salvar os filtros aplicados

2. **Determinar destinatários:**
   - Com base nos filtros, determinar quais alunos/professores/diretores/secretários receberão o formulário
   - Se `serie` fornecida: filtrar apenas alunos daquela série
   - Se `turma` fornecida: filtrar apenas alunos daquela turma
   - Se `formType` for `professor`: filtrar professores das escolas selecionadas
   - Se `formType` for `diretor`: filtrar diretores das escolas selecionadas
   - Se `formType` for `secretario`: filtrar secretários do município selecionado

3. **Enviar notificações:**
   - Enviar notificações para os destinatários determinados
   - Criar registros de envio para rastreamento

## Exemplo de Implementação (Pseudocódigo)

```python
@router.post("/forms/create")
async def create_form(form_data: FormCreateRequest):
    # Validar filtros obrigatórios
    if not form_data.filters.estado or not form_data.filters.municipio or not form_data.filters.escola:
        raise HTTPException(status_code=400, detail="Estado, Município e Escola são obrigatórios")
    
    # Validar tipo de formulário
    valid_form_types = ["aluno-jovem", "aluno-velho", "professor", "diretor", "secretario"]
    if form_data.formType not in valid_form_types:
        raise HTTPException(status_code=400, detail="Tipo de formulário inválido")
    
    # Validar perguntas
    if not form_data.questions or len(form_data.questions) == 0:
        raise HTTPException(status_code=400, detail="O formulário deve ter pelo menos uma pergunta")
    
    # Validar que a série corresponde ao tipo de formulário (se série fornecida)
    if form_data.filters.serie:
        grade = await get_grade_by_id(form_data.filters.serie)
        if grade:
            expected_form_type = determine_form_type_from_education_stage(grade.education_stage_id)
            if expected_form_type != form_data.formType:
                raise HTTPException(
                    status_code=400, 
                    detail=f"A série selecionada corresponde ao tipo '{expected_form_type}', não '{form_data.formType}'"
                )
    
    # Criar formulário
    form = await create_form_in_db(
        form_type=form_data.formType,
        title=form_data.title,
        description=form_data.description,
        questions=form_data.questions,
        filters=form_data.filters
    )
    
    # Determinar destinatários
    recipients = await determine_recipients(
        form_type=form_data.formType,
        filters=form_data.filters,
        selected_schools=form_data.selectedSchools,
        selected_grades=form_data.selectedGrades,
        selected_classes=form_data.selectedClasses
    )
    
    # Enviar notificações
    await send_form_notifications(form.id, recipients)
    
    return {
        "success": True,
        "message": "Formulário criado com sucesso",
        "data": {
            "id": form.id,
            "formType": form.form_type,
            "title": form.title,
            "createdAt": form.created_at,
            "filters": form.filters,
            "recipients_count": len(recipients)
        }
    }
```

## Endpoints Existentes que Podem Ser Reutilizados

Os seguintes endpoints já existem e são usados pelo frontend:

- `GET /evaluation-results/opcoes-filtros` - Para buscar estados, municípios, escolas, séries e turmas
- `GET /city/municipalities/state/:stateId` - Para buscar municípios de um estado
- `GET /grades/:gradeId` - Para buscar informações de uma série (precisa retornar `education_stage_id`)

## Notas Importantes

1. **Compatibilidade:** O backend deve manter compatibilidade com o endpoint existente de criação de formulários, se houver.

2. **Filtros vs Seleções:** O objeto `filters` contém os filtros hierárquicos (Estado → Município → Escola → Série → Turma), enquanto `selectedSchools`, `selectedGrades` e `selectedClasses` são arrays que podem conter múltiplos valores. O backend deve processar ambos para determinar os destinatários.

3. **Perguntas Removidas:** O frontend permite que o usuário remova perguntas do questionário antes do envio. O backend deve aceitar apenas as perguntas enviadas, não todas as perguntas do tipo de formulário.

4. **Validação de Série:** Se uma série for selecionada, o backend deve validar que o tipo de formulário corresponde ao `education_stage_id` da série para evitar erros.

5. **Performance:** Se muitos destinatários forem determinados, considere processar o envio de notificações de forma assíncrona.

## Testes Recomendados

1. Testar criação de formulário com todos os filtros preenchidos
2. Testar criação de formulário apenas com filtros obrigatórios
3. Testar validação de tipo de formulário vs série selecionada
4. Testar remoção de perguntas obrigatórias (se permitido)
5. Testar determinação de destinatários para cada tipo de formulário
6. Testar com múltiplas escolas, séries e turmas selecionadas

