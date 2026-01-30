const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

const HC = '171796';

db.serialize(() => {
    // 1. Get Patient ID
    db.get("SELECT id, fullName FROM patients WHERE clinicalHistoryNumber = ?", [HC], (err, patient) => {
        if (err) {
            console.error(err);
            return;
        }
        if (!patient) {
            console.error(`Patient with HC ${HC} not found`);
            return;
        }

        console.log(`Found Patient: ${patient.fullName} (ID: ${patient.id})`);

        // 2. Find Orphaned Triage Records
        // Triage has appointmentId, but that ID is NOT in appointments table
        const sql = `
            SELECT t.id, t.date, t.appointmentId 
            FROM triage t 
            WHERE t.patientId = ? 
            AND t.appointmentId IS NOT NULL
            AND t.appointmentId NOT IN (SELECT id FROM appointments)
        `;

        db.all(sql, [patient.id], (err, rows) => {
            if (err) {
                console.error(err);
                return;
            }

            if (rows.length === 0) {
                console.log("No orphaned triage records found.");
                return;
            }

            console.log(`Found ${rows.length} orphaned triage records to delete:`);
            rows.forEach(r => console.log(` - Triage ID: ${r.id}, Date: ${r.date}, Missing ApptID: ${r.appointmentId}`));

            // 3. Delete them
            const idsToDelete = rows.map(r => r.id).join(',');
            db.run(`DELETE FROM triage WHERE id IN (${idsToDelete})`, function (err) {
                if (err) console.error("Error deleting:", err);
                else console.log(`Successfully deleted ${this.changes} records.`);
            });
        });
    });
});
