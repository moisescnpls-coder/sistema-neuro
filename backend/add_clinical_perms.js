const db = require('./db');

const newPermissions = [
    { key: 'delete_prescriptions', desc: 'Eliminar Recetas Médicas' },
    { key: 'delete_exams', desc: 'Eliminar Solicitudes de Examen' },
    { key: 'edit_clinical', desc: 'Editar Estado/Notas de Examenes' }
];

db.serialize(() => {
    const insertPerm = db.prepare("INSERT OR IGNORE INTO permissions (key, description) VALUES (?, ?)");
    const insertRolePerm = db.prepare("INSERT OR IGNORE INTO role_permissions (role, permission_key) VALUES (?, ?)");

    newPermissions.forEach(p => {
        insertPerm.run(p.key, p.desc);
        console.log(`Added permission: ${p.key}`);

        // Grant to admin by default
        insertRolePerm.run('admin', p.key);
        console.log(`Granted ${p.key} to admin`);
    });

    insertPerm.finalize();
    insertRolePerm.finalize();
});
