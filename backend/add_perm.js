const db = require('./db');

const addPermission = () => {
    const permKey = 'delete_history_appointments';
    const permDesc = 'Eliminar Citas Finalizadas (Canceladas/Completadas)';

    db.serialize(() => {
        db.run("INSERT OR IGNORE INTO permissions (key, description) VALUES (?, ?)", [permKey, permDesc], (err) => {
            if (err) console.error("Error inserting permission:", err);
            else console.log("Permission inserted/exists.");
        });

        // Assign to admin by default
        db.run("INSERT OR IGNORE INTO role_permissions (role, permission_key) VALUES ('admin', ?)", [permKey], (err) => {
            if (err) console.error("Error creating role assignment:", err);
            else console.log("Role assignment created.");
        });
    });
};

addPermission();
