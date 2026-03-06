const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'backend', 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

let output = "--- Diagnóstico de Base de Datos ---\n";

const checkRecords = (id) => {
    return new Promise((resolve) => {
        const queries = [
            { label: 'Triaje', sql: "SELECT COUNT(*) as count FROM triage WHERE appointmentId = ?" },
            { label: 'Exámenes', sql: "SELECT COUNT(*) as count FROM exams WHERE appointmentId = ?" },
            { label: 'Recetas', sql: "SELECT COUNT(*) as count FROM prescriptions WHERE appointmentId = ?" },
            { label: 'Historia Clínica', sql: "SELECT COUNT(*) as count FROM history WHERE appointmentId = ?" },
            { label: 'Diagnóstico', sql: "SELECT diagnosis FROM appointments WHERE id = ?" }
        ];

        Promise.all(queries.map(q => new Promise((res) => {
            db.get(q.sql, [id], (err, row) => {
                if (err) res({ label: q.label, count: -1, error: err.message });
                else if (q.label === 'Diagnóstico') {
                    res({ label: q.label, count: (row && row.diagnosis && row.diagnosis.trim() !== '') ? 1 : 0 });
                } else {
                    res({ label: q.label, count: row ? row.count : 0 });
                }
            });
        }))).then(resolve);
    });
};

db.all("SELECT id, patientName, date, status FROM appointments ORDER BY id DESC LIMIT 10", [], async (err, rows) => {
    if (err) {
        output += `Error al obtener citas: ${err.message}\n`;
        fs.writeFileSync('db_diagnostic_output.txt', output);
        db.close();
        return;
    }

    output += `\nÚltimas 10 citas:\n`;
    for (const appt of rows) {
        const results = await checkRecords(appt.id);
        const associated = results.filter(r => r.count > 0).map(r => r.label);
        output += `ID: ${appt.id} | Paciente: ${appt.patientName} | Fecha: ${appt.date} | Status: ${appt.status}\n`;
        output += `   -> Asociados encontrados: ${associated.join(', ') || 'Ninguno'}\n`;
        if (associated.length > 0) {
            output += `   [!] ESTA CITA NO DEBERÍA PODER BORRARSE\n`;
        }
    }
    fs.writeFileSync('db_diagnostic_output.txt', output);
    console.log("Diagnóstico completado. Ver db_diagnostic_output.txt");
    db.close();
});
