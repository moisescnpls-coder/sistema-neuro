const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking for orphaned records (Exams, Prescriptions, Triage)...');

const cleanTable = (tableName, label) => {
    return new Promise((resolve, reject) => {
        const findSql = `
            SELECT id FROM ${tableName} 
            WHERE appointmentId IS NOT NULL 
            AND appointmentId NOT IN (SELECT id FROM appointments)
        `;

        db.all(findSql, [], (err, rows) => {
            if (err) return reject(err);

            if (rows.length === 0) {
                console.log(`✅ No orphaned ${label} found.`);
                return resolve(0);
            }

            console.log(`⚠️ Found ${rows.length} orphaned ${label}. Deleting...`);

            const ids = rows.map(r => r.id).join(',');
            const deleteSql = `DELETE FROM ${tableName} WHERE id IN (${ids})`;

            db.run(deleteSql, function (err) {
                if (err) return reject(err);
                console.log(`🗑️ Deleted ${this.changes} orphaned ${label}.`);
                resolve(this.changes);
            });
        });
    });
};

const runCleanup = async () => {
    try {
        await cleanTable('exams', 'EXAMS');
        await cleanTable('prescriptions', 'PRESCRIPTIONS');
        await cleanTable('triage', 'TRIAGE');
        await cleanTable('history', 'HISTORY');

        console.log('\n✨ Cleanup complete.');
    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
    } finally {
        db.close();
    }
};

runCleanup();
