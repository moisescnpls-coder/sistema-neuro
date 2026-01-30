const sqlite3 = require('sqlite3').verbose();

const dbPath = './sistema_neuro.db';
const db = new sqlite3.Database(dbPath);

console.log('\n=== Verificando últimos pacientes e HCs ===\n');

db.all(`
    SELECT id, clinicalHistoryNumber, firstName, lastName, registrationDate
    FROM patients 
    ORDER BY id DESC 
    LIMIT 10
`, [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
        return;
    }

    console.log('Últimos 10 pacientes:');
    console.log('==========================================');
    rows.forEach(row => {
        console.log(`ID: ${row.id} | HC: ${row.clinicalHistoryNumber} | Nome: ${row.firstName} ${row.lastName} | Data: ${row.registrationDate}`);
    });

    db.close();
});
