const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Listando todos los pacientes...\n');

db.all('SELECT id, firstName, lastName, clinicalHistoryNumber, dni FROM patients ORDER BY id', [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }

    console.log('Pacientes en la base de datos:');
    console.log('='.repeat(80));

    rows.forEach(p => {
        const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim();
        console.log(`ID: ${p.id.toString().padEnd(5)} | HC: ${(p.clinicalHistoryNumber || 'N/A').padEnd(12)} | DNI: ${(p.dni || 'N/A').padEnd(12)} | ${fullName}`);
    });

    console.log('='.repeat(80));
    console.log(`Total: ${rows.length} pacientes`);

    db.close();
});
