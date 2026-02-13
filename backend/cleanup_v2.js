const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Cleaning up orphaned records...');

const cleanOrphans = async () => {
    return new Promise((resolve, reject) => {
        // 1. Delete Exams with NULL appointmentId
        const sqlNulls = `DELETE FROM exams WHERE appointmentId IS NULL`;

        db.run(sqlNulls, function (err) {
            if (err) console.error("Error deleting NULLs:", err);
            else console.log(`🗑️ Deleted ${this.changes} exams with NULL appointmentId.`);

            // 2. Delete Exams where appointmentId does not exist in appointments table
            const sqlOrphans = `
                DELETE FROM exams 
                WHERE appointmentId IS NOT NULL 
                AND appointmentId NOT IN (SELECT id FROM appointments)
            `;

            db.run(sqlOrphans, function (err) {
                if (err) console.error("Error deleting orphans:", err);
                else console.log(`🗑️ Deleted ${this.changes} exams pointing to non-existent appointments.`);

                resolve();
            });
        });
    });
};

cleanOrphans().then(() => {
    console.log('✨ Cleanup complete.');
    db.close();
});
