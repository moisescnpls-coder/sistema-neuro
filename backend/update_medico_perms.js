const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

const medicoPermissions = [
    'view_clinical',
    'access_attention',
    'view_reports',
    'view_dashboard_stats',
    'view_doctors',
    'manage_users'
];

db.serialize(() => {
    // 1. Asegurar que el permiso view_doctors existe
    db.run("INSERT OR IGNORE INTO permissions (key, description) VALUES ('view_doctors', 'Ver Módulo de Médicos/Personal')");

    // 2. Insertar los permisos para el rol médico
    const stmt = db.prepare("INSERT OR IGNORE INTO role_permissions (role, permission_key) VALUES (?, ?)");
    medicoPermissions.forEach(perm => {
        stmt.run('medico', perm);
    });
    stmt.finalize();

    console.log("Permisos del médico actualizados correctamente en la base de datos.");
});

db.close();
