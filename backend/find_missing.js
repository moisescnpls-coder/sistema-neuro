const { DBFFile } = require('dbffile');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const dbfPath = path.join(__dirname, 'data', '_PAC001.DBF');

const db = new sqlite3.Database(dbPath);

async function findMissing() {
    try {
        console.log('Analysis starting...');
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

        const dbf = await DBFFile.open(dbfPath);
        const records = await dbf.readRecords(dbf.recordCount + 100);

        let missingCount = 0;
        let duplicateDBFCount = 0;
        let emptyHCCount = 0;
        const seenHCsInDBF = new Set();
        const missingExamples = [];

        records.forEach(r => {
            const hc = (r.P_HISTORIA || '').trim();
            const name = (r.P_PACIENTE || '').trim();

            if (!hc) {
                emptyHCCount++;
                return;
            }

            if (seenHCsInDBF.has(hc)) {
                duplicateDBFCount++;
            } else {
                seenHCsInDBF.add(hc);
            }

            if (!sqliteHCs.has(hc)) {
                missingCount++;
                if (missingExamples.length < 5) {
                    missingExamples.push({ hc, name, deleted: r.P_BORRADO });
                }
            }
        });

        const stats = {
            totalDBF: dbf.recordCount,
            totalSQLite: sqliteHCs.size,
            emptyHCsInDBF: emptyHCCount,
            duplicateHCsInDBF: duplicateDBFCount,
            missingInSQLite: missingCount,
            missingExamples: missingExamples
        };

        console.log('JSON_RESULT:' + JSON.stringify(stats, null, 2));

        db.close();

    } catch (err) {
        console.error('Error:', err);
    }
}

findMissing();
