const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('sistema_neuro.db');

const targetExamId = 5;
const newPatientId = 13714;

const sql = `UPDATE exams SET patientId = ? WHERE id = ?`;

db.run(sql, [newPatientId, targetExamId], function (err) {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`Updated exam ${targetExamId} to belong to patient ${newPatientId}. Rows affected: ${this.changes}`);
});
