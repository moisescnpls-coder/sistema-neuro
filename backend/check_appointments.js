const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('sistema_neuro.db');

console.log('Checking appointments...\n');

db.get("SELECT COUNT(*) as total FROM appointments", [], (err, row) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    console.log(`Total appointments in database: ${row.total}`);
});

db.all("SELECT id, date, time, patientName, status FROM appointments ORDER BY date DESC LIMIT 10", [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }

    console.log('\nRecent appointments:');
    console.table(rows);

    db.close();
});
