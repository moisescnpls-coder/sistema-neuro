const db = require('./db');

const sqlSearch = "SELECT * FROM patients WHERE firstName LIKE '%;%' OR lastName LIKE '%;%' OR fullName LIKE '%;%'";

db.all(sqlSearch, [], (err, rows) => {
    if (err) return console.error(err.message);
    console.log(`Found ${rows.length} records with ';'. Examples:`);
    rows.slice(0, 5).forEach(r => console.log(`${r.id}: ${r.fullName}`));
});
