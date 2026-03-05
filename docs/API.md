# Referencia de API - Sistema Neuro

Esta documentación lista todos los endpoints disponibles en el backend del Sistema Neuro (`/api`).

## 🔐 Autenticación

Todos los endpoints (excepto `/api/login` y `/api/health`) requieren el header `Authorization`:
```http
Authorization: Bearer <tu_token_jwt>
```

| Método | Endpoint | Descripción | Permisos Requeridos |
|---|---|---|---|
| `POST` | `/api/login` | Inicia sesión y obtiene token JWT. | Público |

---

## 💓 Monitoreo y Salud

| Método | Endpoint | Descripción | Permisos Requeridos |
|---|---|---|---|
| `GET` | `/api/health` | Verifica si el servidor está activo (`uptime-ok`). | Público |

---

## 📊 Dashboard y Estadísticas

| Método | Endpoint | Descripción | Permisos Requeridos |
|---|---|---|---|
| `GET` | `/api/stats` | Resumen rápido (total pacientes, citas hoy). | `view_dashboard_stats` o Admin |
| `GET` | `/api/dashboard/analytics` | Datos analíticos completos con filtros. | `view_reports` o Admin |

---

## 👥 Usuarios y Permisos

| Método | Endpoint | Descripción | Permisos Requeridos |
|---|---|---|---|
| `GET` | `/api/users` | Lista todos los usuarios. | Admin o Médico |
| `POST` | `/api/users` | Crea un nuevo usuario. | Admin o Médico |
| `PUT` | `/api/users/:id` | Actualiza un usuario. | Admin o Médico |
| `DELETE` | `/api/users/:id` | Elimina un usuario. | Admin o Médico |
| `GET` | `/api/permissions` | Lista permisos y roles. | Autenticado |
| `POST` | `/api/permissions` | Asigna/Quita permisos a roles. | Admin |

---

## 🏥 Pacientes

| Método | Endpoint | Descripción | Permisos Requeridos |
|---|---|---|---|
| `GET` | `/api/patients` | Lista todos los pacientes. | Autenticado |
| `POST` | `/api/patients` | Crea nuevo paciente. | Autenticado |
| `PUT` | `/api/patients/:id` | Actualiza datos del paciente. | Autenticado |
| `DELETE` | `/api/patients/:id` | Elimina paciente (si no tiene historial). | Autenticado |
| `GET` | `/api/patients/:id/triage` | Historial de triaje del paciente. | Autenticado |

---

## 📅 Citas (Agendamientos)

| Método | Endpoint | Descripción | Permisos Requeridos |
|---|---|---|---|
| `GET` | `/api/appointments` | Lista todas las citas. | Autenticado |
| `POST` | `/api/appointments` | Crea nueva cita. | Autenticado |
| `PUT` | `/api/appointments/:id` | Actualiza cita. | Autenticado |
| `DELETE` | `/api/appointments/:id` | Cancela/Elimina cita. | `delete_appointments` |
| `GET` | `/api/referrals` | Autocompletado de convenios/referencias. | Autenticado |

---

## 🩺 Triaje y Evoluciones

| Método | Endpoint | Descripción | Permisos Requeridos |
|---|---|---|---|
| `POST` | `/api/triage` | Registra signos vitales. | Autenticado |
| `PUT` | `/api/triage/:id` | Edita signos vitales. | Autenticado |
| `GET` | `/api/history/:patientId` | Obtiene historia clínica completa. | Autenticado |
| `POST` | `/api/history` | Agrega nueva evolución clínica. | Autenticado |

---

## 💊 Recetas y Exámenes

| Método | Endpoint | Descripción | Permisos Requeridos |
|---|---|---|---|
| `GET` | `/api/prescriptions/:patientId` | Lista recetas del paciente. | Autenticado |
| `POST` | `/api/prescriptions` | Prepara nueva receta. | Autenticado |
| `GET` | `/api/exams/:patientId` | Lista exámenes solicitados. | Autenticado |
| `POST` | `/api/exams` | Solicita nuevo examen. | Autenticado |
| `POST` | `/api/exams/:id/upload` | Sube archivo PDF/Img de resultado. | Autenticado |

---

## ⚙️ Sistema y Configuración

| Método | Endpoint | Descripción | Permisos Requeridos |
|---|---|---|---|
| `GET` | `/api/settings` | Obtiene configuración (Logo, Empresa). | Autenticado |
| `POST` | `/api/settings` | Actualiza configuración global. | Admin |
| `POST` | `/api/backup` | Fuerza backup de base de datos. | `manage_backup` o Admin |
| `GET` | `/api/logs` | Consulta logs de auditoría. | `view_logs` o Admin |
