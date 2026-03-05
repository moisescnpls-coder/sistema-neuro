# Documentación de Base de Datos - Sistema Neuro

El sistema utiliza **SQLite** como motor de base de datos. El archivo principal se encuentra en `backend/sistema_neuro.db`.

## 📂 Tablas Principales

### `users`
Almacena las credenciales y roles de acceso al sistema.
- **id:** Integer (PK)
- **username:** String (Unique)
- **password:** String (Hashed bcrypt)
- **role:** String ('admin', 'medico', 'recepcion')
- **name:** String

### `patients`
Información demográfica y administrativa de los pacientes.
- **id:** Integer (PK)
- **firstName, lastName:** String
- **dni:** String (Unique)
- **clinicalHistoryNumber:** String (Unique - HC)
- **birthDate, gender, phone, email:** String
- **address, department, province, district:** String

### `appointments`
Registro de citas médicas.
- **id:** Integer (PK)
- **patientId:** Integer (FK -> patients.id)
- **date, time:** String
- **status:** String ('Programado', 'Completado', 'Cancelado')
- **type:** String ('Consulta', 'Control', etc.)
- **referral:** String (Convenio/Referencia)

### `triage`
Registro de signos vitales previos a la consulta.
- **id:** Integer (PK)
- **appointmentId:** Integer (FK -> appointments.id)
- **weight, height:** Float
- **systolic, diastolic:** Integer (Presión Arterial)
- **temperature, heartRate, oxygenSaturation:** Float

### `clinical_evolutions` (Histórico)
Notas de evolución médica de cada consulta.
- **id:** Integer (PK)
- **patientId:** Integer (FK -> patients.id)
- **appointmentId:** Integer (FK -> appointments.id)
- **date:** String
- **subjective:** Text (Subjetivo)
- **objective:** Text (Objetivo)
- **assessment:** Text (Evaluación/Diagnóstico)
- **plan:** Text (Plan de tratamiento)

### `prescriptions`
Recetas médicas generadas.
- **id:** Integer (PK)
- **patientId:** Integer (FK -> patients.id)
- **medications:** JSON (Array de medicamentos)
- **indications:** Text

### `exams`
Solicitudes de exámenes auxiliares.
- **id:** Integer (PK)
- **patientId:** Integer (FK -> patients.id)
- **examName:** String
- **status:** String ('Solicitado', 'Resultados')
- **resultFile:** String (Ruta al archivo PDF/Img)

---

## 💾 Backup y Restauración

### Backup Automático
No hay backup automático configurado nativamente en el código, pero se recomienda copiar el archivo `sistema_neuro.db` diariamente.

### Script de Backup Manual
Se puede crear una copia de seguridad ejecutando:
```bash
cp backend/sistema_neuro.db backend/backups/sistema_neuro_$(date +%F).db
```
*(Requiere carpeta `backend/backups` creada previamente)*.
