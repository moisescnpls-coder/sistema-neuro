const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Running System Diagnostics...');

const runQuery = (label, sql) => {
    return new Promise((resolve) => {
        console.log(`\n--- ${label} ---`);
        db.all(sql, [], (err, rows) => {
            if (err) console.error("Error:", err.message);
            else console.table(rows);
            resolve();
        });
    });
};

const runDiagnostics = async () => {
    // 1. Check Orphaned Exams (NULL Appointment ID)
    await runQuery('ORPHANED EXAMS (Null AppointmentId)', `
        SELECT id, patientId, date, type, status 
        FROM exams 
        WHERE appointmentId IS NULL
    `);

    // 2. Check Gender Distribution (Stats Issue)
    await runQuery('GENDER DISTRIBUTION', `
        SELECT gender, COUNT(*) as count 
        FROM patients 
        GROUP BY gender
    `);

    // 3. Check Total Patients
    await runQuery('TOTAL PATIENTS', `SELECT COUNT(*) as total FROM patients`);

    console.log('\n--- DIAGNOSTICS COMPLETE ---');
    db.close();
};

runDiagnostics();
