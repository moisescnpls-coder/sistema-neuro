const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log('Running manual permission migration...');

db.serialize(() => {
    // 1. Ensure permissions exist in the permissions table
    const perms = [
        { key: 'view_clinical', desc: 'Ver Módulo Clínico (Resumen)' },
        { key: 'access_attention', desc: 'Acceso a Atención Clínica (Evolución/Recetas)' }
    ];

    const stmt = db.prepare("INSERT OR IGNORE INTO permissions (key, description) VALUES (?, ?)");
    perms.forEach(p => stmt.run(p.key, p.desc));
    stmt.finalize();

    // 2. Assign to Admin and Medico
    const rolePerms = [
        { role: 'admin', key: 'view_clinical' },
        { role: 'admin', key: 'access_attention' },
        { role: 'medico', key: 'view_clinical' },
        { role: 'medico', key: 'access_attention' }
    ];

    const stmt2 = db.prepare("INSERT OR IGNORE INTO role_permissions (role, permission_key) VALUES (?, ?)");
    rolePerms.forEach(rp => stmt2.run(rp.role, rp.key));
    stmt2.finalize();

    console.log('Migration finished successfully.');
    db.close();
});
