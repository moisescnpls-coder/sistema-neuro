const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

const searchDoc = '005601803';

console.log(`🔍 Investigación completa del paciente con documento: ${searchDoc}\n`);

db.get("SELECT * FROM patients WHERE dni = ? OR dni = ?", [searchDoc, searchDoc.replace(/^0+/, '')], (err, patient) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }

    if (!patient) {
        console.log(`❌ No se encontró paciente con documento ${searchDoc}`);
        db.close();
        return;
    }

    console.log('✅ PACIENTE ENCONTRADO:');
    console.log('='.repeat(80));
    console.log(`   ID: ${patient.id}`);
    console.log(`   Nombre: ${patient.firstName || ''} ${patient.lastName || ''}`);
    console.log(`   Tipo Doc: ${patient.documentType || 'N/A'}`);
    console.log(`   Documento: ${patient.dni}`);
    console.log(`   HC: ${patient.clinicalHistoryNumber || 'N/A'}`);
    console.log('='.repeat(80));

    const pid = patient.id;

    Promise.all([
        new Promise((resolve) => {
            db.all("SELECT COUNT(*) as count FROM history WHERE patientId = ?", [pid], (err, rows) => {
                resolve({ table: 'history', count: rows[0]?.count || 0 });
            });
        }),
        new Promise((resolve) => {
            db.all("SELECT COUNT(*) as count FROM appointments WHERE patientId = ?", [pid], (err, rows) => {
                resolve({ table: 'appointments', count: rows[0]?.count || 0 });
            });
        }),
        new Promise((resolve) => {
            db.all("SELECT COUNT(*) as count FROM prescriptions WHERE patientId = ?", [pid], (err, rows) => {
                resolve({ table: 'prescriptions', count: rows[0]?.count || 0 });
            });
        }),
        new Promise((resolve) => {
            db.all("SELECT COUNT(*) as count FROM exams WHERE patientId = ?", [pid], (err, rows) => {
                resolve({ table: 'exams', count: rows[0]?.count || 0 });
            });
        }),
        new Promise((resolve) => {
            db.all("SELECT COUNT(*) as count FROM triage WHERE patientId = ?", [pid], (err, rows) => {
                resolve({ table: 'triage', count: rows[0]?.count || 0 });
            });
        })
    ]).then(results => {
        console.log('\n📊 CONTEO DE REGISTROS:');
        console.log('─'.repeat(80));

        let total = 0;
        results.forEach(r => {
            console.log(`   ${r.table.padEnd(20)}: ${r.count} registro(s)`);
            total += r.count;
        });

        console.log('─'.repeat(80));
        console.log(`   TOTAL: ${total} registro(s)\n`);

        if (total === 0) {
            console.log('❌ CONFIRMADO: No hay registros en la base de datos para este paciente');
            console.log('   Los datos se perdieron o nunca existieron.\n');
        } else {
            console.log('✅ Hay registros en la base de datos');
            console.log('   El problema es de visualización en el frontend.\n');

            // Show sample data
            db.all("SELECT * FROM appointments WHERE patientId = ? LIMIT 3", [pid], (err, appts) => {
                if (appts && appts.length > 0) {
                    console.log('Ejemplo de citas:');
                    appts.forEach(a => console.log(`   - ${a.date} ${a.time} | ${a.status}`));
                }
                db.close();
            });
        }
    });
});
