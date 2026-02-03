const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Crear el nuevo permiso
    db.run("INSERT OR IGNORE INTO permissions (key, description) VALUES ('view_agenda_patients', 'Ver Agenda y Listado de Pacientes')");

    // 2. Asignarlo a Medico y Recepcion
    db.run("INSERT OR IGNORE INTO role_permissions (role, permission_key) VALUES ('medico', 'view_agenda_patients')");
    db.run("INSERT OR IGNORE INTO role_permissions (role, permission_key) VALUES ('recepcion', 'view_agenda_patients')");
    db.run("INSERT OR IGNORE INTO role_permissions (role, permission_key) VALUES ('admin', 'view_agenda_patients')");

    console.log("Migración de permisos compartidos (Agenda/Pacientes) completada.");
});

db.close();
