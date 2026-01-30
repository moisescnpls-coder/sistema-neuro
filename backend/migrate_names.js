const db = require('./db');

// Map of username -> full Name
const mapping = {
    'admin': 'Administrador',
    'lkopen': 'LUCRECIA COMPEN KONG'
};

const runUpdates = async () => {
    for (const [username, fullName] of Object.entries(mapping)) {
        console.log(`Updating records for ${username} -> ${fullName}...`);

        // Update appointments table
        db.run(`UPDATE appointments SET createdBy = ? WHERE createdBy = ?`, [fullName, username], function (err) {
            if (err) console.error(`Error updating appointments for ${username}:`, err.message);
            else console.log(`  Appointments updated: ${this.changes}`);
        });

        // Update system_logs table (user column?) check schema first? 
        // Index.js logs: logAction(user, action, details) -> insert into system_logs ... 
        // Let's check system_logs schema or just try update if column exists.
        // Usually it's 'username' column in logs, but user wants 'name'. 
        // If the column is 'username', we shouldn't change it to name if it breaks logic, 
        // but for display purposes if the UI shows 'username' column, we might want to update it 
        // if the column is meant to be displayed.
        // Let's stick to appointments first as that's the user request: "agenda y historial".
    }
};

runUpdates();
