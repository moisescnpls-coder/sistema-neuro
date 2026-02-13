const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Inspecting Exams...');

const sql = `
    SELECT 
        e.id as ExamID, 
        e.status as ExamStatus, 
        e.appointmentId, 
        e.patientId,
        a.id as ApptID, 
        a.status as ApptStatus,
        p.fullName as Patient
    FROM exams e
    LEFT JOIN appointments a ON e.appointmentId = a.id
    LEFT JOIN patients p ON e.patientId = p.id
`;

db.all(sql, [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }

    if (rows.length === 0) {
        console.log("No exams found.");
    } else {
        // Simple console log for portability (no console.table dependency issues on old nodes)
        rows.forEach(r => {
            const isOrphan = !r.ApptID && r.appointmentId;
            const isNullAppt = !r.appointmentId;
            let note = "";
            if (isOrphan) note = "⚠️ ORPHAN (Appt deleted)";
            if (isNullAppt) note = "⚠️ NO APPT ID";

            console.log(`Exam ${r.ExamID} | Status: ${r.ExamStatus} | ApptID: ${r.appointmentId || 'NULL'} (DB: ${r.ApptID || 'NULL'}) | ${note}`);
        });
    }
    db.close();
});
