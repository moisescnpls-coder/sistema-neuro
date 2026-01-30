const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log("Connecting to:", dbPath);

db.serialize(() => {
    console.log("--- Latest 3 Triage Records ---");
    db.all("SELECT id, patientId, appointmentId, date, createdBy FROM triage ORDER BY id DESC LIMIT 3", (err, rows) => {
        if (err) console.error(err);
        else console.log(checkTypes(rows));
    });

    console.log("\n--- Latest 3 Appointments ---");
    db.all("SELECT id, patientId, date, status FROM appointments ORDER BY id DESC LIMIT 3", (err, rows) => {
        if (err) console.error(err);
        else console.log(checkTypes(rows));
    });
});

function checkTypes(rows) {
    return rows.map(r => {
        const s = { ...r };
        if (r.patientId !== undefined) s.patientId_Type = typeof r.patientId;
        if (r.appointmentId !== undefined) s.appointmentId_Type = typeof r.appointmentId;
        return s;
    });
}
