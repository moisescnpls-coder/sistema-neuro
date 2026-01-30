const { DBFFile } = require('dbffile');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const dbfPath = path.join(__dirname, 'data', '_PAC001.DBF');

const db = new sqlite3.Database(dbPath);

const mapGender = (g) => {
    if (!g) return '';
    const u = g.toUpperCase();
    if (u === 'M') return 'Masculino';
    if (u === 'F') return 'Feminino';
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
        if (d instanceof Date) return d.toISOString().split('T')[0];
        return d;
    } catch (e) {
        return '';
    }
};

async function importMissing() {
    try {
        console.log('Loading existing HCs...');
        const sqliteHCs = new Set();

        await new Promise((resolve, reject) => {
            db.all("SELECT clinicalHistoryNumber FROM patients", [], (err, rows) => {
                if (err) reject(err);
                else {
                    rows.forEach(r => {
                        if (r.clinicalHistoryNumber) sqliteHCs.add(r.clinicalHistoryNumber.trim());
                    });
                    resolve();
                }
            });
        });

        console.log(`Loaded ${sqliteHCs.size} existing HCs.`);
        const dbf = await DBFFile.open(dbfPath);
        console.log(`Scanning ${dbf.recordCount} DBF records...`);

        const records = await dbf.readRecords(dbf.recordCount + 100);
        const missing = records.filter(r => {
            const hc = (r.P_HISTORIA || '').trim();
            return hc && !sqliteHCs.has(hc);
        });

        console.log(`Found ${missing.length} missing records to import.`);

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            const sql = `INSERT INTO patients (
                firstName, lastName, fullName, dni, phone, email, birthDate, gender, 
                clinicalHistoryNumber, maritalStatus, documentType, registrationDate,
                address, department, province, district
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const stmt = db.prepare(sql);
            let inserted = 0;
            let errors = 0;

            missing.forEach(r => {
                const fullName = (r.P_PACIENTE || '').trim();
                let dni = (r.P_DNI || '').trim();
                if (dni === '') dni = null;

                const hc = (r.P_HISTORIA || '').trim();
                const lastName = fullName;
                const firstName = '';
                const phone = (r.P_TFNO || '').trim();
                const email = '';
                const birthDate = formatDate(r.P_FECNAC);
                const gender = mapGender(r.P_SEXO);
                const maritalStatus = mapMarital(r.P_ES_CIVIL);
                const documentType = dni ? 'DNI' : '';
                const registrationDate = formatDate(r.P_FECREG);
                const address = (r.P_DIREC || '').trim(); // Using verified P_DIREC
                const department = (r.P_DPTO || '').trim();
                const province = (r.P_PROV || '').trim();
                const district = (r.P_DIST || '').trim();

                stmt.run([
                    firstName, lastName, fullName, dni, phone, email, birthDate, gender,
                    hc, maritalStatus, documentType, registrationDate,
                    address, department, province, district
                ], (err) => {
                    if (err) {
                        console.error(`Error inserting HC ${hc}:`, err.message);
                        errors++;
                    } else {
                        inserted++;
                    }
                });
            });

            stmt.finalize();
            db.run("COMMIT", () => {
                console.log('Import completed.');
                console.log(`Inserted: ${inserted}`);
                console.log(`Errors: ${errors}`);
                db.close();
            });
        });

    } catch (err) {
        console.error('Fatal error:', err);
    }
}

importMissing();
