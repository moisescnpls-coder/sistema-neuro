const { DBFFile } = require('dbffile');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Configuración de rutas
const dbPath = path.join(__dirname, 'sistema_neuro.db');
const dbfPath = path.join(__dirname, 'data', '_PAC001.DBF');

const db = new sqlite3.Database(dbPath);

// Utilidades de mapeo
const mapGender = (g) => {
    if (!g) return '';
    const u = g.toUpperCase();
    if (u === 'M') return 'Masculino';
    if (u === 'F') return 'Femenino';
    return u;
};

const mapMarital = (m) => {
    if (!m) return '';
    const u = m.toUpperCase();
    if (u === 'S') return 'Soltero';
    if (u === 'C') return 'Casado';
    if (u === 'V') return 'Viudo';
    if (u === 'D') return 'Divorciado';
    return 'Otro';
};

const formatDate = (d) => {
    if (!d) return '';
    try {
        if (d instanceof Date) {
            return d.toISOString().split('T')[0];
        }
        return d;
    } catch (e) {
        return '';
    }
};

// Función principal
async function importDataIncremental() {
    console.log('--- INICIANDO IMPORTACIÓN INCREMENTAL ---');
    console.log(`Base de datos: ${dbPath}`);
    console.log(`Archivo DBF: ${dbfPath}`);

    try {
        console.log('Abriendo archivo DBF...');
        let dbf;
        try {
            dbf = await DBFFile.open(dbfPath);
        } catch (err) {
            console.error("Error al abrir _PAC001.DBF. Asegúrese de que el archivo exista en la carpeta 'backend/data'.");
            console.error(err.message);
            return;
        }

        console.log(`Registros encontrados en DBF: ${dbf.recordCount}`);

        // Leer todos los registros del DBF
        const records = await dbf.readRecords(dbf.recordCount + 100);

        let processed = 0;
        let inserted = 0;
        let skipped = 0;
        let errors = 0;

        console.log('Procesando registros...');

        // Usamos una promesa global para manejar la asincronía de la base de datos
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run("BEGIN TRANSACTION");

                // Preparamos las consultas
                const checkStmt = db.prepare("SELECT id FROM patients WHERE (dni = ? AND dni IS NOT NULL AND dni != '') OR (clinicalHistoryNumber = ? AND clinicalHistoryNumber IS NOT NULL AND clinicalHistoryNumber != '')");

                const insertStmt = db.prepare(`INSERT INTO patients (
                    firstName, lastName, fullName, dni, phone, email, birthDate, gender, 
                    clinicalHistoryNumber, maritalStatus, documentType, registrationDate,
                    address, department, province, district
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

                // Procesamos secuencialmente usando promesas para esperar cada verificación
                // Sin embargo, en sqlite3 nodejs, las llamadas son asincronas pero serialize las pone en cola.
                // El problema es que necesitamos el resultado del SELECT para decidir el INSERT dentro de la misma transacción.
                // La forma más robusta en este driver simple es hacerlo uno por uno o cargar todo en memoria primero.

                // Opción: Cargar todos los DNIs e Historias existentes en memoria para verificación rápida
                console.log("Cargando pacientes existentes en memoria para comparación rápida...");
                db.all("SELECT dni, clinicalHistoryNumber FROM patients", [], (err, existingRows) => {
                    if (err) {
                        console.error("Error al leer base de datos:", err);
                        db.run("ROLLBACK");
                        return resolve();
                    }

                    // Crear Sets para búsqueda rápida O(1)
                    const existingDNIs = new Set();
                    const existingHCs = new Set();

                    existingRows.forEach(row => {
                        if (row.dni) existingDNIs.add(row.dni.trim());
                        if (row.clinicalHistoryNumber) existingHCs.add(row.clinicalHistoryNumber.trim());
                    });

                    console.log(`Pacientes actuales en sistema: ${existingRows.length}`);

                    records.forEach(r => {
                        try {
                            const fullName = (r.P_PACIENTE || '').trim();
                            if (!fullName) return; // Saltar nombres vacíos

                            let dni = (r.P_DNI || '').trim();
                            if (dni === '') dni = null;

                            const hc = (r.P_HISTORIA || '').trim();

                            // VERIFICACIÓN DE DUPLICADOS
                            let exists = false;

                            // Verificar por DNI si existe
                            if (dni && existingDNIs.has(dni)) {
                                exists = true;
                            }
                            // Verificar por HC si existe (y si no es vacía)
                            if (hc && existingHCs.has(hc)) {
                                exists = true;
                            }

                            if (exists) {
                                skipped++;
                                // console.log(`Saltando existente: ${fullName} (DNI: ${dni}, HC: ${hc})`);
                                processed++;
                                return;
                            }

                            // Si no existe, preparamos datos para insertar
                            const lastName = fullName; // Legado: Todo el nombre en apellido o nombre completo
                            const firstName = '';

                            const phone = (r.P_TFNO || '').trim();
                            const email = '';
                            const birthDate = formatDate(r.P_FECNAC);
                            const gender = mapGender(r.P_SEXO);
                            const maritalStatus = mapMarital(r.P_ES_CIVIL);
                            const documentType = dni ? 'DNI' : '';
                            const registrationDate = formatDate(r.P_FECREG);

                            const address = (r.P_DIRECCIO || '').trim();
                            const department = (r.P_DPTO || '').trim();
                            const province = (r.P_PROV || '').trim();
                            const district = (r.P_DIST || '').trim();

                            insertStmt.run([
                                firstName, lastName, fullName, dni, phone, email, birthDate, gender,
                                hc, maritalStatus, documentType, registrationDate,
                                address, department, province, district
                            ], (err) => {
                                if (err) {
                                    console.error(`Error al insertar ${fullName}:`, err.message);
                                    errors++;
                                } else {
                                    inserted++;
                                }
                            });

                            processed++;

                        } catch (e) {
                            console.error('Error procesando registro:', e);
                            errors++;
                        }
                    });

                    // Finalizar y cerrar
                    insertStmt.finalize();
                    db.run("COMMIT", () => {
                        console.log('-------------------------------------------');
                        console.log('IMPORTACIÓN COMPLETADA');
                        console.log(`Total Procesados del DBF: ${processed}`);
                        console.log(`Nuevos Insertados:        ${inserted}`);
                        console.log(`Saltados (Ya existen):    ${skipped}`);
                        console.log(`Errores:                  ${errors}`);
                        console.log('-------------------------------------------');
                        db.close(resolve);
                    });
                });
            });
        });

    } catch (err) {
        console.error('Error fatal en la importación:', err);
    }
}

importDataIncremental();
