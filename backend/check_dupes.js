const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('sistema_neuro.db');

console.log('Searching for duplicate patients...\n');

const sql = `SELECT * FROM patients WHERE firstName LIKE '%Amaya%' OR lastName LIKE '%Amaya%' OR clinicalHistoryNumber = '6627'`;

db.all(sql, [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    console.log(`Found ${rows.length} records:`);
    console.log(JSON.stringify(rows, null, 2));
});
