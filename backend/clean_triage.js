const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log(`Connecting to DB at: ${dbPath}`);

db.serialize(() => {
    // Delete rows where patientId is null to clean up
    db.run("DELETE FROM triage WHERE patientId IS NULL", function (err) {
        if (err) console.error("Error cleaning triage:", err);
        else console.log(`Deleted ${this.changes} bad triage records.`);
    });

    // Verify
    db.all("SELECT * FROM triage", (err, rows) => {
        console.log("Remaining Triage Records:", JSON.stringify(rows));
    });
});
