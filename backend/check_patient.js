const { DBFFile } = require('dbffile');
const path = require('path');

const dbfPath = path.join(__dirname, 'data', '_PAC001.DBF');
const HC_TARGET = '8257';

async function searchDBF() {
    try {
        console.log(`Opening DBF: ${dbfPath}`);
        const dbf = await DBFFile.open(dbfPath);

        const records = await dbf.readRecords(dbf.recordCount + 100);

        console.log('Fields available:', dbf.fields.map(f => f.name));

        // Return early to just see fields first
        // return;

        console.log(`Searching for HC including '${HC_TARGET}' AND Name including 'VASQUEZ'...`);

        const foundHC = records.filter(r => String(r.P_HISTORIA || '').includes(HC_TARGET));
        // const foundName = records.filter(r => String(r.P_PACIENTE || '').includes('VASQUEZ'));

        console.log(`\n--- Found by HC '${HC_TARGET}' (${foundHC.length}) ---`);
        foundHC.forEach(r => {
            console.log(`Name: ${r.P_PACIENTE}`);
            console.log(`HC: ${JSON.stringify(r.P_HISTORIA)}`);
            console.log(`Address: ${r.P_DIREC}`);
            // console.log(`Deleted?: ${r.P_BORRADO}`);
            console.log('---');
        });

        // console.log(`\n--- Found by Name 'VASQUEZ' (${foundName.length}) ---`);
        // foundName.forEach(r => {
        //     console.log(`Name: ${r.P_PACIENTE}`);
        //     console.log(`HC: ${JSON.stringify(r.P_HISTORIA)}`);
        //     console.log(`Address: ${r.P_DIRECCIO}`);
        //     console.log('---');
        // });

    } catch (err) {
        console.error('Error:', err);
    }
}

searchDBF();
