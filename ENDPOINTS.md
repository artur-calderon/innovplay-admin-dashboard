# Endpoints Unificados - Admin Dashboard (Atualizado)

Documento revisado com base nas rotas registradas no backend (`create_app`).

## Regras gerais

- API usa JWT na maior parte das rotas protegidas.
- Header padrão: `Authorization: Bearer <token>`.
- Em ambiente multi-tenant, algumas rotas também dependem de contexto de cidade/schema.
- Existem rotas de `debug` e rotas de `fallback/legado`; ambas estão sinalizadas.

---

## Resultados de avaliações (`/evaluation-results`)

### Núcleo (uso principal no dashboard)
- `GET /evaluation-results/avaliacoes` - Retorna dados de evaluation results conforme filtros/permissões.
- `GET /evaluation-results/avaliacoes/{evaluation_id}` - Retorna detalhes de evaluation results por identificador.
- `GET /evaluation-results/relatorio-detalhado/{evaluation_id}` - Retorna relatório detalhado por questão/aluno.
- `GET /evaluation-results/alunos` - Retorna dados de evaluation results conforme filtros/permissões.
- `POST /evaluation-results/avaliacoes/calcular` - Cria ou executa ação em evaluation results.
- `PATCH /evaluation-results/avaliacoes/{test_id}/finalizar` - Finaliza avaliação e bloqueia novas alterações.
- `POST /evaluation-results/avaliacoes/{test_id}/verificar-status` - Dispara verificação de status da avaliação.
- `GET /evaluation-results/avaliacoes/{test_id}/status-resumo` - Retorna status de processamento/operação.
- `POST /evaluation-results/avaliacoes/verificar-todas` - Verifica status em lote das avaliações filtradas.
- `GET /evaluation-results/avaliacoes/estatisticas-status` - Retorna distribuição de avaliações por status.

### Aluno / correção
- `GET /evaluation-results/{test_id}/student/{student_id}/results` - Retorna dados de evaluation results conforme filtros/permissões.
- `GET /evaluation-results/{test_id}/student/{student_id}/answers` - Retorna dados de evaluation results conforme filtros/permissões.
- `POST /evaluation-results/{test_id}/calculate-scores` - Recalcula notas/pontuações da avaliação.
- `POST /evaluation-results/{test_id}/manual-correction` - Executa correção manual assistida.
- `POST /evaluation-results/{test_id}/batch-correction` - Executa correção em lote para avaliação.
- `GET /evaluation-results/{test_id}/pending-corrections` - Lista correções pendentes da avaliação.

### Administração e manutenção
- `GET /evaluation-results/admin/submitted-evaluations` - Envia respostas finais da sessão do aluno.
- `PATCH /evaluation-results/admin/evaluations/{evaluation_id}/correct` - Atualiza evaluation results parcialmente.
- `PATCH /evaluation-results/admin/evaluations/{evaluation_id}/finish` - Atualiza evaluation results parcialmente.
- `POST /evaluation-results/{test_id}/rebuild-cache` - Reprocessa e reconstrói cache dos resultados.
- `POST /evaluation-results/result/{result_id}/recalculate` - Recalcula um resultado específico.

### Auxiliares/teste/debug
- `GET /evaluation-results/grades` - Retorna dados de evaluation results conforme filtros/permissões.
- `GET /evaluation-results/test/ping` - Retorna dados de evaluation results conforme filtros/permissões.
- `GET /evaluation-results/test/avaliacoes` - Retorna dados de evaluation results conforme filtros/permissões.
- `GET /evaluation-results/test/avaliacoes/{evaluation_id}` - Retorna detalhes de evaluation results por identificador.
- `GET /evaluation-results/test/relatorio-detalhado/{evaluation_id}` - Retorna relatório detalhado por questão/aluno.
- `GET /evaluation-results/debug/{evaluation_id}` - Retorna detalhes de evaluation results por identificador.

### Legado (ainda existentes)
- `GET /evaluation-results/list` - Retorna dados de evaluation results conforme filtros/permissões.
- `GET /evaluation-results/stats` - Retorna estatísticas consolidadas do módulo.

---

## Dashboard e endpoints básicos

- `GET /dashboard/stats` - Retorna estatísticas consolidadas do módulo.
- `GET /dashboard/comprehensive-stats` - Retorna estatísticas completas para dashboard.
- `GET /health` - Verifica saúde da API e conectividade com banco.
- `GET /evaluations/stats` - Retorna estatísticas consolidadas do módulo.
- `GET /test-sessions/submitted` - Envia respostas finais da sessão do aluno.
- `POST /test-session/{session_id}/correct` - Cria ou executa ação em test session.
- `POST /test-session/{session_id}/finalize` - Cria ou executa ação em test session.
- `GET /scheduler/status` - Retorna status de processamento/operação.
- `POST /scheduler/check-expired` - Cria ou executa ação em scheduler.
- `GET /courses` - Retorna dados de courses conforme filtros/permissões.
- `GET /subjects` - Retorna dados de subjects conforme filtros/permissões.
- `GET /classes` - Retorna dados de classes conforme filtros/permissões.
- `GET /schools` - Retorna dados de schools conforme filtros/permissões.
- `GET /schools/recent` - Lista registros recentes para visão rápida.
- `GET /students/recent` - Lista registros recentes para visão rápida.
- `GET /questions/recent` - Lista registros recentes para visão rápida.

---

## Usuários (`/users`)

- `GET /users/list` - Retorna dados de users conforme filtros/permissões.
- `POST /users` - Cria ou executa ação em users.
- `GET /users/{user_id}` - Retorna detalhes de users por identificador.
- `PUT /users/{user_id}` - Atualiza users integralmente.
- `DELETE /users/{user_id}` - Remove users.
- `POST /users/forgot-password` - Solicita fluxo de recuperação de senha.
- `POST /users/reset-password` - Define nova senha com token de recuperação.
- `POST /users/change-password` - Altera senha do usuário autenticado.
- `POST /users/check-email` - Valida disponibilidade/existência de e-mail.
- `POST /users/validate-reset-token` - Valida token de recuperação de senha.
- `GET /users/me/onboarding-status` - Consulta andamento do onboarding do usuário.
- `POST /users/me/onboarding` - Salva etapa/dados de onboarding do usuário.
- `POST /users/user-settings/{user_id}` - Lê/grava preferências de usuário.
- `GET /users/user-settings/{user_id}` - Lê/grava preferências de usuário.
- `POST /users/bulk-upload-students` - Importa alunos em lote para o sistema.

---

## Estudantes (`/students`)

- `POST /students` - Cria ou executa ação em students.
- `GET /students` - Retorna dados de students conforme filtros/permissões.
- `GET /students/{student_id}` - Retorna detalhes de students por identificador.
- `PUT /students/{student_id}/{class_id}` - Atualiza students integralmente.
- `DELETE /students/{student_id}` - Remove students.
- `GET /students/available` - Retorna dados de students conforme filtros/permissões.
- `GET /students/school/{school_id}` - Retorna detalhes de students por identificador.
- `GET /students/classes/{class_id}` - Retorna detalhes de students por identificador.
- `GET /students/school/{school_id}/class/{class_id}` - Retorna detalhes de students por identificador.
- `GET /students/{student_id}/class` - Retorna dados de students conforme filtros/permissões.
- `GET /students/me` - Retorna dados de students conforme filtros/permissões.
- `GET /students/recent` - Lista registros recentes para visão rápida.
- `GET /students/password-report` - Retorna dados de students conforme filtros/permissões.
- `GET /students/password-report/pdf` - Retorna dados de students conforme filtros/permissões.

---

## Avaliações (`/test`)

### CRUD e listagens
- `POST /test` - Cria ou executa ação em test.
- `GET /test/` - Retorna dados de test conforme filtros/permissões.
- `GET /test/{test_id}` - Retorna detalhes de test por identificador.
- `PUT /test/{test_id}` - Atualiza test integralmente.
- `DELETE /test/{test_id}` - Remove test.
- `DELETE /test` - Remove test.
- `GET /test/user/{user_id}` - Retorna detalhes de test por identificador.
- `GET /test/school/{school_id}` - Retorna detalhes de test por identificador.
- `GET /test/{test_id}/details` - Retorna dados de test conforme filtros/permissões.
- `PUT /test/{test_id}/status` - Retorna status de processamento/operação.

### Aplicação e turmas
- `POST /test/{test_id}/apply` - Cria ou executa ação em test.
- `POST /test/{test_id}/apply-olympics` - Cria ou executa ação em test.
- `DELETE /test/{test_id}/olympics/{student_id}` - Remove test.
- `GET /test/{test_id}/applied-students` - Retorna dados de test conforme filtros/permissões.
- `GET /test/{test_id}/classes` - Retorna dados de test conforme filtros/permissões.
- `DELETE /test/{test_id}/classes/{class_id}` - Remove test.
- `POST /test/{test_id}/classes/remove` - Cria ou executa ação em test.
- `GET /test/class/{class_id}/tests` - Retorna dados de test conforme filtros/permissões.
- `GET /test/class/{class_id}/tests/complete` - Retorna dados de test conforme filtros/permissões.
- `GET /test/my-class/tests` - Retorna dados de test conforme filtros/permissões.

### Sessão e resultado
- `POST /test/{test_id}/start-session` - Inicia sessão de avaliação para o aluno.
- `GET /test/{test_id}/session-info` - Consulta metadados da sessão da avaliação.
- `GET /test/{test_id}/pdf-data` - Retorna dados para geração de PDF.
- `POST /test/compare` - Compara resultados entre avaliações/alunos.
- `POST /test/student/compare` - Compara resultados entre avaliações/alunos.
- `POST /test/student/{student_id}/compare` - Compara resultados entre avaliações/alunos.
- `GET /test/student/completed` - Retorna dados de test conforme filtros/permissões.
- `GET /test/student/result/{test_id}` - Retorna detalhes de test por identificador.
- `POST /test/evolution/export-excel` - Gera exportação em Excel com os resultados.

### Debug
- `GET /test/debug/dates/{test_id}` - Retorna detalhes de test por identificador.
- `GET /test/debug/subjects/{test_id}` - Retorna detalhes de test por identificador.
- `GET /test/debug/timezone` - Retorna dados de test conforme filtros/permissões.
- `GET /test/debug/availability/{test_id}` - Retorna detalhes de test por identificador.
- `GET /test/debug/comparison/{test_id_1}/vs/{test_id_2}` - Retorna detalhes de test por identificador.

---

## Escolas (`/school`)

- `POST /school` - Cria ou executa ação em school.
- `GET /school` - Retorna dados de school conforme filtros/permissões.
- `GET /school/{school_id}` - Retorna detalhes de school por identificador.
- `PUT /school/{school_id}` - Atualiza school integralmente.
- `DELETE /school/{school_id}` - Remove school.
- `GET /school/city/{city_id}` - Retorna detalhes de school por identificador.
- `GET /school/by-grade/{grade_id}` - Retorna detalhes de school por identificador.
- `POST /school/add-teacher` - Vincula professor à escola informada.
- `GET /school/{school_id}/courses` - Retorna dados de school conforme filtros/permissões.
- `POST /school/{school_id}/courses` - Cria ou executa ação em school.
- `DELETE /school/{school_id}/courses/{education_stage_id}` - Remove school.

---

## Turmas (`/classes`)

- `GET /classes` - Retorna dados de classes conforme filtros/permissões.
- `GET /classes/filtered` - Retorna dados de classes conforme filtros/permissões.
- `GET /classes/school/{school_id}` - Retorna detalhes de classes por identificador.
- `GET /classes/by-school/{school_id}` - Retorna detalhes de classes por identificador.
- `POST /classes` - Cria ou executa ação em classes.
- `GET /classes/{class_id}` - Retorna detalhes de classes por identificador.
- `PUT /classes/{class_id}` - Atualiza classes integralmente.
- `DELETE /classes/{class_id}` - Remove classes.
- `PUT /classes/{class_id}/add_student` - Adiciona aluno à turma informada.
- `POST /classes/{class_id}/add_student` - Adiciona aluno à turma informada.
- `PUT /classes/{class_id}/remove_student` - Remove aluno da turma informada.
- `GET /classes/{class_id}/teachers` - Lista professores vinculados à turma.

---

## Professores e gestão escolar

### Professores (`/teacher`)
- `POST /teacher` - Cria ou executa ação em teacher.
- `GET /teacher` - Retorna dados de teacher conforme filtros/permissões.
- `GET /teacher/{user_id}` - Retorna detalhes de teacher por identificador.
- `GET /teacher/school/{school_id}` - Retorna detalhes de teacher por identificador.
- `GET /teacher/directors` - Retorna dados de teacher conforme filtros/permissões.
- `POST /teacher/directors` - Cria ou executa ação em teacher.
- `GET /teacher/coordinators` - Retorna dados de teacher conforme filtros/permissões.
- `POST /teacher/coordinators` - Cria ou executa ação em teacher.
- `GET /teacher/tecadm` - Retorna dados de teacher conforme filtros/permissões.
- `POST /teacher/tecadm` - Cria ou executa ação em teacher.

### Gestores (`/managers`)
- `POST /managers` - Cria ou executa ação em managers.
- `GET /managers` - Retorna dados de managers conforme filtros/permissões.
- `GET /managers/city/{city_id}` - Retorna detalhes de managers por identificador.
- `GET /managers/school/{school_id}` - Retorna detalhes de managers por identificador.
- `POST /managers/link-to-school` - Vincula gestor à escola alvo.
- `POST /managers/school-link` - Cria/remove vínculo de gestor com escola.
- `DELETE /managers/unlink-from-school/{user_id}` - Desvincula gestor da escola atual.
- `DELETE /managers/school-link/{user_id}` - Cria/remove vínculo de gestor com escola.

### Vínculos
- `POST /school-teacher` - Cria ou executa ação em school teacher.
- `GET /school-teacher` - Retorna dados de school teacher conforme filtros/permissões.
- `DELETE /school-teacher/{id}` - Remove school teacher.
- `POST /teacher-class` - Cria ou executa ação em teacher class.
- `GET /teacher-class` - Retorna dados de teacher class conforme filtros/permissões.
- `DELETE /teacher-class/{id}` - Remove teacher class.

---

## Questões, disciplinas e apoio pedagógico

### Questões (`/questions`)
- `POST /questions` - Cria ou executa ação em questions.
- `GET /questions/` - Retorna dados de questions conforme filtros/permissões.
- `GET /questions/batch` - Retorna dados de questions conforme filtros/permissões.
- `GET /questions/{question_id}` - Retorna detalhes de questions por identificador.
- `PUT /questions/{question_id}` - Atualiza questions integralmente.
- `DELETE /questions/{question_id}` - Remove questions.
- `DELETE /questions` - Remove questions.
- `GET /questions/{question_id}/images/{image_id}` - Retorna detalhes de questions por identificador.
- `GET /questions/{question_id}/quantidade-respostas` - Retorna dados de questions conforme filtros/permissões.
- `GET /questions/recent` - Lista registros recentes para visão rápida.
- `GET /questions/debug` - Retorna dados de questions conforme filtros/permissões.

### Disciplinas e habilidades
- `GET /subjects` - Retorna dados de subjects conforme filtros/permissões.
- `GET /skills` - Retorna dados de skills conforme filtros/permissões.
- `POST /skills` - Cria ou executa ação em skills.
- `POST /skills/batch` - Cria ou executa ação em skills.
- `DELETE /skills/{skill_id}` - Remove skills.
- `GET /skills/subject/{subject_id}` - Retorna detalhes de skills por identificador.
- `GET /skills/grade/{grade_id}` - Retorna detalhes de skills por identificador.
- `GET /skills/evaluation/{test_id}` - Retorna detalhes de skills por identificador.

### Séries/etapas
- `GET /education_stages` - Retorna dados de education_stages conforme filtros/permissões.
- `GET /education_stages/all` - Retorna dados de education_stages conforme filtros/permissões.
- `GET /education_stages/{stage_id}` - Retorna detalhes de education_stages por identificador.
- `PUT /education_stages/{stage_id}` - Atualiza education_stages integralmente.
- `DELETE /education_stages/{stage_id}` - Remove education_stages.

---

## Cidade e utilitários

- `POST /city` - Cria ou executa ação em city.
- `GET /city` - Retorna dados de city conforme filtros/permissões.
- `GET /city/states` - Retorna dados de city conforme filtros/permissões.
- `GET /city/domains` - Retorna dados de city conforme filtros/permissões.
- `GET /city/municipalities/state/{state_name}` - Retorna detalhes de city por identificador.
- `GET /city/{municipio_id}` - Retorna detalhes de city por identificador.
- `PUT /city/{municipio_id}` - Atualiza city integralmente.
- `DELETE /city/{municipio_id}` - Remove city.
- `GET /city/{municipio_id}/users` - Retorna dados de city conforme filtros/permissões.
- `GET /subdomain/check` - Retorna dados de subdomain conforme filtros/permissões.
- `GET /logout` - Encerra sessão/autenticação atual.
- `POST /login/` - Autentica usuário e retorna token JWT.

---

## Links rápidos (`/user-quick-links`)

- `GET /user-quick-links/{user_id}` - Retorna detalhes de user quick links por identificador.
- `POST /user-quick-links/{user_id}` - Cria ou executa ação em user quick links.
- `DELETE /user-quick-links/{user_id}` - Remove user quick links.

---

## Calendário (`/calendar`)

- `POST /calendar/events` - Cria ou executa ação em calendar.
- `GET /calendar/events` - Retorna dados de calendar conforme filtros/permissões.
- `GET /calendar/events/{event_id}` - Retorna detalhes de calendar por identificador.
- `PUT /calendar/events/{event_id}` - Atualiza calendar integralmente.
- `DELETE /calendar/events/{event_id}` - Remove calendar.
- `POST /calendar/events/{event_id}/publish` - Publica item/evento para os destinatários.
- `GET /calendar/events/{event_id}/recipients` - Retorna dados de calendar conforme filtros/permissões.
- `POST /calendar/events/{event_id}/read` - Marca evento/notificação como lido.
- `POST /calendar/events/{event_id}/dismiss` - Marca evento/notificação como dispensado.
- `GET /calendar/my-events` - Lista eventos do usuário autenticado.
- `GET /calendar/targets/me` - Retorna públicos/alvos disponíveis para o usuário.

---

## Respostas e gabaritos

### Sessões/respostas de aluno (`/student-answers`)
- `GET /student-answers/sessions/{session_id}/status` - Retorna status de processamento/operação.
- `POST /student-answers/sessions/{session_id}/end` - Cria ou executa ação em student answers.
- `PATCH /student-answers/sessions/{session_id}/timer` - Atualiza student answers parcialmente.
- `POST /student-answers/submit` - Envia respostas finais da sessão do aluno.
- `POST /student-answers/save-partial` - Salva progresso parcial de respostas.
- `GET /student-answers/active-session/{test_id}` - Retorna detalhes de student answers por identificador.
- `GET /student-answers/active-session/{test_id}/with-answers` - Retorna dados de student answers conforme filtros/permissões.
- `POST /student-answers/active-session/{test_id}/pause` - Cria ou executa ação em student answers.
- `POST /student-answers/active-session/{test_id}/resume` - Cria ou executa ação em student answers.
- `GET /student-answers/student/{test_id}/status` - Retorna status de processamento/operação.
- `GET /student-answers/student/tests/status` - Retorna status de processamento/operação.
- `GET /student-answers/session/{session_id}/answers` - Retorna dados de student answers conforme filtros/permissões.
- `GET /student-answers/student/sessions` - Retorna dados de student answers conforme filtros/permissões.
- `GET /student-answers/student/{test_id}/can-start` - Retorna dados de student answers conforme filtros/permissões.
- `GET /student-answers/student/{test_id}/submission-status` - Retorna dados de student answers conforme filtros/permissões.

### Answer sheets (`/answer-sheets`)
- `POST /answer-sheets/create-gabaritos` - Cria ou executa ação em answer sheets.
- `POST /answer-sheets/generate` - Cria ou executa ação em answer sheets.
- `GET /answer-sheets/task/{task_id}/status` - Retorna status de processamento/operação.
- `POST /answer-sheets/process-correction` - Processa correção de cartões/gabaritos.
- `GET /answer-sheets/correction-progress/{job_id}` - Consulta progresso do job de correção.
- `GET /answer-sheets/gabaritos` - Lista ou remove gabaritos conforme método.
- `DELETE /answer-sheets/gabaritos` - Lista ou remove gabaritos conforme método.
- `GET /answer-sheets/gabarito/{gabarito_id}` - Retorna detalhes de answer sheets por identificador.
- `DELETE /answer-sheets/{gabarito_id}` - Remove answer sheets.
- `GET /answer-sheets/gabarito/{gabarito_id}/download` - Baixa arquivo/processamento gerado.
- `DELETE /answer-sheets/gabarito/{gabarito_id}/generations/{job_id}` - Remove answer sheets.
- `DELETE /answer-sheets/gabarito/{gabarito_id}/generations` - Remove answer sheets.
- `POST /answer-sheets/correct-new` - Cria ou executa ação em answer sheets.
- `GET /answer-sheets/results` - Retorna dados de answer sheets conforme filtros/permissões.
- `GET /answer-sheets/result/{result_id}` - Retorna detalhes de answer sheets por identificador.
- `GET /answer-sheets/opcoes-filtros-results` - Retorna dados de answer sheets conforme filtros/permissões.
- `GET /answer-sheets/resultados-agregados` - Retorna dados de answer sheets conforme filtros/permissões.
- `POST /answer-sheets/generate-hierarchical` - Cria ou executa ação em answer sheets.
- `GET /answer-sheets/gabaritos/{gabarito_id}/generation-jobs` - Lista ou remove gabaritos conforme método.
- `GET /answer-sheets/jobs/{job_id}/status` - Retorna status de processamento/operação.
- `GET /answer-sheets/jobs/{job_id}/download` - Baixa arquivo/processamento gerado.
- `GET /answer-sheets/opcoes-filtros` - Retorna dados de answer sheets conforme filtros/permissões.
- `POST /answer-sheets/next-filter-options` - Cria ou executa ação em answer sheets.

---

## Formulários socioeconômicos (`/forms`)

### Formulários
- `GET /forms/` - Retorna dados de forms conforme filtros/permissões.
- `POST /forms/` - Cria ou executa ação em forms.
- `GET /forms/{form_id}` - Retorna detalhes de forms por identificador.
- `PUT /forms/{form_id}` - Atualiza forms integralmente.
- `DELETE /forms/{form_id}` - Remove forms.
- `POST /forms/{form_id}/duplicate` - Duplica entidade com mesmas configurações.
- `POST /forms/{form_id}/send` - Dispara envio/publicação da entidade.
- `GET /forms/{form_id}/recipients` - Retorna dados de forms conforme filtros/permissões.
- `GET /forms/{form_id}/respond` - Retorna dados de forms conforme filtros/permissões.
- `POST /forms/{form_id}/responses` - Lista ou envia respostas do formulário.
- `POST /forms/{form_id}/responses/finalize` - Finaliza respostas do formulário.
- `GET /forms/{form_id}/responses` - Lista ou envia respostas do formulário.
- `GET /forms/{form_id}/responses/me` - Retorna respostas do usuário autenticado.
- `GET /forms/{form_id}/responses/user/{user_id}` - Retorna respostas de um usuário específico.
- `GET /forms/{form_id}/reports` - Retorna relatórios consolidados do recurso.
- `GET /forms/me` - Retorna dados de forms conforme filtros/permissões.
- `GET /forms/reports/statistics` - Retorna relatórios consolidados do recurso.
- `GET /forms/templates` - Lista templates disponíveis do módulo.
- `GET /forms/templates/{form_type}` - Lista templates disponíveis do módulo.
- `GET /forms/templates/{form_type}/questions` - Lista templates disponíveis do módulo.

### Filtros e resultados
- `GET /forms/filter-options` - Retorna opções de filtros para dropdowns.
- `GET /forms/results/filter-options` - Retorna opções de filtros para dropdowns.
- `GET /forms/results/inse-saeb/filter-options` - Retorna opções de filtros para dropdowns.
- `GET /forms/schools/city/{city_id}` - Retorna detalhes de forms por identificador.
- `GET /forms/grades/school/{school_id}` - Retorna detalhes de forms por identificador.
- `GET /forms/classes/grade/{grade_id}` - Retorna detalhes de forms por identificador.
- `GET /forms/grades/{grade_id}` - Retorna detalhes de forms por identificador.
- `GET /forms/{form_id}/results/indices` - Retorna dados de forms conforme filtros/permissões.
- `GET /forms/{form_id}/results/profiles` - Retorna dados de forms conforme filtros/permissões.
- `GET /forms/{form_id}/results/inse-saeb` - Retorna dados de forms conforme filtros/permissões.
- `GET /forms/{form_id}/results/respostas` - Retorna dados de forms conforme filtros/permissões.
- `GET /forms/{form_id}/results/status/{task_id}` - Retorna status de processamento/operação.
- `POST /forms/{form_id}/results/cache/invalidate` - Cria ou executa ação em forms.
- `GET /forms/{form_id}/results/cache/status` - Retorna status de processamento/operação.
- `POST /forms/{form_id}/results/cache/populate` - Cria ou executa ação em forms.
- `POST /forms/results/cache/populate-all` - Cria ou executa ação em forms.
- `GET /forms/aggregated/results/indices` - Retorna dados de forms conforme filtros/permissões.
- `GET /forms/aggregated/results/profiles` - Retorna dados de forms conforme filtros/permissões.
- `GET /forms/aggregated/results/summary` - Retorna dados de forms conforme filtros/permissões.

---

## Relatórios (`/reports`)

- `GET /reports/dados-json/{evaluation_id}` - Retorna relatórios consolidados do recurso.
- `GET /reports/status/{evaluation_id}` - Retorna status de processamento/operação.
- `POST /reports/force-rebuild/{evaluation_id}` - Retorna relatórios consolidados do recurso.
- Outras rotas de relatório legado ainda podem coexistir em `/reports/*` como fallback.

---

## Competições (`/competitions`)

- `GET /competitions/` - Retorna dados de competitions conforme filtros/permissões.
- `POST /competitions/` - Cria ou executa ação em competitions.
- `GET /competitions/{competition_id}` - Retorna detalhes de competitions por identificador.
- `PUT /competitions/{competition_id}` - Atualiza competitions integralmente.
- `DELETE /competitions/{competition_id}` - Remove competitions.
- `GET /competitions/available` - Retorna dados de competitions conforme filtros/permissões.
- `GET /competitions/my` - Retorna dados de competitions conforme filtros/permissões.
- `GET /competitions/allowed-scopes` - Retorna dados de competitions conforme filtros/permissões.
- `GET /competitions/eligible-classes` - Retorna dados de competitions conforme filtros/permissões.
- `GET /competitions/level-options` - Retorna dados de competitions conforme filtros/permissões.
- `GET /competitions/{competition_id}/details` - Retorna dados de competitions conforme filtros/permissões.
- `POST /competitions/{competition_id}/enroll` - Cria ou executa ação em competitions.
- `DELETE /competitions/{competition_id}/unenroll` - Remove competitions.
- `GET /competitions/{competition_id}/enrolled-students` - Retorna dados de competitions conforme filtros/permissões.
- `GET /competitions/{competition_id}/eligible-students` - Retorna dados de competitions conforme filtros/permissões.
- `GET /competitions/{competition_id}/my-session` - Retorna dados de competitions conforme filtros/permissões.
- `POST /competitions/{competition_id}/start` - Cria ou executa ação em competitions.
- `POST /competitions/{competition_id}/finalize` - Cria ou executa ação em competitions.
- `POST /competitions/{competition_id}/stop` - Cria ou executa ação em competitions.
- `POST /competitions/{competition_id}/publish` - Publica item/evento para os destinatários.
- `POST /competitions/{competition_id}/cancel` - Cria ou executa ação em competitions.
- `POST /competitions/{competition_id}/questions` - Cria ou executa ação em competitions.
- `POST /competitions/{competition_id}/randomize-questions` - Cria ou executa ação em competitions.
- `GET /competitions/{competition_id}/ranking` - Retorna dados de competitions conforme filtros/permissões.
- `GET /competitions/{competition_id}/ranking-by-scope` - Retorna dados de competitions conforme filtros/permissões.
- `GET /competitions/{competition_id}/analytics` - Retorna dados de competitions conforme filtros/permissões.
- `GET /competitions/{competition_id}/my-ranking` - Retorna dados de competitions conforme filtros/permissões.
- `GET /competitions/students/me/competition-ranking-classification` - Retorna dados de competitions conforme filtros/permissões.

---

## Certificados (`/certificates`)

- `GET /certificates/template/{evaluation_id}` - Retorna detalhes de certificates por identificador.
- `POST /certificates/template` - Cria ou executa ação em certificates.
- `GET /certificates/approved-students/{evaluation_id}` - Aprova emissão/ação do módulo.
- `POST /certificates/approve` - Aprova emissão/ação do módulo.
- `GET /certificates/me` - Retorna dados de certificates conforme filtros/permissões.
- `GET /certificates/student/{student_id}` - Retorna detalhes de certificates por identificador.
- `GET /certificates/quantidade` - Retorna dados de certificates conforme filtros/permissões.
- `GET /certificates/{certificate_id}` - Retorna detalhes de certificates por identificador.

---

## Moedas (`/coins`)

- `GET /coins/balance` - Consulta saldo de moedas do usuário.
- `GET /coins/transactions` - Lista transações da carteira de moedas.
- `GET /coins/transactions/{transaction_id}` - Lista transações da carteira de moedas.
- `POST /coins/admin/credit` - Credita moedas administrativamente.
- `POST /coins/admin/debit` - Debita moedas administrativamente.

---

## Loja (`/store`)

- `GET /store/items` - Retorna dados de store conforme filtros/permissões.
- `POST /store/purchase` - Executa compra do item selecionado.
- `GET /store/my-purchases` - Lista compras realizadas pelo usuário.
- `GET /store/admin/items` - Retorna dados de store conforme filtros/permissões.
- `POST /store/admin/items` - Cria ou executa ação em store.
- `PUT /store/admin/items/{item_id}` - Atualiza store integralmente.
- `DELETE /store/admin/items/{item_id}` - Remove store.
- `GET /store/admin/allowed-scopes` - Retorna dados de store conforme filtros/permissões.

---

## Outros módulos ativos

- Play TV: `GET/POST /play-tv/videos`, `GET/DELETE /play-tv/videos/{video_id}`
- Plantão Online: `GET/POST /plantao-online/`, `DELETE /plantao-online/{plantao_id}`, `GET /plantao-online/student`
- IDEB Meta: `GET /ideb-meta/`, `PUT /ideb-meta/`, `POST /ideb-meta/schools`, `DELETE /ideb-meta/schools/{school_id}`
- Avaliações físicas: prefixo `/physical-tests/*` para geração/correção/baixar formulários.
- Lista de frequência: `GET /lista-frequencia/`

---

## Observações finais

- Documento atualizado para refletir endpoints **ativos no backend atual**.
- Prefixo corrigido: usar `GET /subjects` (não `/subject`).
- Endpoints de debug e compatibilidade estão listados para facilitar manutenção e migração.
