const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('sistema_neuro.db');

const sql = `SELECT patientName FROM appointments WHERE patientId = 1 LIMIT 1`;

db.get(sql, [], (err, row) => {
    if (err) {
        console.error(err);
        return;
    }
    if (row) {
        console.log(`Found name in appointments: ${row.patientName}`);
    } else {
        console.log('No appointment found for this patient ID.');
    }
});
