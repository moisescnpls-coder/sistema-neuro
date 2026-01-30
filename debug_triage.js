const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'backend', 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("--- Checking Triage Table ---");
    db.all("SELECT * FROM triage", (err, rows) => {
        if (err) console.error(err);
        else console.log(checkTypes(rows));
    });

    console.log("\n--- Checking Appointments Table (Limit 5) ---");
    db.all("SELECT id, patientId, date, status FROM appointments ORDER BY id DESC LIMIT 5", (err, rows) => {
        if (err) console.error(err);
        else console.log(checkTypes(rows));
    });

    console.log("\n--- Checking JOIN Query ---");
    const sql = `
        SELECT a.id as ApptID, a.patientId, t.id as TriageID, t.appointmentId as TriageApptID
        FROM appointments a
        LEFT JOIN triage t ON a.id = t.appointmentId
        WHERE t.id IS NOT NULL
    `;
    db.all(sql, (err, rows) => {
        if (err) console.error(err);
        else console.log("Joined Rows:", rows);
    });
});

function checkTypes(rows) {
    if (!rows.length) return "No rows found.";
    return rows.map(r => {
        const simple = { ...r };
        // Add type info for IDs
        if (r.appointmentId) simple.appointmentIdType = typeof r.appointmentId;
        if (r.patientId) simple.patientIdType = typeof r.patientId;
        return simple;
    });
}
