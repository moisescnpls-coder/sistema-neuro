const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const db = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
// path was already required at the top
const fs = require('fs');

// Ensure uploads directory structure exists - Standardized to project root uploads
// DYNAMIC PATH: Check if root uploads exists (Local), otherwise default to backend/uploads (VPS)
const localUploads = path.join(__dirname, '../uploads');
const vpsUploads = path.join(__dirname, 'uploads');
const baseUploadDir = fs.existsSync(localUploads) ? localUploads : vpsUploads;

console.log('--- Upload Directory Configuration ---');
console.log('Using Upload Directory:', baseUploadDir);
console.log('--------------------------------------');

const uploadDirs = [
    path.join(baseUploadDir, 'patients'),
    path.join(baseUploadDir, 'exams'),
    path.join(baseUploadDir, 'prescriptions'),
    path.join(baseUploadDir, 'temp')
];

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Multer configuration with organized storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Determine folder based on route or field name
        let folder = path.join(baseUploadDir, 'temp');

        if (req.path.includes('/patients')) {
            folder = path.join(baseUploadDir, 'patients');
        } else if (req.path.includes('/exams')) {
            folder = path.join(baseUploadDir, 'exams');
        } else if (req.path.includes('/prescriptions')) {
            folder = path.join(baseUploadDir, 'prescriptions');
        } else if (req.path.includes('/doctors')) {
            folder = path.join(baseUploadDir, 'patients');
        } else if (req.baseUrl && req.baseUrl.includes('/api/settings')) { // Add case for settings/logo
            folder = path.join(baseUploadDir, 'temp');
        }

        cb(null, folder);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: [patientId or timestamp]-[originalname]
        const patientId = req.body.patientId || req.params.id || Date.now();
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_');
        const uniqueName = `${patientId}-${Date.now()}-${baseName}${ext}`;
        cb(null, uniqueName);
    }
});

// File filter for security
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    console.log('[DEBUG] File Upload:', file.originalname, 'Mimetype:', file.mimetype);

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        console.error('[ERROR] File rejected:', file.originalname, 'Mimetype:', file.mimetype);
        cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes, PDF y documentos Word.'), false);
    }
};

// Multer upload instance with 10MB limit
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max
    },
    fileFilter: fileFilter
});

const SECRET_KEY = 'neuro_secret_key_2026'; // Em produção, usar variável de ambiente

const app = express();


const PORT = process.env.PORT || 5000; // Updated default port to 5000

app.use(compression()); // Enable GZIP compression for all responses
app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(baseUploadDir));


// --- Rota de Health Check (Monitoramento) ---
app.get('/api/health', (req, res) => res.status(200).send('uptime-ok'));

// --- Middleware de Autenticação ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const logAction = (user, action, details) => {
    const timestamp = new Date().toISOString();
    const userId = user ? user.id : null;
    const username = user ? (user.username || user.name || 'Sistema') : 'Anónimo';
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : String(details);

    db.run("INSERT INTO system_logs (userId, username, action, details, timestamp) VALUES (?, ?, ?, ?, ?)",
        [userId, username, action, detailsStr, timestamp],
        (err) => {
            if (err) console.error("Error logging action:", err);
        }
    );
};

// --- Rota de Estado del Sistema (DEBUG PRIORITY) ---
app.get('/api/system-status', authenticateToken, (req, res) => {
    // Optional: Check if admin
    // if (req.user.role !== 'admin') return res.status(403).json({ error: "Access denied" });

    try {
        // DB Size: Check actual filename used in db.js
        const dbPath = path.join(__dirname, 'sistema_neuro.db');
        const dbExists = fs.existsSync(dbPath);
        const dbSize = dbExists ? fs.statSync(dbPath).size : 0;

        // Uploads Size: Check both potential locations (VPS structure vs Local structure)
        let uploadsSize = 0;
        const vpsUploads = path.join(__dirname, 'uploads'); // VPS: backend/uploads
        const localUploads = path.join(__dirname, '../uploads'); // Local: root/uploads



        if (fs.existsSync(vpsUploads)) {
            uploadsSize += getDirSize(vpsUploads);
        }

        // If local folder exists and is different from vps folder (avoid double counting if symlinked)
        if (fs.existsSync(localUploads) && path.resolve(vpsUploads) !== path.resolve(localUploads)) {
            uploadsSize += getDirSize(localUploads);
        }

        const packageJson = require('../package.json');

        res.json({
            dbSize,
            uploadsSize,
            version: packageJson.version,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error getting system status:", error);
        res.status(500).json({ error: "Failed to get system status" });
    }
});

// --- Rota de Estatísticas (Dashboard) ---
app.get('/api/stats', authenticateToken, (req, res) => {
    // Permission Check
    const checkPerm = (callback) => {
        if (req.user.role === 'admin') return callback(true);
        db.get("SELECT * FROM role_permissions WHERE role = ? AND permission_key = ?",
            [req.user.role, 'view_dashboard_stats'], (err, row) => {
                callback(!!row);
            });
    };

    checkPerm((allowed) => {
        if (!allowed) return res.status(403).json({ error: "Acceso denegado a estadísticas." });

        const queries = {
            totalPatients: "SELECT COUNT(*) as count FROM patients",
            genderDistribution: "SELECT gender, COUNT(*) as count FROM patients GROUP BY gender",
            recentPatients: "SELECT * FROM patients ORDER BY id DESC LIMIT 5",
            upcomingAppointments: `SELECT * FROM appointments WHERE status = 'Programado' AND date >= date('now', 'localtime') ORDER BY date ASC, time ASC LIMIT 10`,
            pendingExams: "SELECT COUNT(*) as count FROM exams WHERE status = 'Solicitado'"
        };

        const stats = {};
        const errors = [];

        // Helper to promisify db.all/get
        const runQuery = (key, sql, method = 'all') => {
            return new Promise((resolve) => {
                db[method](sql, [], (err, result) => {
                    if (err) {
                        console.error(`Error in ${key}:`, err);
                        errors.push(err.message);
                        resolve(null);
                    } else {
                        resolve(result);
                    }
                });
            });
        };

        Promise.all([
            runQuery('totalPatients', queries.totalPatients, 'get').then(r => stats.total = r ? r.count : 0),
            runQuery('genderDistribution', queries.genderDistribution).then(r => stats.gender = r || []),
            runQuery('recentPatients', queries.recentPatients).then(r => stats.recent = r || []),
            runQuery('upcomingAppointments', queries.upcomingAppointments).then(r => stats.appointments = r || []),
            runQuery('pendingExams', queries.pendingExams, 'get').then(r => stats.pendingExams = r ? r.count : 0)
        ]).then(() => {
            res.json(stats);
        });
    });
});

// --- Rota de Login ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM users WHERE username = ?";

    db.get(sql, [username], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row && bcrypt.compareSync(password, row.password)) {
            // Gerar Token (30 dias para uso em produção)
            const token = jwt.sign(
                { id: row.id, username: row.username, role: row.role, name: row.name },
                SECRET_KEY,
                { expiresIn: '30d' }
            );

            logAction(row, 'LOGIN', 'Inicio de sesión exitoso');

            res.json({
                success: true,
                token,
                user: { id: row.id, name: row.name, role: row.role, username: row.username }
            });
        } else {
            res.status(401).json({ success: false, message: "Credenciais inválidas" });
        }
    });
});

// --- Rotas de Logs ---
// Get system logs with pagination
app.get('/api/logs', authenticateToken, (req, res) => {
    // Check permissions using same logic as before
    const checkPerm = (callback) => {
        if (req.user.role === 'admin') return callback(true);
        db.get("SELECT * FROM role_permissions WHERE role = ? AND permission_key = ?",
            [req.user.role, 'view_logs'], (err, row) => {
                callback(!!row);
            });
    };

    checkPerm((allowed) => {
        if (!allowed) return res.status(403).json({ error: "No tiene permiso para ver logs." });

        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        // First get total count
        db.get("SELECT COUNT(*) as total FROM system_logs", [], (err, countRow) => {
            if (err) return res.status(400).json({ error: err.message });

            // Then get paginated results
            db.all(
                "SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?",
                [limit, offset],
                (err, rows) => {
                    if (err) return res.status(400).json({ error: err.message });
                    res.json({
                        logs: rows,
                        pagination: {
                            page: page,
                            limit: limit,
                            total: countRow.total,
                            totalPages: Math.ceil(countRow.total / limit)
                        }
                    });
                }
            );
        });
    });
});

// --- Rotas de Usuários (Protegidas) ---

// Listar Usuários (Apenas Admin)
app.get('/api/users', authenticateToken, (req, res) => {
    // Permitir admin e medico
    if (req.user.role !== 'admin' && req.user.role !== 'medico') return res.sendStatus(403);

    db.all("SELECT id, username, name, role FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Criar Usuário
app.post('/api/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'medico') return res.sendStatus(403);

    // Medico não pode criar Admin
    if (req.user.role === 'medico' && req.body.role === 'admin') {
        return res.status(403).json({ error: "Médicos no pueden crear administradores." });
    }

    const { username, password, name, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run("INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)",
        [username, hashedPassword, name, role],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            logAction(req.user, 'CREATE_USER', `Usuario creado: ${username} (${role})`);
            res.json({ id: this.lastID, username, name, role });
        }
    );
});

// Atualizar Usuário
app.put('/api/users/:id', authenticateToken, (req, res) => {
    // Verificar acceso
    if (req.user.role !== 'admin' && req.user.role !== 'medico') return res.sendStatus(403);

    const { name, role, password } = req.body;
    const id = req.params.id;

    // Medico no puede promover a Admin ni editar usuarios Admin existentes (excepto quizas a si mismo, pero mejor restringir)
    if (req.user.role === 'medico' && role === 'admin') {
        return res.status(403).json({ error: "Médicos no pueden asignar el rol de administrador." });
    }

    // Verificar si es el usuario admin original
    db.get("SELECT username, role, id FROM users WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Usuario no encontrado" });

        // Protección Super Admin
        if (row.username === 'admin' && role !== 'admin') {
            return res.status(403).json({ error: "No se puede cambiar el rol del super administrador." });
        }

        // Medico no puede editar a un usuario Admin existente
        if (req.user.role === 'medico' && row.role === 'admin') {
            return res.status(403).json({ error: "Médicos no pueden editar a administradores." });
        }

        if (password) {
            const hashedPassword = bcrypt.hashSync(password, 10);
            db.run("UPDATE users SET name = ?, role = ?, password = ? WHERE id = ?",
                [name, role, hashedPassword, id],
                function (err) {
                    if (err) return res.status(400).json({ error: err.message });
                    logAction(req.user, 'UPDATE_USER', `Usuario actualizado ID: ${id} (Rol: ${role})`);
                    res.json({ success: true });
                }
            );
        } else {
            db.run("UPDATE users SET name = ?, role = ? WHERE id = ?",
                [name, role, id],
                function (err) {
                    if (err) return res.status(400).json({ error: err.message });
                    logAction(req.user, 'UPDATE_USER', `Usuario actualizado ID: ${id} (Rol: ${role})`);
                    res.json({ success: true });
                }
            );
        }
    });
});

// --- Rutas de Permisos ---

app.get('/api/permissions', authenticateToken, (req, res) => {
    // Return all permissions and current role roles
    const response = {
        permissions: [],
        rolePermissions: []
    };

    const getPerms = new Promise((resolve, reject) => {
        db.all("SELECT * FROM permissions", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

    const getRolePerms = new Promise((resolve, reject) => {
        db.all("SELECT * FROM role_permissions", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

    Promise.all([getPerms, getRolePerms])
        .then(([perms, rolePerms]) => {
            res.json({ permissions: perms, rolePermissions: rolePerms });
        })
        .catch(err => res.status(500).json({ error: err.message }));
});

app.post('/api/permissions', authenticateToken, (req, res) => {
    // Only admin can manage permissions
    if (req.user.role !== 'admin') return res.sendStatus(403);

    const { role, permission_key, action } = req.body; // action: 'add' or 'remove'

    if (action === 'add') {
        db.run("INSERT OR IGNORE INTO role_permissions (role, permission_key) VALUES (?, ?)",
            [role, permission_key],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            }
        );
    } else if (action === 'remove') {
        db.run("DELETE FROM role_permissions WHERE role = ? AND permission_key = ?",
            [role, permission_key],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            }
        );
    } else {
        res.status(400).json({ error: "Invalid action" });
    }
});

// Deletar Usuário
app.delete('/api/users/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'medico') return res.sendStatus(403);

    // Evitar que o admin se delete (opcional, mas recomendado)
    // Verificar antes de eliminar
    db.get("SELECT username, role FROM users WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Usuario no encontrado" });

        if (row.username === 'admin') {
            return res.status(403).json({ error: "No se puede eliminar al super administrador." });
        }

        // Medico no puede eliminar a un usuario Admin
        if (req.user.role === 'medico' && row.role === 'admin') {
            return res.status(403).json({ error: "Médicos no pueden eliminar a administradores." });
        }

        // Medico no puede eliminar a un usuario Admin
        // Necesitamos saber el rol del usuario a eliminar. La query select arriba solo trae username. Vamos a ajustarla.
        // Wait, I need to fetch the role in the db.get above. I will update the chunk 3 and 4 together or verify the query.
        // The previous chunk 3 changed SELECT to include role. But for chunk 4 (DELETE) is a separate route.
        // I need to update the SELECT in DELETE route too.


        if (parseInt(req.params.id) === req.user.id) {
            return res.status(400).json({ error: "No es posible excluir el propio usuario conectado." });
        }

        db.run("DELETE FROM users WHERE id = ?", [req.params.id], function (err) {
            if (err) return res.status(400).json({ error: err.message });
            logAction(req.user, 'DELETE_USER', `Usuario eliminado ID: ${req.params.id}`);
            res.json({ success: true });
        });
    });
});

// --- Rotas de Pacientes ---

// Listar todos os pacientes
app.get('/api/patients', (req, res) => {
    const sql = "SELECT * FROM patients";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Adicionar o campo calculado 'age' se necessário aqui ou no frontend
        res.json(rows);
    });
});

// Adicionar paciente
app.post('/api/patients', authenticateToken, (req, res) => {
    const {
        clinicalHistoryNumber, // NOW REQUIRED
        firstName, lastName, fullName, dni, phone, email, birthDate, gender, clinicalSummary,
        maritalStatus, documentType, registrationDate,
        address, department, province, district,
        occupation, insurance // NEW FIELDS
    } = req.body;



    // 1. Validate HC is provided
    if (!clinicalHistoryNumber || clinicalHistoryNumber.trim() === '') {
        return res.status(400).json({
            error: "El número de Historia Clínica es obligatorio."
        });
    }

    // 2. Check for duplicate HC
    db.get("SELECT id FROM patients WHERE clinicalHistoryNumber = ?",
        [clinicalHistoryNumber.trim()],
        (err, existingHC) => {
            if (err) return res.status(500).json({ error: err.message });
            if (existingHC) {
                return res.status(409).json({
                    error: "El número de Historia Clínica ya está en uso."
                });
            }

            // 3. Check if patient already exists by DNI or Name
            const checkSql = "SELECT id FROM patients WHERE (dni IS NOT NULL AND dni != '' AND dni = ?) OR (firstName = ? AND lastName = ?)";
            db.get(checkSql, [dni, firstName, lastName], (err, existing) => {
                if (err) return res.status(500).json({ error: err.message });
                if (existing) {
                    return res.status(409).json({ error: "El paciente ya está registrado (DNI o Nombre duplicado)." });
                }

                // 4. Insert patient with provided HC
                const sql = `INSERT INTO patients (
                    firstName, lastName, fullName, dni, phone, email, birthDate, gender, clinicalSummary,
                    clinicalHistoryNumber, maritalStatus, documentType, registrationDate,
                    address, department, province, district, occupation, insurance
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                const params = [
                    firstName, lastName, fullName, dni, phone, email, birthDate, gender, clinicalSummary,
                    clinicalHistoryNumber.trim(), maritalStatus, documentType, registrationDate,
                    address, department, province, district, occupation, insurance
                ];



                db.run(sql, params, function (err) {
                    if (err) return res.status(400).json({ error: err.message });
                    logAction(req.user, 'CREATE_PATIENT', `Creado paciente: ${fullName} (HC: ${clinicalHistoryNumber})`);
                    res.json({
                        id: this.lastID,
                        ...req.body,
                        clinicalHistoryNumber: clinicalHistoryNumber.trim()
                    });
                });
            });
        }
    );
});

// Atualizar paciente
app.put('/api/patients/:id', authenticateToken, (req, res) => {
    const {
        clinicalHistoryNumber,
        firstName, lastName, fullName, dni, phone, email, birthDate, gender, clinicalSummary,
        maritalStatus, documentType, registrationDate,
        address, department, province, district,
        occupation, insurance // NEW FIELDS
    } = req.body;

    // 1. Validate HC is provided
    if (!clinicalHistoryNumber || clinicalHistoryNumber.trim() === '') {
        return res.status(400).json({
            error: "El número de Historia Clínica es obligatorio."
        });
    }

    // 2. Check if HC is being changed to a duplicate (exclude current patient)
    db.get(
        "SELECT id FROM patients WHERE clinicalHistoryNumber = ? AND id != ?",
        [clinicalHistoryNumber.trim(), req.params.id],
        (err, existing) => {
            if (err) return res.status(500).json({ error: err.message });
            if (existing) {
                return res.status(409).json({
                    error: "El número de Historia Clínica ya está en uso por otro paciente."
                });
            }

            // 3. Proceed with update
            const sql = `UPDATE patients SET 
                firstName = ?, lastName = ?, fullName = ?, dni = ?, phone = ?, email = ?, birthDate = ?, gender = ?, clinicalSummary = ?,
                clinicalHistoryNumber = ?, maritalStatus = ?, documentType = ?, registrationDate = ?,
                address = ?, department = ?, province = ?, district = ?, occupation = ?, insurance = ?
                WHERE id = ?`;

            const params = [
                firstName, lastName, fullName, dni, phone, email, birthDate, gender, clinicalSummary,
                clinicalHistoryNumber.trim(), maritalStatus, documentType, registrationDate,
                address, department, province, district, occupation, insurance,
                req.params.id
            ];

            db.run(sql, params, function (err) {
                if (err) return res.status(400).json({ error: err.message });
                logAction(req.user, 'UPDATE_PATIENT', `Actualizado paciente ID: ${req.params.id}`);
                res.json({ id: Number(req.params.id), ...req.body });
            });
        }
    );
});

// Excluir paciente
app.delete('/api/patients/:id', authenticateToken, (req, res) => {
    const id = req.params.id;

    // Check for dependencies
    const checkDependencies = () => {
        return new Promise((resolve, reject) => {
            const queries = [
                { table: 'appointments', label: 'citas' },
                { table: 'prescriptions', label: 'recetas' },
                { table: 'exams', label: 'exámenes' }
            ];

            let pending = queries.length;
            let foundDependency = null;

            queries.forEach(q => {
                db.get(`SELECT 1 FROM ${q.table} WHERE patientId = ? LIMIT 1`, [id], (err, row) => {
                    if (err) {
                        return reject(err);
                    }
                    if (row && !foundDependency) {
                        foundDependency = q.label;
                    }
                    pending--;
                    if (pending === 0) {
                        resolve(foundDependency);
                    }
                });
            });
        });
    };

    checkDependencies()
        .then(dependency => {
            if (dependency) {
                return res.status(400).json({
                    error: `No se puede eliminar: El paciente tiene ${dependency} asociadas en el sistema.`
                });
            }

            // Proceed with deletion if safe
            const sql = "DELETE FROM patients WHERE id = ?";
            db.run(sql, id, function (err) {
                if (err) return res.status(400).json({ error: err.message });
                logAction(req.user, 'DELETE_PATIENT', `Eliminado paciente ID: ${id}`);
                res.json({ message: "Paciente eliminado correctamente", changes: this.changes });
            });
        })
        .catch(err => {
            res.status(500).json({ error: err.message });
        });
});

// --- Rotas de Agendamentos ---

app.get('/api/appointments', (req, res) => {
    // Left Join to get triage info
    const sql = `
        SELECT a.*, t.id as triageId, t.systolic, t.diastolic, t.oxygenSaturation
        FROM appointments a
        LEFT JOIN triage t ON a.id = t.appointmentId
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Parse history field from JSON string
        const formatted = rows.map(r => ({
            ...r,
            history: r.history ? JSON.parse(r.history) : []
        }));
        res.json(formatted);
    });
});

// Get unique referrals for autocomplete
app.get('/api/referrals', authenticateToken, (req, res) => {
    const sql = `SELECT DISTINCT referral FROM appointments WHERE referral IS NOT NULL AND referral != '' ORDER BY referral ASC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => r.referral));
    });
});

// --- Rota de Triaje ---

// Crear registro de triaje
app.post('/api/triage', authenticateToken, (req, res) => {
    const { patientId, appointmentId, date, weight, height, temperature, systolic, diastolic, heartRate, oxygenSaturation, notes } = req.body;
    const createdBy = req.user.name || req.user.username; // Use name if available
    const createdAt = new Date().toISOString();

    const sql = `INSERT INTO triage (patientId, appointmentId, date, weight, height, temperature, systolic, diastolic, heartRate, oxygenSaturation, notes, createdBy, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [patientId, appointmentId, date, weight, height, temperature, systolic, diastolic, heartRate, oxygenSaturation, notes, createdBy, createdAt], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID, success: true });
    });
});

// Update Triage Record
app.put('/api/triage/:id', authenticateToken, (req, res) => {
    const { weight, height, temperature, systolic, diastolic, heartRate, oxygenSaturation, notes } = req.body;

    const sql = `UPDATE triage SET 
        weight = ?, height = ?, temperature = ?, systolic = ?, diastolic = ?,
        heartRate = ?, oxygenSaturation = ?, notes = ?
        WHERE id = ?`;

    db.run(sql, [weight, height, temperature, systolic, diastolic, heartRate, oxygenSaturation, notes, req.params.id], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ success: true });
    });
});

// Obtener triaje del paciente
app.get('/api/patients/:id/triage', authenticateToken, (req, res) => {
    db.all("SELECT * FROM triage WHERE patientId = ? ORDER BY date DESC, createdAt DESC", [req.params.id], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/appointments', authenticateToken, (req, res) => {
    const { patientId, patientName, date, time, type, notes, status, history, createdAt, referral } = req.body;
    const createdBy = req.user ? (req.user.name || req.user.username) : 'Sistema';

    const sql = `INSERT INTO appointments (patientId, patientName, date, time, type, notes, status, history, createdBy, createdAt, referral) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [patientId, patientName, date, time, type, notes, status, JSON.stringify(history || []), createdBy, createdAt || new Date().toISOString(), referral];

    db.run(sql, params, function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID, ...req.body, createdBy, createdAt });
    });
});

app.put('/api/appointments/:id', (req, res) => {
    const { patientId, patientName, date, time, type, notes, status, history, referral, diagnosis } = req.body;
    const sql = `UPDATE appointments SET patientId = ?, patientName = ?, date = ?, time = ?, type = ?, notes = ?, status = ?, history = ?, referral = ?, diagnosis = ?
                 WHERE id = ?`;
    const params = [patientId, patientName, date, time, type, notes, status, JSON.stringify(history || []), referral, diagnosis, req.params.id];

    db.run(sql, params, function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: req.params.id, ...req.body });
    });
});

app.delete('/api/appointments/:id', authenticateToken, (req, res) => {
    // Check permission logic
    const appointmentId = req.params.id;
    const userRole = req.user.role;

    // First get the appointment status
    db.get("SELECT status FROM appointments WHERE id = ?", [appointmentId], (err, appointment) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!appointment) return res.status(404).json({ error: "Appointment not found" });

        // Determine required permission based on status
        let requiredPerm = 'delete_appointments'; // Default for active appointments
        if (['Cancelado', 'Completado'].includes(appointment.status)) {
            requiredPerm = 'delete_history_appointments';
        }

        // Check availability of permission for user role
        if (userRole === 'admin') {
            // Admin always has access (or implied)
            deleteAppointment(appointmentId, res);
        } else {
            db.get("SELECT * FROM role_permissions WHERE role = ? AND permission_key = ?",
                [userRole, requiredPerm],
                (err, row) => {
                    if (err) return res.status(500).json({ error: err.message });
                    if (!row) return res.status(403).json({ error: "No tiene permiso para realizar esta acción." });

                    deleteAppointment(appointmentId, res);
                }
            );
        }
    });

    function deleteAppointment(id, res) {
        // Cascade delete all related records
        const deleteTriage = new Promise((resolve) => db.run("DELETE FROM triage WHERE appointmentId = ?", [id], resolve));
        const deleteExams = new Promise((resolve) => db.run("DELETE FROM exams WHERE appointmentId = ?", [id], resolve));
        const deletePrescriptions = new Promise((resolve) => db.run("DELETE FROM prescriptions WHERE appointmentId = ?", [id], resolve));
        const deleteHistory = new Promise((resolve) => db.run("DELETE FROM history WHERE appointmentId = ?", [id], resolve));

        Promise.all([deleteTriage, deleteExams, deletePrescriptions, deleteHistory]).then(() => {
            // Then delete the appointment
            db.run("DELETE FROM appointments WHERE id = ?", [id], function (err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ success: true, changes: this.changes });
            });
        }).catch(err => {
            console.error("Error deleting cascade records:", err);
            res.status(500).json({ error: "Error deleting related records" });
        });
    }
});

// NEW: Get full details for an appointment (Atencion view)
app.get('/api/appointments/:id/full-details', authenticateToken, (req, res) => {
    const appointmentId = req.params.id;

    db.get("SELECT * FROM appointments WHERE id = ?", [appointmentId], (err, appointment) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!appointment) return res.status(404).json({ error: "Cita no encontrada" });

        // Get Patient
        db.get("SELECT * FROM patients WHERE id = ?", [appointment.patientId], (err, patient) => {
            if (err) return res.status(500).json({ error: err.message });

            const queries = {
                triage: "SELECT * FROM triage WHERE appointmentId = ?",
                prescriptions: "SELECT * FROM prescriptions WHERE appointmentId = ?",
                exams: "SELECT * FROM exams WHERE appointmentId = ?",
                history: "SELECT * FROM history WHERE appointmentId = ?"
            };

            const runQ = (sql, params) => new Promise((resolve) => {
                db.all(sql, params, (err, rows) => resolve(rows || []));
            });

            Promise.all([
                runQ(queries.triage, [appointmentId]),
                runQ(queries.prescriptions, [appointmentId]),
                runQ(queries.exams, [appointmentId]),
                runQ(queries.history, [appointmentId]),
                runQ("SELECT id, date, time, type, status FROM appointments WHERE patientId = ? ORDER BY date DESC", [appointment.patientId])
            ]).then(([triage, prescriptions, exams, history, patientAppointments]) => {
                // Fetch results for exams if any
                const attachExamResults = async () => {
                    if (!exams || exams.length === 0) return exams;
                    const ids = exams.map(e => e.id);
                    return new Promise((resolve) => {
                        db.all(`SELECT * FROM exam_results WHERE examId IN (${ids.join(',')})`, [], (err, results) => {
                            if (err || !results) resolve(exams);
                            else {
                                const examsWithResults = exams.map(e => ({
                                    ...e,
                                    results: results.filter(r => r.examId === e.id)
                                }));
                                resolve(examsWithResults);
                            }
                        });
                    });
                };

                attachExamResults().then(finalExams => {
                    res.json({
                        appointment,
                        patient,
                        triage: triage[0] || null,
                        prescriptions,
                        exams: finalExams, // Updated with results
                        history,
                        patientAppointments
                    });
                });
            });
        });
    });
});

// --- Rotas de Histórico Clínico ---

app.get('/api/history/:patientId', (req, res) => {
    const sql = "SELECT * FROM history WHERE patientId = ? ORDER BY date DESC";
    db.all(sql, [req.params.patientId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/history', authenticateToken, (req, res) => {
    const { patientId, date, type, notes, createdAt, appointmentId } = req.body;
    const createdBy = req.user?.name || req.user?.username || 'Usuario';
    const timestamp = createdAt || new Date().toISOString(); // Fallback if not provided
    const sql = `INSERT INTO history (patientId, date, type, notes, createdBy, createdAt, appointmentId) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [patientId, date, type, notes, createdBy, timestamp, appointmentId || null], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID, ...req.body, createdBy, createdAt: timestamp });
    });
});

app.delete('/api/history/:id', authenticateToken, (req, res) => {
    // Optional: Add permission check if needed (e.g. only doctor/admin)
    if (req.user.role !== 'admin' && req.user.role !== 'medico') {
        return res.status(403).json({ error: "No tiene permiso para eliminar historial." });
    }

    db.run("DELETE FROM history WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ success: true });
    });
});


// --- Rutas Clínicas ---

// Recetas
app.get('/api/prescriptions/:patientId', (req, res) => {
    db.all("SELECT * FROM prescriptions WHERE patientId = ? ORDER BY date DESC", [req.params.patientId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/prescriptions', authenticateToken, (req, res) => {
    const { patientId, medications, instructions, createdAt, prescriptionDate, appointmentId } = req.body;
    const doctorName = req.user.name || req.user.username;
    const createdBy = req.user.name || req.user.username || 'Doctor';
    // Use local date (creation date)
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timestamp = createdAt || now.toISOString(); // Fallback if createdAt not provided

    // prescriptionDate override logic: use provided date or fallback to creation date
    const pDate = prescriptionDate || date;

    db.run("INSERT INTO prescriptions (patientId, doctorName, date, medications, instructions, createdBy, createdAt, prescriptionDate, appointmentId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [patientId, doctorName, date, JSON.stringify(medications), instructions, createdBy, timestamp, pDate, appointmentId || null],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID, success: true });
        }
    );
});

// Update prescription
app.put('/api/prescriptions/:id', authenticateToken, (req, res) => {
    const { medications, instructions, prescriptionDate } = req.body;
    db.run(
        "UPDATE prescriptions SET medications = ?, instructions = ?, prescriptionDate = ? WHERE id = ?",
        [JSON.stringify(medications), instructions, prescriptionDate, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// Delete prescription
app.delete('/api/prescriptions/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM prescriptions WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Examenes
app.get('/api/exams/:patientId', (req, res) => {
    db.all("SELECT * FROM exams WHERE patientId = ? ORDER BY date DESC", [req.params.patientId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Fetch results for these exams
        const exams = rows;
        if (exams.length === 0) return res.json([]);

        // This is a simple query, for production might be better to JOIN
        const examIds = exams.map(e => e.id);
        db.all(`SELECT * FROM exam_results WHERE examId IN (${examIds.join(',')})`, [], (err, results) => {
            if (err) return res.json(exams); // Return exams without results if error

            console.log(`[DEBUG] Checking ${results.length} exam results for existence...`);

            // Check if files exist
            const resultsWithStatus = results.map(r => {
                // If path is relative like "uploads/exams/file.pdf", strict check relative to backend/ root or project root?
                // We standardized to project root "uploads/exams" in previous steps
                // Our baseUploadDir is path.join(__dirname, '../uploads');
                // so we can resolve: path.join(__dirname, '..', r.filePath) if r.filePath starts with 'uploads/'

                let fullPath;
                if (r.filePath && r.filePath.startsWith('uploads')) {
                    fullPath = path.join(__dirname, '..', r.filePath);
                } else {
                    fullPath = r.filePath; // absolute or weird path
                }

                return {
                    ...r,
                    fileExists: fs.existsSync(fullPath)
                };
            });

            const examsWithResults = exams.map(e => ({
                ...e,
                results: resultsWithStatus.filter(r => r.examId === e.id)
            }));
            res.json(examsWithResults);
        });
    });
});

app.post('/api/exams', authenticateToken, (req, res) => {
    const { patientId, type, reason, createdAt, examDate, appointmentId, doctorName: providedDoctorName } = req.body;
    const doctorName = providedDoctorName || req.user.name || req.user.username;
    const createdBy = req.user.name || req.user.username || 'Doctor';
    // Use local date instead of UTC (creation date)
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timestamp = createdAt || now.toISOString(); // Fallback if createdAt not provided

    // examDate override logic: use provided date or fallback to creation date
    const eDate = examDate || date;

    db.run("INSERT INTO exams (patientId, doctorName, date, type, status, reason, createdBy, createdAt, examDate, appointmentId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [patientId, doctorName, date, type, 'Solicitado', reason, createdBy, timestamp, eDate, appointmentId || null],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID, success: true });
        }
    );
});

// Subir Resultados
app.post('/api/exams/:id/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const examId = req.params.id;
    const { note } = req.body;
    const uploadDate = new Date().toISOString();

    db.get("SELECT e.type, e.patientId, p.firstName, p.lastName FROM exams e JOIN patients p ON e.patientId = p.id WHERE e.id = ?", [examId], (err, row) => {

        // Helper to fix encoding issues (typical latin1 vs utf8 in headers)
        const fixEncoding = (str) => {
            try {
                return Buffer.from(str, 'latin1').toString('utf8');
            } catch (e) { return str; }
        };

        // Helper to safely move file
        const moveFile = (src, dest) => {
            try {
                fs.renameSync(src, dest);
            } catch (err) {
                if (err.code === 'EXDEV') {
                    fs.copyFileSync(src, dest);
                    fs.unlinkSync(src);
                } else {
                    throw err;
                }
            }
        };

        const originalNameFixed = fixEncoding(req.file.originalname);

        if (err || !row) {
            console.error("Error/NoRow fetching details:", err);
            // Fallback strategy
            // If we can't get details, just move to uploads/exams to be safe
            // and use a timestamped name
            const timestamp = Date.now();
            const safeName = `${timestamp}_${path.basename(req.file.path)}`;
            const targetDir = path.join(baseUploadDir, 'exams');
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

            const newPath = path.join(targetDir, safeName);

            try {
                moveFile(req.file.path, newPath);
                // Force forward slashes for URL
                const dbPath = `uploads/exams/${safeName}`;
                saveResult(dbPath, originalNameFixed);
            } catch (moveErr) {
                console.error("Fallback move failed:", moveErr);
                // Last resort: verify where it is
                // req.file.path should be valid
                // We just need to ensure dbPath is relative to backend root and uses /
                // assumption: req.file.path is inside backend/uploads/...
                const relative = path.relative(__dirname, req.file.path).replace(/\\/g, '/');
                saveResult(relative, originalNameFixed);
            }
            return;
        }

        // Sanitize
        const sanitize = (str) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "");
        const pName = sanitize(row.lastName) + "_" + sanitize(row.firstName);
        const eType = sanitize(row.type);
        const dateStr = new Date().toISOString().split('T')[0];
        const ext = path.extname(originalNameFixed);
        const suffix = Math.random().toString(36).substring(2, 7);

        const newFilename = `${pName}_${eType}_${dateStr}_${suffix}${ext}`;

        const targetDir = path.join(baseUploadDir, 'exams');
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        const newPath = path.join(targetDir, newFilename);

        try {
            moveFile(req.file.path, newPath);
            const dbPath = `uploads/exams/${newFilename}`;
            saveResult(dbPath, originalNameFixed);
        } catch (renameErr) {
            console.error("Error moving file:", renameErr);
            // Fallback as above
            const timestamp = Date.now();
            const safeBackupName = `${timestamp}_${sanitize(originalNameFixed)}`;
            const backupPath = path.join(targetDir, safeBackupName);
            try {
                fs.copyFileSync(req.file.path, backupPath); // Try copy if move failed completely
                const dbPath = `uploads/exams/${safeBackupName}`;
                saveResult(dbPath, originalNameFixed);
            } catch (e2) {
                const relative = path.relative(__dirname, req.file.path).replace(/\\/g, '/');
                saveResult(relative, originalNameFixed);
            }
        }
    });

    function saveResult(filePath, originalName) {
        // Ensure strictly forward slashes for DB URLs
        const finalPath = filePath.replace(/\\/g, '/');

        db.run(
            "INSERT INTO exam_results (examId, filePath, originalName, uploadDate, note) VALUES (?, ?, ?, ?, ?)",
            [examId, finalPath, originalName, uploadDate, note],
            function (err) {
                if (err) {
                    console.error("Error saving result to DB:", err);
                    return res.status(500).json({ error: "Database error" });
                }

                // Also update exam status
                db.run("UPDATE exams SET status = 'Resultados Listos' WHERE id = ?", [examId]);

                res.json({ message: "File uploaded successfully", resultId: this.lastID, filePath: finalPath });
            }
        );
    }
});


// --- Delete/Edit Clinical Routes ---

app.delete('/api/prescriptions/:id', authenticateToken, (req, res) => {
    // Check perm
    if (req.user.role !== 'admin') {
        // Check dynamic perm
        db.get("SELECT * FROM role_permissions WHERE role = ? AND permission_key = ?",
            [req.user.role, 'delete_prescriptions'], (err, row) => {
                if (!row) return res.status(403).json({ error: "No tiene permiso para eliminar recetas." });
                performDelete();
            });
    } else {
        performDelete();
    }

    function performDelete() {
        db.run("DELETE FROM prescriptions WHERE id = ?", [req.params.id], function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ success: true });
        });
    }
});

app.delete('/api/exams/:id', authenticateToken, (req, res) => {
    // Check perm
    if (req.user.role !== 'admin') {
        db.get("SELECT * FROM role_permissions WHERE role = ? AND permission_key = ?",
            [req.user.role, 'delete_exams'], (err, row) => {
                if (!row) return res.status(403).json({ error: "No tiene permiso para eliminar solicitudes de examenes." });
                performDelete();
            });
    } else {
        performDelete();
    }

    function performDelete() {
        // Also delete results? DB FK might not cascade depending on config, but for now just delete exam
        db.run("DELETE FROM exams WHERE id = ?", [req.params.id], function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ success: true });
        });
    }
});

app.put('/api/exams/:id', authenticateToken, (req, res) => {
    const { type, reason, examDate, status, doctorName } = req.body;

    // Check perm
    if (req.user.role !== 'admin') {
        db.get("SELECT * FROM role_permissions WHERE role = ? AND permission_key = ?",
            [req.user.role, 'edit_clinical'], (err, row) => {
                if (!row) return res.status(403).json({ error: "No tiene permiso para editar examenes." });
                performUpdate();
            });
    } else {
        performUpdate();
    }

    function performUpdate() {
        db.run("UPDATE exams SET type = ?, reason = ?, examDate = ?, status = ?, doctorName = ? WHERE id = ?",
            [type, reason, examDate, status, doctorName, req.params.id], function (err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ success: true });
            });
    }
});

app.put('/api/history/:id', authenticateToken, (req, res) => {
    const { notes, date, type } = req.body;

    // Check perm (same as exams/prescriptions or generic)
    if (req.user.role !== 'admin' && req.user.role !== 'medico') {
        return res.status(403).json({ error: "No tiene permiso para editar historial." });
    }

    db.run("UPDATE history SET notes = ?, date = ?, type = ? WHERE id = ?",
        [notes, date, type, req.params.id], function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ success: true });
        });
});


app.put('/api/prescriptions/:id', authenticateToken, (req, res) => {
    const { medications, instructions, prescriptionDate } = req.body;

    // Permission check for editing prescriptions (using edit_clinical or specific?)
    // Reusing edit_clinical for simplicity or adding edit_prescriptions?
    // Let's use 'edit_clinical' for now as generic edit power, or just check ownership?
    // User requested "opcoes de acordo com algumas novas persmissoes de editar".
    // I'll stick to 'edit_clinical' for editing content.
    if (req.user.role !== 'admin') {
        db.get("SELECT * FROM role_permissions WHERE role = ? AND permission_key = ?",
            [req.user.role, 'edit_clinical'], (err, row) => {
                if (!row) return res.status(403).json({ error: "No tiene permiso para editar recetas." });
                performUpdate();
            });
    } else {
        performUpdate();
    }

    function performUpdate() {
        const medsJson = JSON.stringify(medications);
        // Only update date if provided
        if (prescriptionDate) {
            db.run("UPDATE prescriptions SET medications = ?, instructions = ?, prescriptionDate = ? WHERE id = ?",
                [medsJson, instructions, prescriptionDate, req.params.id], function (err) {
                    if (err) return res.status(400).json({ error: err.message });
                    res.json({ success: true });
                });
        } else {
            db.run("UPDATE prescriptions SET medications = ?, instructions = ? WHERE id = ?",
                [medsJson, instructions, req.params.id], function (err) {
                    if (err) return res.status(400).json({ error: err.message });
                    res.json({ success: true });
                });
        }
    }
});

app.delete('/api/exams/results/:id', authenticateToken, (req, res) => {
    // Check perm (delete_exams creates consistency, or edit_clinical?)
    // Deleting an attachment is like editing the exam record.
    if (req.user.role !== 'admin') {
        db.get("SELECT * FROM role_permissions WHERE role = ? AND permission_key = ?",
            [req.user.role, 'edit_clinical'], (err, row) => {
                if (!row) return res.status(403).json({ error: "No tiene permiso para eliminar anexos." });
                performDelete();
            });
    } else {
        performDelete();
    }

    function performDelete() {
        // First get the file path to delete from disk
        db.get("SELECT filePath FROM exam_results WHERE id = ?", [req.params.id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: "Resultado no encontrado" });

            // Delete from disk
            const fullPath = path.join(__dirname, row.filePath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }

            // Delete from DB
            db.run("DELETE FROM exam_results WHERE id = ?", [req.params.id], function (err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ success: true });
            });
        });
    }
});

// --- Configuración (Empresa) ---
app.post('/api/backup', authenticateToken, (req, res) => {
    // Check perm
    const checkPerm = (callback) => {
        if (req.user.role === 'admin') return callback(true);
        db.get("SELECT * FROM role_permissions WHERE role = ? AND permission_key = ?",
            [req.user.role, 'manage_backup'], (err, row) => {
                callback(!!row);
            });
    };

    checkPerm((allowed) => {
        if (!allowed) return res.status(403).json({ error: "No tiene permiso para realizar backups." });

        const backupDir = path.join(__dirname, 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const ms = String(now.getMilliseconds()).padStart(3, '0');

        const timestamp = `${year}-${month}-${day}T${hours}-${minutes}-${seconds}-${ms}`;
        const backupName = `backup-sistema-neuro-${timestamp}.db`;
        const backupPath = path.join(backupDir, backupName);
        const dbPath = path.resolve(__dirname, 'sistema_neuro.db');

        // Close/Flush WAL not strictly necessary for copy if using WAL, 
        // but 'vacuum' into new file is safer. For now simple copy.
        fs.copyFile(dbPath, backupPath, (err) => {
            if (err) return res.status(500).json({ error: "Error creating backup: " + err.message });
            logAction(req.user, 'BACKUP', 'Copia de seguridad realizada: ' + backupName);
            res.json({ success: true, filename: backupName });
        });
    });
});

// --- Reports Endpoints ---
const checkReportPerm = (req, res, next) => {
    if (req.user.role === 'admin') return next();
    db.get("SELECT * FROM role_permissions WHERE role = ? AND permission_key = ?",
        [req.user.role, 'view_reports'], (err, row) => {
            if (err || !row) return res.status(403).json({ error: "Sin permiso para ver reportes" });
            next();
        });
};

app.get('/api/reports/patients', authenticateToken, checkReportPerm, (req, res) => {
    const { startDate, endDate, gender, department } = req.query;
    let sql = "SELECT * FROM patients WHERE 1=1";
    const params = [];

    if (startDate) {
        sql += " AND registrationDate >= ?";
        params.push(startDate);
    }
    if (endDate) {
        sql += " AND registrationDate <= ?";
        params.push(endDate);
    }
    if (gender) {
        sql += " AND gender = ?";
        params.push(gender);
    }
    if (department) {
        sql += " AND department = ?";
        params.push(department);
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        logAction(req.user, 'VIEW_REPORT', `Reporte de Pacientes generado. Filtros: ${JSON.stringify(req.query)}`);
        res.json(rows);
    });
});

app.get('/api/reports/appointments', authenticateToken, checkReportPerm, (req, res) => {
    const { startDate, endDate, status, createdBy } = req.query;
    let sql = "SELECT * FROM appointments WHERE 1=1";
    const params = [];

    if (startDate) {
        sql += " AND date >= ?";
        params.push(startDate);
    }
    if (endDate) {
        sql += " AND date <= ?";
        params.push(endDate);
    }
    if (status) {
        sql += " AND status = ?";
        params.push(status);
    }
    // Filter by doctor (if 'createdBy' matches doctor name? Or usually we filter by a 'doctor' column if it existed accurately, 
    // but the schema has 'doctorName' in exams/prescriptions but not explicitly linked in appointments table creation in db.js 
    // waiting... checking schema... appointments has 'type', 'notes', 'status'. It lacks explicit 'doctor'. 
    // Assuming we filter by what we have. If user wants doctor filter for appointments, we might need a migration or filter by 'type' or use 'createdBy'.
    // Let's stick to status and dates for now as per schema viewed earlier.

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        logAction(req.user, 'VIEW_REPORT', `Reporte de Citas generado. Filtros: ${JSON.stringify(req.query)}`);
        res.json(rows);
    });
});

app.get('/api/reports/exams', authenticateToken, checkReportPerm, (req, res) => {
    const { startDate, endDate, status, type } = req.query;
    let sql = "SELECT e.*, COALESCE(p.fullName, p.firstName || ' ' || p.lastName, 'Desconocido') as patientName FROM exams e LEFT JOIN patients p ON e.patientId = p.id WHERE 1=1";
    const params = [];

    if (startDate) {
        sql += " AND e.date >= ?";
        params.push(startDate);
    }
    if (endDate) {
        sql += " AND e.date <= ?";
        params.push(endDate);
    }
    if (status) {
        sql += " AND e.status = ?";
        params.push(status);
    }
    if (type) {
        sql += " AND e.type LIKE ?"; // Partial match for exam type
        params.push(`%${type}%`);
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        logAction(req.user, 'VIEW_REPORT', `Reporte de Exámenes generado. Filtros: ${JSON.stringify(req.query)}`);
        res.json(rows);
    });
});

app.get('/api/settings', (req, res) => {
    db.get("SELECT * FROM settings WHERE id = 1", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || {}); // Return empty obj if no settings yet (should have been seeded though)
    });
});

app.post('/api/settings', authenticateToken, upload.single('logo'), (req, res) => {
    // Only admin can change settings
    if (req.user.role !== 'admin') return res.sendStatus(403);

    const { ruc, razonSocial, nombreComercial, celular, telefono, correo, direccion } = req.body;

    let sql = "UPDATE settings SET ruc=?, razonSocial=?, nombreComercial=?, celular=?, telefono=?, correo=?, direccion=?";
    let params = [ruc, razonSocial, nombreComercial, celular, telefono, correo, direccion];

    if (req.file) {
        // FIX: Store relative path to project root (e.g., 'uploads/temp/file.png')
        // req.file.path is absolute from multer. We strip up to 'uploads'.
        const relativePath = path.relative(path.join(__dirname, '..'), req.file.path);
        const logoUrl = relativePath.replace(/\\/g, '/');
        sql += ", logoUrl=?";
        params.push(logoUrl);
    }

    sql += " WHERE id=1";

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Return updated data
        db.get("SELECT * FROM settings WHERE id = 1", (err, row) => {
            res.json(row);
        });
    });
});

// --- Dashboard Analytics Endpoint ---
app.get('/api/dashboard/analytics', authenticateToken, (req, res) => {
    // Permission check
    const checkPerm = (callback) => {
        if (req.user.role === 'admin') return callback(true);
        db.get("SELECT * FROM role_permissions WHERE role = ? AND permission_key = ?",
            [req.user.role, 'view_reports'], (err, row) => {
                callback(!!row);
            });
    };

    checkPerm((allowed) => {
        if (!allowed) return res.status(403).json({ error: "Sin permiso para ver el dashboard." });

        const { startDate, endDate, period } = req.query;
        let start = startDate;
        let end = endDate;

        // Default to current year if no dates provided and not 'all'
        if ((!start || !end) && period !== 'all') {
            const now = new Date();
            start = `${now.getFullYear()}-01-01`;
            end = `${now.getFullYear()}-12-31`;
        }

        const analytics = {
            kpis: {},
            monthlyTrends: [],
            statusDistribution: []
        };

        // 1. KPIs
        // Base query for filtered KPIs
        let dateFilter = "1=1";
        const params = [];

        if (start && end) {
            dateFilter = "date BETWEEN ? AND ?";
            params.push(start, end);
        } else if (period === 'all') {
            // No date filter
        }

        // Queries
        const kpiQueries = {
            totalPatients: "SELECT COUNT(*) as count FROM patients",
            appointmentsToday: "SELECT COUNT(*) as count FROM appointments WHERE date = date('now', 'localtime')",
            // Filtered KPIs
            totalAppointments: `SELECT COUNT(*) as count FROM appointments WHERE ${dateFilter}`,
            attended: `SELECT COUNT(*) as count FROM appointments WHERE status='Realizado' AND ${dateFilter}`,
            cancelled: `SELECT COUNT(*) as count FROM appointments WHERE status='Cancelado' AND ${dateFilter}`
        };

        // 2. Monthly Trends
        const trendsSql = `
            SELECT strftime('%Y-%m', date) as label, COUNT(*) as count, 
            SUM(CASE WHEN status='Cancelado' THEN 1 ELSE 0 END) as cancelled
            FROM appointments 
            WHERE ${dateFilter}
            GROUP BY strftime('%Y-%m', date)
            ORDER BY label ASC
        `;

        // 3. Status Distribution
        const statusSql = `SELECT status, COUNT(*) as count FROM appointments WHERE ${dateFilter} GROUP BY status`;

        // Execution Helpers
        const runQuery = (sql, p) => new Promise((resolve) => {
            db.all(sql, p || [], (err, rows) => resolve(rows || []));
        });

        const runGet = (sql, p) => new Promise((resolve) => {
            db.get(sql, p || [], (err, row) => resolve(row ? row.count : 0));
        });

        Promise.all([
            runGet(kpiQueries.totalPatients),
            runGet(kpiQueries.appointmentsToday),
            runGet(kpiQueries.totalAppointments, params),
            runGet(kpiQueries.attended, params),
            runGet(kpiQueries.cancelled, params),
            runQuery(trendsSql, params),
            runQuery(statusSql, params) // Pass params
        ]).then(([totalPatients, appointmentsToday, totalAppointments, attended, cancelled, trends, statuses]) => {

            // Post-process Trends to fill gaps if range is defined
            let finalTrends = trends;
            if (start && end && period !== 'all') {
                const months = [];
                // Manual parsing to avoid UTC interpretation
                const [y1, m1, d1] = start.split('-').map(Number);
                const [y2, m2, d2] = end.split('-').map(Number);

                // Construct in local time (months are 0-indexed in JS Date)
                let current = new Date(y1, m1 - 1, 1);
                const endDateObj = new Date(y2, m2 - 1, 1); // Compare 1st of month to 1st of month to be safe

                while (current <= endDateObj) {
                    const year = current.getFullYear();
                    const month = String(current.getMonth() + 1).padStart(2, '0');
                    const mStr = `${year}-${month}`;
                    months.push(mStr);
                    current.setMonth(current.getMonth() + 1);
                }

                // Merge real data with empty months
                finalTrends = months.map(m => {
                    const found = trends.find(t => t.label === m);
                    return found || { label: m, count: 0, cancelled: 0 };
                });
            }

            analytics.kpis = {
                totalPatients,
                appointmentsToday,
                totalAppointments,
                attended,
                cancelled
            };
            analytics.monthlyTrends = finalTrends;
            analytics.statusDistribution = statuses;

            res.json(analytics);
        }).catch(err => {
            console.error(err);
            res.status(500).json({ error: "Error loading analytics" });
        });
    });
});

// --- Rutas de Médicos/Personal ---
app.get('/api/doctors', (req, res) => {
    db.all("SELECT * FROM doctors ORDER BY fullName ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/doctors', authenticateToken, upload.single('photo'), (req, res) => {
    const { fullName, specialty, cmp, phone, email, bio, status } = req.body;

    let photoUrl = null;
    if (req.file) {
        photoUrl = req.file.path.replace(/\\/g, '/');
    }

    const sql = `INSERT INTO doctors (fullName, specialty, cmp, phone, email, photoUrl, bio, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [fullName, specialty, cmp, phone, email, photoUrl, bio, status || 'active'];

    db.run(sql, params, function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID, ...req.body, photoUrl });
    });
});

app.put('/api/doctors/:id', authenticateToken, upload.single('photo'), (req, res) => {
    const { fullName, specialty, cmp, phone, email, bio, status } = req.body;

    let sql = "UPDATE doctors SET fullName=?, specialty=?, cmp=?, phone=?, email=?, bio=?, status=?";
    let params = [fullName, specialty, cmp, phone, email, bio, status];

    if (req.file) {
        const photoUrl = req.file.path.replace(/\\/g, '/');
        sql += ", photoUrl=?";
        params.push(photoUrl);
    }

    sql += " WHERE id=?";
    params.push(req.params.id);

    db.run(sql, params, function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: req.params.id, success: true });
    });
});

app.delete('/api/doctors/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM doctors WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ success: true });
    });
});

// --- Performance Optimization Functions ---

// Cleanup old logs (> 1 year) to prevent database bloat
// NOTE: We do NOT delete appointments as they are critical medical records
const cleanupOldLogs = () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const cutoffDate = oneYearAgo.toISOString();

    db.run("DELETE FROM system_logs WHERE timestamp < ?", [cutoffDate], function (err) {
        if (err) {
            console.error("Error cleaning up old logs:", err);
        } else if (this.changes > 0) {
            console.log(`Cleaned up ${this.changes} old log entries (older than 1 year)`);
            logAction(null, 'SYSTEM_CLEANUP', `Removed ${this.changes} log entries older than ${cutoffDate}`);
        }
    });
};

// Run cleanup on startup and then daily
cleanupOldLogs();

// Schedule daily cleanup (runs every 24 hours)
setInterval(() => {
    cleanupOldLogs();
}, 24 * 60 * 60 * 1000);

// Manual cleanup endpoint (admin only)
app.post('/api/admin/cleanup', authenticateToken, (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    cleanupOldLogs();

    logAction(req.user, 'MANUAL_CLEANUP', 'Triggered manual system cleanup');
    res.json({ success: true, message: 'Cleanup initiated' });
});

// --- Serve Static Frontend (Production) ---
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
    console.log('Serving static files from:', distPath);
    app.use(express.static(distPath));

    // Handle React routing, return all requests to React app
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    console.log('Frontend build not found. Run "npm run build" to generate it.');
}



// --- System Status Monitoring ---

const getDirSize = (dirPath) => {
    let size = 0;
    if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                size += getDirSize(filePath);
            } else {
                size += stats.size;
            }
        });
    }
    return size;
};

app.get('/api/system-status', authenticateToken, (req, res) => {
    // Optional: Check if admin
    // if (req.user.role !== 'admin') return res.status(403).json({ error: "Access denied" });

    try {
        // DB Size: Check actual filename used in db.js
        const dbPath = path.join(__dirname, 'sistema_neuro.db');
        const dbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;

        // Uploads Size: Check both potential locations (VPS structure vs Local structure)
        let uploadsSize = 0;
        const vpsUploads = path.join(__dirname, 'uploads'); // VPS: backend/uploads
        const localUploads = path.join(__dirname, '../uploads'); // Local: root/uploads

        if (fs.existsSync(vpsUploads)) {
            uploadsSize += getDirSize(vpsUploads);
        }

        // If local folder exists and is different from vps folder (avoid double counting if symlinked)
        if (fs.existsSync(localUploads) && path.resolve(vpsUploads) !== path.resolve(localUploads)) {
            uploadsSize += getDirSize(localUploads);
        }

        // Debug Logs - BEFORE sending response
        console.log('--- System Status Debug ---');
        console.log('DB Path:', dbPath, '| Exists:', fs.existsSync(dbPath), '| Size:', dbSize);
        console.log('VPS Uploads:', vpsUploads, '| Exists:', fs.existsSync(vpsUploads));
        console.log('Local Uploads:', localUploads, '| Exists:', fs.existsSync(localUploads));
        console.log('Total Uploads Size:', uploadsSize);
        console.log('---------------------------');

        res.json({
            dbSize,
            uploadsSize,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error getting system status:", error);
        res.status(500).json({ error: "Failed to get system status" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access form other computers via: http://localhost:${PORT}`);
});

