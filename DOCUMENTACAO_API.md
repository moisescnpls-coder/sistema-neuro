# Documentação da API - Sistema Neuro

Esta documentação lista todos os endpoints disponíveis na API do backend do Sistema Neuro.

## Autenticação

| Método | Endpoint | Descrição | Permissão |
|---|---|---|---|
| `POST` | `/api/login` | Realiza login e retorna token JWT | Pública |

## Estatísticas e Dashboard

| Método | Endpoint | Descrição | Permissão |
|---|---|---|---|
| `GET` | `/api/stats` | Obtém estatísticas rápidas (pacientes, hoje, etc) | `view_dashboard_stats` ou Admin |
| `GET` | `/api/dashboard/analytics` | Obtém dados analíticos completos com filtros | `view_reports` ou Admin |

## Usuários e Permissões

| Método | Endpoint | Descrição | Permissão |
|---|---|---|---|
| `GET` | `/api/users` | Lista todos os usuários | Admin ou Médico |
| `POST` | `/api/users` | Cria um novo usuário | Admin ou Médico |
| `PUT` | `/api/users/:id` | Atualiza um usuário existente | Admin ou Médico |
| `DELETE` | `/api/users/:id` | Remove um usuário | Admin ou Médico |
| `GET` | `/api/permissions` | Lista todas as permissões e permissões por papel | Autenticado |
| `POST` | `/api/permissions` | Adiciona ou remove permissão de um papel | Admin |

## Pacientes

| Método | Endpoint | Descrição | Permissão |
|---|---|---|---|
| `GET` | `/api/patients` | Lista todos os pacientes | Autenticado |
| `POST` | `/api/patients` | Cria um novo paciente | Autenticado |
| `PUT` | `/api/patients/:id` | Atualiza dados do paciente | Autenticado |
| `DELETE` | `/api/patients/:id` | Remove um paciente (se não houver dependências) | Autenticado |
| `GET` | `/api/patients/:id/triage` | Obtém histórico de triagem do paciente | Autenticado |

## Agendamentos (Citas)

| Método | Endpoint | Descrição | Permissão |
|---|---|---|---|
| `GET` | `/api/appointments` | Lista todos os agendamentos | Autenticado |
| `POST` | `/api/appointments` | Cria um novo agendamento | Autenticado |
| `PUT` | `/api/appointments/:id` | Atualiza um agendamento | Autenticado |
| `DELETE` | `/api/appointments/:id` | Cancela/Remove um agendamento | `delete_appointments` ou `delete_history_appointments` |
| `GET` | `/api/appointments/:id/full-details` | Obtém detalhes completos (Atendimento) | Autenticado |
| `GET` | `/api/referrals` | Lista referências/convênios únicos para autocomplete | Autenticado |

## Triagem

| Método | Endpoint | Descrição | Permissão |
|---|---|---|---|
| `POST` | `/api/triage` | Registra nova triagem | Autenticado |
| `PUT` | `/api/triage/:id` | Atualiza registro de triagem | Autenticado |

## Histórico Clínico (Evoluções)

| Método | Endpoint | Descrição | Permissão |
|---|---|---|---|
| `GET` | `/api/history/:patientId` | Obtém histórico clínico do paciente | Autenticado |
| `POST` | `/api/history` | Adiciona nova evolução | Autenticado |
| `PUT` | `/api/history/:id` | Edita uma evolução | Admin ou Médico |
| `DELETE` | `/api/history/:id` | Remove uma evolução | Admin ou Médico |

## Receitas Médicas

| Método | Endpoint | Descrição | Permissão |
|---|---|---|---|
| `GET` | `/api/prescriptions/:patientId` | Obtém receitas do paciente | Autenticado |
| `POST` | `/api/prescriptions` | Cria nova receita | Autenticado |
| `PUT` | `/api/prescriptions/:id` | Edita uma receita | `edit_clinical` ou Admin |
| `DELETE` | `/api/prescriptions/:id` | Remove uma receita | `delete_prescriptions` ou Admin |

## Exames

| Método | Endpoint | Descrição | Permissão |
|---|---|---|---|
| `GET` | `/api/exams/:patientId` | Obtém exames solicitados do paciente | Autenticado |
| `POST` | `/api/exams` | Solicita novo exame | Autenticado |
| `PUT` | `/api/exams/:id` | Edita solicitação de exame | `edit_clinical` ou Admin |
| `DELETE` | `/api/exams/:id` | Remove solicitação de exame | `delete_exams` ou Admin |
| `POST` | `/api/exams/:id/upload` | Sobe arquivo de resultado de exame | Autenticado |
| `DELETE` | `/api/exams/results/:id` | Remove arquivo de resultado (anexo) | `edit_clinical` ou Admin |

## Médicos / Pessoal

| Método | Endpoint | Descrição | Permissão |
|---|---|---|---|
| `GET` | `/api/doctors` | Lista médicos cadastrados | Pública (ou autenticada dependendo do contexto) |
| `POST` | `/api/doctors` | Cadastra novo médico (com foto) | Autenticado |
| `PUT` | `/api/doctors/:id` | Atualiza dados do médico (com foto) | Autenticado |
| `DELETE` | `/api/doctors/:id` | Remove cadastro de médico | Autenticado |

## Relatórios

| Método | Endpoint | Descrição | Permissão |
|---|---|---|---|
| `GET` | `/api/reports/patients` | Relatório de pacientes com filtros | `view_reports` ou Admin |
| `GET` | `/api/reports/appointments` | Relatório de agendamentos com filtros | `view_reports` ou Admin |
| `GET` | `/api/reports/exams` | Relatório de exames com filtros | `view_reports` ou Admin |

## Configurações e Sistema

| Método | Endpoint | Descrição | Permissão |
|---|---|---|---|
| `GET` | `/api/settings` | Obtém configurações da empresa | Pública/Autenticado |
| `POST` | `/api/settings` | Atualiza configurações da empresa (logo, etc) | Admin |
| `POST` | `/api/backup` | Gera backup manual do banco de dados | `manage_backup` ou Admin |
| `POST` | `/api/admin/cleanup` | Executa limpeza manual de logs antigos | Admin |
| `GET` | `/api/logs` | Consulta logs do sistema | `view_logs` ou Admin |

## Observações Gerais
- Todos os endpoints (exceto `/api/login` e alguns GET públicos) exigem o cabeçalho `Authorization: Bearer <token>`.
- O upload de arquivos utiliza `multipart/form-data`.
