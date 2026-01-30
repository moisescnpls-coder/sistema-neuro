const db = require('./db');

// Check and update statuses
const statusesToMigrate = ['Atendida', 'Atendido', 'Completado', 'Completada', 'Finalizado', 'Realizada']; // All possible variations
const targetStatus = 'Realizado';

db.all("SELECT id, status FROM appointments WHERE status IN (?, ?, ?, ?, ?, ?)", statusesToMigrate, (err, rows) => {
    if (err) {
        console.error("Error finding appointments:", err.message);
        return;
    }

    console.log(`Found ${rows.length} appointments to migrate.`);

    if (rows.length > 0) {
        const ids = rows.map(r => r.id);
        const placeholders = ids.map(() => '?').join(',');

        db.run(`UPDATE appointments SET status = ? WHERE id IN (${placeholders})`, [targetStatus, ...ids], function (err) {
            if (err) {
                console.error("Error updating appointments:", err.message);
            } else {
                console.log(`Successfully migrated ${this.changes} appointments to '${targetStatus}'.`);
            }
        });
    } else {
        console.log("No appointments needing migration found.");
    }
});
