const { DBFFile } = require('dbffile');
const path = require('path');

const dbfPath = path.join(__dirname, 'data', '_PAC001.DBF');

async function inspect() {
    try {
        const dbf = await DBFFile.open(dbfPath);
        console.log('DBF Info:');
        console.log(`Record Count: ${dbf.recordCount}`);
        console.log('Fields:');
        dbf.fields.forEach(field => {
            console.log(`- ${field.name} (${field.type}, size: ${field.size})`);
        });

        console.log('\nSample Records (first 3):');
        const records = await dbf.readRecords(3);
        records.forEach(r => console.log(r));

    } catch (err) {
        console.error('Error reading DBF:', err);
    }
}

inspect();
