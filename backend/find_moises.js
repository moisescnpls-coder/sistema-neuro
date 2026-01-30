const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('sistema_neuro.db');

const sql = `SELECT * FROM patients WHERE firstName LIKE '%Moises%' OR lastName LIKE '%Coutinho%'`;

db.all(sql, [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(JSON.stringify(rows, null, 2));
});
