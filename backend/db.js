const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Criar ou abrir o banco de dados
const dbPath = path.resolve(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados SQLite:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

// Inicializar tabelas
db.serialize(() => {
    // Tabela de Pacientes
    db.run(`CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT,
        lastName TEXT,
        fullName TEXT,
        dni TEXT,
        phone TEXT,
        email TEXT,
        birthDate TEXT,
        gender TEXT,
        clinicalSummary TEXT,
        clinicalHistoryNumber TEXT,
        maritalStatus TEXT,
        documentType TEXT,
        registrationDate TEXT,
        address TEXT,
        department TEXT,
        province TEXT,
        district TEXT
    )`, (err) => {
        if (err) {
            console.error(err.message);
        } else {
            // Migration: Attempt to add columns if they don't exist (ignoring "duplicate column" errors)
            const columnsToAdd = [
                "ALTER TABLE patients ADD COLUMN fullName TEXT",
                "ALTER TABLE patients ADD COLUMN clinicalHistoryNumber TEXT",
                "ALTER TABLE patients ADD COLUMN maritalStatus TEXT",
                "ALTER TABLE patients ADD COLUMN documentType TEXT",
                "ALTER TABLE patients ADD COLUMN registrationDate TEXT",
                "ALTER TABLE patients ADD COLUMN address TEXT",
                "ALTER TABLE patients ADD COLUMN department TEXT",
                "ALTER TABLE patients ADD COLUMN province TEXT",
                "ALTER TABLE patients ADD COLUMN district TEXT",
                "ALTER TABLE patients ADD COLUMN diagnosis TEXT"
            ];

            columnsToAdd.forEach(sql => {
                db.run(sql, (err) => {
                    // Ignore error if column already exists
                    if (err && !err.message.includes("duplicate column")) {
                        console.error("Migration warning:", err.message);
                    }
                });
            });
        }
    });

    // Tabela de Agendamentos
    db.run(`CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patientId INTEGER,
        patientName TEXT,
        date TEXT,
        time TEXT,
        type TEXT,
        notes TEXT,
        status TEXT,
        history TEXT,
        createdBy TEXT,
        createdAt TEXT,
        FOREIGN KEY(patientId) REFERENCES patients(id)
    )`, (err) => {
        if (!err) {
            // Migration: Add createdBy column if it doesn't exist
            db.run("ALTER TABLE appointments ADD COLUMN createdBy TEXT", (err) => {
                if (err && !err.message.includes("duplicate column")) {
                    // console.error("Migration warning (appointments createdBy):", err.message);
                }
            });
            // Migration: Add createdAt column if it doesn't exist
            db.run("ALTER TABLE appointments ADD COLUMN createdAt TEXT", (err) => {
                if (err && !err.message.includes("duplicate column")) {
                    // console.error("Migration warning (appointments createdAt):", err.message);
                }
            });
            // Migration: Add referral column if it doesn't exist
            db.run("ALTER TABLE appointments ADD COLUMN referral TEXT", (err) => {
                if (err && !err.message.includes("duplicate column")) {
                    // console.error("Migration warning (appointments referral):", err.message);
                }
            });
        }
    });

    // Tabela de Histórico Clínico
    db.run(`CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patientId INTEGER,
        date TEXT,
        type TEXT,
        notes TEXT,
        FOREIGN KEY(patientId) REFERENCES patients(id)
    )`);

    // Tabela de Usuários (Login)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        name TEXT,
        role TEXT
    )`, (err) => {
        if (!err) {
            // Criar usuário admin padrão se não existir ou atualizar se a senha for "admin123" (migração)
            db.get("SELECT * FROM users WHERE username = ?", ["admin"], (err, row) => {
                const adminPass = "admin123";
                const hashedAdminPass = bcrypt.hashSync(adminPass, 10);

                if (!row) {
                    db.run(`INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`,
                        ["admin", hashedAdminPass, "Administrador", "admin"],
                        (err) => {
                            if (!err) console.log("Usuário 'admin' criado com sucesso.");
                        }
                    );
                } else if (row.password === "admin123") {
                    // Migrar senha antiga para hash
                    db.run("UPDATE users SET password = ? WHERE id = ?", [hashedAdminPass, row.id], (err) => {
                        if (!err) console.log("Senha do usuário 'admin' atualizada para hash seguro.");
                    });
                }
            });
        }
    });


    // Tabela de Configurações (Empresa)
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        ruc TEXT,
        razonSocial TEXT,
        nombreComercial TEXT,
        celular TEXT,
        telefono TEXT,
        correo TEXT,
        direccion TEXT,
        logoUrl TEXT
    )`, (err) => {
        if (!err) {
            db.run("INSERT OR IGNORE INTO settings (id, razonSocial, nombreComercial) VALUES (1, 'Neurocenter Bolivar', 'Neurocenter Bolivar')");
            // Update existing if default empty (optional, but requested by user to change it)
            db.get("SELECT nombreComercial FROM settings WHERE id = 1", (err, row) => {
                if (row && !row.nombreComercial) {
                    db.run("UPDATE settings SET razonSocial = 'Neurocenter Bolivar', nombreComercial = 'Neurocenter Bolivar' WHERE id = 1");
                }
            });
        }
    });

    // Tabela de Médicos/Personal
    db.run(`CREATE TABLE IF NOT EXISTS doctors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT NOT NULL,
        specialty TEXT,
        cmp TEXT,
        phone TEXT,
        email TEXT,
        photoUrl TEXT,
        bio TEXT,
        status TEXT DEFAULT 'active'
    )`)

    // Tabela de System Logs
    db.run(`CREATE TABLE IF NOT EXISTS system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        username TEXT,
        action TEXT,
        details TEXT,
        timestamp TEXT
    )`);

    // --- Permisos Dinamicos ---
    db.run(`CREATE TABLE IF NOT EXISTS permissions (
        key TEXT PRIMARY KEY,
        description TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS role_permissions (
        role TEXT,
        permission_key TEXT,
        PRIMARY KEY (role, permission_key),
        FOREIGN KEY(permission_key) REFERENCES permissions(key)
    )`, (err) => {
        // Tabela de Triaje
        db.run(`CREATE TABLE IF NOT EXISTS triage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patientId INTEGER,
        appointmentId INTEGER,
        date TEXT,
        weight REAL,
        height REAL,
        temperature REAL,
        systolic INTEGER,
        diastolic INTEGER,
        heartRate INTEGER,
        oxygenSaturation INTEGER,
        notes TEXT,
        createdBy TEXT,
        createdAt TEXT,
        FOREIGN KEY(patientId) REFERENCES patients(id)
    )`);
        if (!err) {
            // Seed Default Permissions
            const defaultPermissions = [
                { key: 'manage_users', desc: 'Gestionar Usuarios (Crear/Editar/Eliminar)' },
                { key: 'delete_patients', desc: 'Eliminar Pacientes' },
                { key: 'delete_appointments', desc: 'Eliminar/Cancelar Citas' },
                { key: 'delete_history_appointments', desc: 'Eliminar Citas Finalizadas' },
                { key: 'manage_permissions', desc: 'Gestionar Permisos del Sistema' },
                { key: 'manage_backup', desc: 'Realizar Respaldo de Base de Datos' },
                { key: 'view_logs', desc: 'Ver Logs de Auditoría' },
                { key: 'view_dashboard_stats', desc: 'Ver Estadísticas del Dashboard' },
                { key: 'view_reports', desc: 'Ver Reportes y Estadísticas' },
                // Clinical Module
                { key: 'view_clinical', desc: 'Ver Módulo Clínico (Resumen)' },
                { key: 'access_attention', desc: 'Acceso a Atención Clínica (Evolución/Recetas)' },
                { key: 'delete_prescriptions', desc: 'Eliminar Recetas Médicas' },
                { key: 'delete_exams', desc: 'Eliminar Solicitudes de Examen' },
                { key: 'edit_clinical', desc: 'Editar Estado/Notas de Examenes' }
            ];

            const insertPerm = db.prepare("INSERT OR IGNORE INTO permissions (key, description) VALUES (?, ?)");
            defaultPermissions.forEach(p => insertPerm.run(p.key, p.desc));
            insertPerm.finalize();

            // Seed Default Role Assignments
            const insertRolePerm = db.prepare("INSERT OR IGNORE INTO role_permissions (role, permission_key) VALUES (?, ?)");
            // Admin gets all
            defaultPermissions.forEach(p => insertRolePerm.run('admin', p.key));
            // Medico
            insertRolePerm.run('medico', 'view_clinical');
            insertRolePerm.run('medico', 'access_attention');
            insertRolePerm.run('medico', 'view_reports');

            insertRolePerm.finalize();
        }
    });

    // --- Modulo Clinico ---

    // Tabela de Recetas
    db.run(`CREATE TABLE IF NOT EXISTS prescriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patientId INTEGER,
        doctorName TEXT,
        date TEXT,
        medications TEXT,
        instructions TEXT,
        FOREIGN KEY(patientId) REFERENCES patients(id)
    )`, (err) => {
        if (!err) {
            // Migration: Add prescriptionDate column
            db.run("ALTER TABLE prescriptions ADD COLUMN prescriptionDate TEXT", (err) => {
                if (err && !err.message.includes("duplicate column")) {
                    // console.error("Migration warning:", err.message);
                }
            });
            // Migration: Add createdBy column
            db.run("ALTER TABLE prescriptions ADD COLUMN createdBy TEXT", (err) => {
                if (err && !err.message.includes("duplicate column")) {
                    // console.error("Migration warning:", err.message);
                }
            });
            // Migration: Add createdAt column
            db.run("ALTER TABLE prescriptions ADD COLUMN createdAt TEXT", (err) => {
                if (err && !err.message.includes("duplicate column")) {
                    // console.error("Migration warning:", err.message);
                }
            });
        }
    });

    // Tabela de Examenes (Solicitudes)
    db.run(`CREATE TABLE IF NOT EXISTS exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patientId INTEGER,
        doctorName TEXT,
        date TEXT,
        type TEXT,
        status TEXT, -- 'Solicitado', 'Resultados Listos'
        reason TEXT,
        FOREIGN KEY(patientId) REFERENCES patients(id)
    )`, (err) => {
        if (!err) {
            // Migration: Add examDate column
            db.run("ALTER TABLE exams ADD COLUMN examDate TEXT", (err) => {
                if (err && !err.message.includes("duplicate column")) {
                    // console.error("Migration warning:", err.message);
                }
            });
            // Migration: Add createdBy column
            db.run("ALTER TABLE exams ADD COLUMN createdBy TEXT", (err) => {
                if (err && !err.message.includes("duplicate column")) {
                    // console.error("Migration warning:", err.message);
                }
            });
            // Migration: Add createdAt column
            db.run("ALTER TABLE exams ADD COLUMN createdAt TEXT", (err) => {
                if (err && !err.message.includes("duplicate column")) {
                    // console.error("Migration warning:", err.message);
                }
            });
            // Migration: Add appointmentId column
            db.run("ALTER TABLE exams ADD COLUMN appointmentId INTEGER", (err) => {
                if (err && !err.message.includes("duplicate column")) {
                    // console.error("Migration warning (exams appointmentId):", err.message);
                }
            });
        }
    });

    // Migration for Prescriptions appointmentId
    db.run("ALTER TABLE prescriptions ADD COLUMN appointmentId INTEGER", (err) => {
        // silently fail if exists
    });

    // Migration for History appointmentId
    db.run("ALTER TABLE history ADD COLUMN appointmentId INTEGER", (err) => {
        // silently fail if exists
    });

    // Migration for Appointments diagnosis
    db.run("ALTER TABLE appointments ADD COLUMN diagnosis TEXT", (err) => {
        // silently fail if exists
    });

    // Tabela de Resultados de Examenes (Archivos)
    db.run(`CREATE TABLE IF NOT EXISTS exam_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        examId INTEGER,
        filePath TEXT,
        originalName TEXT,
        uploadDate TEXT,
        notes TEXT,
        FOREIGN KEY(examId) REFERENCES exams(id)
    )`);

    // --- Performance Indexes ---
    const createIndex = (sql) => {
        db.run(sql, (err) => {
            if (!err) {
                // console.log("Index verified/created:", sql);
            }
        });
    };

    // Indexes for Patients
    createIndex("CREATE INDEX IF NOT EXISTS idx_patients_dni ON patients(dni)");
    createIndex("CREATE INDEX IF NOT EXISTS idx_patients_names ON patients(lastName, firstName)");
    createIndex("CREATE INDEX IF NOT EXISTS idx_patients_history ON patients(clinicalHistoryNumber)");

    // Indexes for Appointments
    createIndex("CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date)");
    createIndex("CREATE INDEX IF NOT EXISTS idx_appointments_patientId ON appointments(patientId)");
    createIndex("CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)");

});

module.exports = db;
