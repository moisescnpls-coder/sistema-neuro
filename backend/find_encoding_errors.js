const db = require('./db');

const sql = "SELECT * FROM patients WHERE name LIKE '%¥%'";

db.all(sql, [], (err, rows) => {
    if (err) return console.error(err.message);
    console.log("Patients with '¥':");
    console.table(rows);
});
