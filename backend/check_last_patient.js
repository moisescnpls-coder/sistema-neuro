const sqlite3 = require('sqlite3').verbose();

const dbPath = './sistema_neuro.db';
const db = new sqlite3.Database(dbPath);

console.log('\n=== Verificando ÚLTIMO paciente salvo ===\n');

db.get(`
    SELECT id, clinicalHistoryNumber, firstName, lastName, dni, registrationDate
    FROM patients 
    ORDER BY id DESC 
    LIMIT 1
`, [], (err, row) => {
    if (err) {
        console.error('Error:', err);
        return;
    }

    console.log('ÚLTIMO PACIENTE:');
    console.log('==========================================');
    console.log('ID:', row.id);
    console.log('HC:', row.clinicalHistoryNumber);
    console.log('Nome:', row.firstName, row.lastName);
    console.log('DNI:', row.dni);
    console.log('Data:', row.registrationDate);
    console.log('==========================================');

    db.close();
});
