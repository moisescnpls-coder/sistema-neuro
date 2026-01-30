const { DBFFile } = require('dbffile');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const dbfPath = path.join(__dirname, 'data', '_PAC001.DBF');

const db = new sqlite3.Database(dbPath);

async function updateAddresses() {
    try {
        console.log('Opening DBF...');
        const dbf = await DBFFile.open(dbfPath);
        console.log(`Reading ${dbf.recordCount} records...`);

        const records = await dbf.readRecords(dbf.recordCount + 100);

        console.log('Starting address updates...');
        let updated = 0;
        let diffs = 0;

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            const stmt = db.prepare("UPDATE patients SET address = ? WHERE clinicalHistoryNumber = ?");

            records.forEach(r => {
                const hc = (r.P_HISTORIA || '').trim();
                const address = (r.P_DIREC || '').trim();

                if (hc && address) {
                    stmt.run([address, hc], function (err) {
                        if (err) console.error(`Error updating HC ${hc}:`, err.message);
                        else if (this.changes > 0) {
                            updated++;
                            if (updated % 1000 === 0) console.log(`Updated ${updated} addresses...`);
                        }
                    });
                }
            });

            stmt.finalize();
            db.run("COMMIT", () => {
                console.log('Update completed.');
                console.log(`Total addresses updated: ${updated}`);
                db.close();
            });
        });

    } catch (err) {
        console.error('Script failed:', err);
    }
}

updateAddresses();
