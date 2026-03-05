# Datos Históricos y Migración - Sistema Neuro

Este documento recopila las instrucciones para migraciones realizadas anteriormente, útil como referencia histórica.

---

## 🗄️ Importación de Datos DBF (Sistema Legacy)

Instrucciones para importar datos desde el sistema antiguo basado en tablas DBF (Visual FoxPro / Clipper).

### Archivos Requeridos
Colocar los archivos `.DBF` (y sus `.FPT/.CDX`) en la carpeta `backend/data/dbf/`.
- `PACIENTE.DBF`
- `CITA.DBF` (o equivalente)

### Comando de Importación
Ejecutar el script de Node.js diseñado para leer e insertar estos registros en SQLite:

```bash
node backend/importar_dbf.js
```
*Nota: Este script debe adaptarse si cambia la estructura de las tablas DBF.*

---

## 🖥️ Migración a Windows 11 (Febrero 2026)

Pasos realizados para migrar el sistema de la computadora antigua a la nueva con Windows 11.

1.  **Respaldo:** Se copió toda la carpeta `Sistema Neuro` y la base de datos `sistema_neuro.db`.
2.  **Instalación:** Se instaló Node.js v20 y Git en la nueva máquina.
3.  **Restauración:**
    - Se colocó la carpeta en el Escritorio.
    - Se ejecutó `npm install` para regenerar `node_modules`.
    - Se restauró el archivo `.env`.
4.  **Verificación:** Se probó el inicio con `npm run dev`.

---

## 🔄 Migración de Local a VPS (Enero/Febrero 2026)

El sistema pasó de ser exclusivamente local a tener una réplica en la nube (`app.moiseslab.shop`).
- Los datos **no se sincronizan en tiempo real** automáticamente.
- El VPS se utiliza principalmente para consulta remota y backup off-site.
- La base de datos local es la "fuente de la verdad" principal.
