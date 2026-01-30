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
        // DBF dates often come as Dates or strings. 
        // If it's a Date object:
        if (d instanceof Date) {
            return d.toISOString().split('T')[0];
        }
        // If string YYYYMMDD?
        return d;
    } catch (e) {
        return '';
    }
};

async function importData() {
    try {
        console.log('Opening DBF...');
        const dbf = await DBFFile.open(dbfPath);
        console.log(`Found ${dbf.recordCount} records.`);

        // Read in chunks to avoid memory issues if large
        const batchSize = 100;
        let processed = 0;
        let inserted = 0;
        let errors = 0;

        // Prepare statement
        const sql = `INSERT INTO patients (
            firstName, lastName, fullName, dni, phone, email, birthDate, gender, 
            clinicalHistoryNumber, maritalStatus, documentType, registrationDate,
            address, department, province, district
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        // We wrap db operations in promises for sequential execution or use serialize
        // Basic batching approach

        let records = await dbf.readRecords(100); // initial read
        // dbffile readRecords reads *next* batch. 

        // Actually dbffile API: readRecords(maxRows)
        // We need to loop. open() returns instance.
        // It keeps checking file set.

        // Re-open to be sure or just read all if memory allows (13k records is small enough for modern node ~ 5MB file)
        // safe to read all
        records = await dbf.readRecords(dbf.recordCount + 100);

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            const stmt = db.prepare(sql);

            records.forEach(r => {
                try {
                    const fullName = (r.P_PACIENTE || '').trim();
                    if (!fullName) return; // skip empty names

                    // Treat empty DNI as null to avoid UNIQUE constraint on ''
                    let dni = (r.P_DNI || '').trim();
                    if (dni === '') dni = null;

                    const hc = (r.P_HISTORIA || '').trim();

                    // User Request: "Legacy names... into the 'Surname' field, and the 'Name' field will be left blank"
                    // And "Legacy names... into a new 'fullName' field"
                    const lastName = fullName;
                    const firstName = '';

                    const phone = (r.P_TFNO || '').trim();
                    const email = ''; // No email in DBF
                    const birthDate = formatDate(r.P_FECNAC);
                    const gender = mapGender(r.P_SEXO);
                    const maritalStatus = mapMarital(r.P_ES_CIVIL);
                    const documentType = dni ? 'DNI' : '';
                    const registrationDate = formatDate(r.P_FECREG);

                    // Address
                    const address = (r.P_DIRECCIO || '').trim();
                    const department = (r.P_DPTO || '').trim();
                    const province = (r.P_PROV || '').trim();
                    const district = (r.P_DIST || '').trim();

                    stmt.run([
                        firstName, lastName, fullName, dni, phone, email, birthDate, gender,
                        hc, maritalStatus, documentType, registrationDate,
                        address, department, province, district
                    ], (err) => {
                        if (err) {
                            console.error(`Error inserting HC:${hc}`, err.message);
                            errors++;
                        } else {
                            inserted++;
                        }
                    });

                    processed++;
                } catch (e) {
                    console.error('Record error:', e);
                    errors++;
                }
            });

            stmt.finalize();
            db.run("COMMIT", () => {
                console.log('Import completed.');
                console.log(`Processed: ${processed}`);
                console.log(`Inserted: ${inserted}`);
                console.log(`Errors: ${errors}`);
                db.close();
            });
        });

    } catch (err) {
        console.error('Import failed:', err);
    }
}

importData();
