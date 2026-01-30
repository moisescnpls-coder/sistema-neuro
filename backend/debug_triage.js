const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to DB in same folder
const dbPath = path.resolve(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log(`Connecting to DB at: ${dbPath}`);

db.serialize(() => {
    console.log("--- Checking Triage Table ---");
    db.all("SELECT * FROM triage", (err, rows) => {
        if (err) console.error("Error reading triage:", err);
        else {
            console.log(`Found ${rows.length} triage records.`);
            console.log(JSON.stringify(rows, null, 2));
        }
    });

    console.log("\n--- Checking Appointments Table (Limit 5) ---");
    db.all("SELECT id, patientId, date, status FROM appointments ORDER BY id DESC LIMIT 5", (err, rows) => {
        if (err) console.error("Error reading appointments:", err);
        else console.log(JSON.stringify(rows, null, 2));
    });

    console.log("\n--- Checking JOIN Query ---");
    const sql = `
        SELECT a.id as ApptID, a.patientId, t.id as TriageID, t.appointmentId as TriageApptID
        FROM appointments a
        LEFT JOIN triage t ON a.id = t.appointmentId
        WHERE t.id IS NOT NULL
    `;
    db.all(sql, (err, rows) => {
        if (err) console.error("Error executing join:", err);
        else console.log("Joined Rows (Matches):", rows);
    });
});

function checkTypes(rows) {
    if (!rows || !rows.length) return "No rows found.";
    return rows.map(r => {
        const simple = { ...r };
        // Add type info for IDs
        if (r.appointmentId !== undefined) simple.appointmentIdType = typeof r.appointmentId;
        if (r.patientId !== undefined) simple.patientIdType = typeof r.patientId;
        if (r.id !== undefined) simple.idType = typeof r.id;
        return simple;
    });
}
