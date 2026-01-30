const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

const permissionsToAdd = [
    { key: 'view_patients', desc: 'Ver Lista de Pacientes' },
    { key: 'create_patient', desc: 'Crear Nuevo Paciente' },
    { key: 'edit_patient', desc: 'Editar Datos del Paciente' },
    { key: 'view_clinical', desc: 'Ver Historial Clínico Completo' }, // Key permission to BLOCK
    { key: 'manage_documents', desc: 'Gestionar Documentos (Subir/Bajar)' }
];

const receptionPermissions = [
    'view_patients',
    'create_patient',
    'edit_patient',
    'manage_documents',
    'delete_appointments', // Allowed as per request (cancel/reschedule usually implies delete or update)
    // 'view_clinical' is OMITTED
];

const medicoPermissions = [
    'view_patients',
    'create_patient',
    'edit_patient',
    'view_clinical', // Medico NEEDS this
    'manage_documents',
    'delete_appointments',
    'edit_clinical',
    'delete_prescriptions',
    'delete_exams',
    'view_reports'
];

db.serialize(() => {
    // 1. Add new permissions
    const insertPerm = db.prepare("INSERT OR IGNORE INTO permissions (key, description) VALUES (?, ?)");
    permissionsToAdd.forEach(p => {
        insertPerm.run(p.key, p.desc, (err) => {
            if (err) console.error(`Error adding perm ${p.key}:`, err.message);
            else console.log(`Added permission: ${p.key}`);
        });
    });
    insertPerm.finalize();

    // 2. Assign to Reception
    const insertRolePerm = db.prepare("INSERT OR IGNORE INTO role_permissions (role, permission_key) VALUES (?, ?)");

    receptionPermissions.forEach(key => {
        insertRolePerm.run('recepcion', key, (err) => {
            if (err) console.error(`Error adding reception perm ${key}:`, err.message);
            else console.log(`Assigned ${key} to recepcion`);
        });
    });

    // 3. Assign to Medico (Ensure they have the new keys)
    medicoPermissions.forEach(key => {
        insertRolePerm.run('medico', key, (err) => {
            if (err) console.error(`Error adding medico perm ${key}:`, err.message);
            else console.log(`Assigned ${key} to medico`);
        });
    });

    insertRolePerm.finalize();
});

db.close(() => console.log('Done updating permissions.'));
