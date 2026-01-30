const { DBFFile } = require('dbffile');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const dbfPath = path.join(__dirname, 'data', '_PAC001.DBF');
const HC_TARGET = '8257';

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
        if (d instanceof Date) {
            return d.toISOString().split('T')[0];
        }
        return d;
    } catch (e) {
        return '';
    }
};

async function debugImport() {
    try {
        console.log('Opening DBF...');
        const dbf = await DBFFile.open(dbfPath);
        const records = await dbf.readRecords(dbf.recordCount + 100);

        const targets = records.filter(r => (r.P_HISTORIA || '').trim() === HC_TARGET);

        if (targets.length === 0) {
            console.log('Record not found in DBF!');
            return;
        }

        console.log(`Found ${targets.length} records searching for HC ${HC_TARGET}:`);
        targets.forEach(t => console.log(` - ${t.P_PACIENTE}`));

        const sql = `INSERT INTO patients (
            firstName, lastName, fullName, dni, phone, email, birthDate, gender, 
            clinicalHistoryNumber, maritalStatus, documentType, registrationDate,
            address, department, province, district
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        for (const target of targets) {
            const r = target;
            const fullName = (r.P_PACIENTE || '').trim();
            console.log(`\nAttempting import for: ${fullName}`);

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
            const address = (r.P_DIRECCIO || '').trim();
            const department = (r.P_DPTO || '').trim();
            const province = (r.P_PROV || '').trim();
            const district = (r.P_DIST || '').trim();

            const params = [
                firstName, lastName, fullName, dni, phone, email, birthDate, gender,
                hc, maritalStatus, documentType, registrationDate,
                address, department, province, district
            ];

            await new Promise((resolve) => {
                db.run(sql, params, function (err) {
                    if (err) {
                        console.error('INSERT FAILED:', err.message);
                    } else {
                        console.log('INSERT SUCCESS! New ID:', this.lastID);
                    }
                    resolve();
                });
            });
        }

        db.close();

    } catch (e) {
        console.error('Script error:', e);
    }
}

debugImport();
