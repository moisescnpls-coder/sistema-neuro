const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('sistema_neuro.db');

const sql = `
    SELECT 
        e.id as examId, 
        e.patientId, 
        e.date,
        p.id as foundPatientId, 
        p.firstName, 
        p.lastName, 
        p.fullName 
    FROM exams e 
    LEFT JOIN patients p ON e.patientId = p.id 
    WHERE p.id IS NULL OR (p.fullName IS NULL AND p.firstName IS NULL)
`;

db.all(sql, [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`Found ${rows.length} problematic exams:`);
    console.log(JSON.stringify(rows, null, 2));
});
