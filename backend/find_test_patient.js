const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Buscando pacientes con HC similar a 005601803...\n');

// Search for similar HC numbers
db.all(`SELECT id, firstName, lastName, clinicalHistoryNumber, dni 
        FROM patients 
        WHERE clinicalHistoryNumber LIKE '%5601803%' 
           OR clinicalHistoryNumber LIKE '%005601%'
           OR clinicalHistoryNumber = '5601803'
        ORDER BY id`, [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }

    if (rows.length === 0) {
        console.log('❌ No se encontraron pacientes con HC similar\n');

        // Try to find patients with appointments/history that might be the test patient
        console.log('Buscando pacientes con más registros (posibles pacientes de prueba)...\n');

        db.all(`SELECT p.id, p.firstName, p.lastName, p.clinicalHistoryNumber, p.dni,
                       COUNT(DISTINCT a.id) as appointments,
                       COUNT(DISTINCT h.id) as history,
                       COUNT(DISTINCT pr.id) as prescriptions,
                       COUNT(DISTINCT e.id) as exams,
                       COUNT(DISTINCT t.id) as triage
                FROM patients p
                LEFT JOIN appointments a ON p.id = a.patientId
                LEFT JOIN history h ON p.id = h.patientId
                LEFT JOIN prescriptions pr ON p.id = pr.patientId
                LEFT JOIN exams e ON p.id = e.patientId
                LEFT JOIN triage t ON p.id = t.patientId
                GROUP BY p.id
                HAVING (appointments + history + prescriptions + exams + triage) > 5
                ORDER BY (appointments + history + prescriptions + exams + triage) DESC
                LIMIT 10`, [], (err, patients) => {
            if (err) {
                console.error('Error:', err);
            } else if (patients.length > 0) {
                console.log('Top 10 pacientes con más registros:');
                console.log('='.repeat(100));
                patients.forEach(p => {
                    const total = p.appointments + p.history + p.prescriptions + p.exams + p.triage;
                    console.log(`ID: ${p.id} | HC: ${p.clinicalHistoryNumber || 'N/A'} | ${p.firstName} ${p.lastName}`);
                    console.log(`   📊 Total: ${total} registros (Citas: ${p.appointments}, Hist: ${p.history}, Rx: ${p.prescriptions}, Exam: ${p.exams}, Triaje: ${p.triage})`);
                    console.log('');
                });
            }
            db.close();
        });
    } else {
        console.log(`✅ Encontrados ${rows.length} pacientes con HC similar:`);
        console.log('='.repeat(80));

        rows.forEach(p => {
            const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim();
            console.log(`ID: ${p.id} | HC: ${p.clinicalHistoryNumber || 'N/A'} | DNI: ${p.dni || 'N/A'} | ${fullName}`);
        });

        db.close();
    }
});
