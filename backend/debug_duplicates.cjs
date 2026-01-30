const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const outputPath = path.join(__dirname, 'debug_duplicates.txt');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err);
    }
});

const searchTerm = 'ALEMAN RUJEL GRACIELA';

let output = `Searching for name containing "${searchTerm}"...\n\n`;

const sql = `SELECT * FROM patients WHERE fullName LIKE ? OR firstName LIKE ? OR lastName LIKE ?`;

db.all(sql, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`], (err, rows) => {
    if (err) {
        output += `Query Error: ${err.message}\n`;
    } else {
        output += `Rows found: ${rows.length}\n`;
        rows.forEach((row) => {
            output += '------------------------------------------------\n';
            output += `ID: ${row.id}\n`;
            output += `Full Name: ${row.fullName}\n`;
            output += `First Name: ${row.firstName}\n`;
            output += `Last Name: ${row.lastName}\n`;
            output += `DNI: ${row.dni}\n`;
            output += `HC: ${row.clinicalHistoryNumber}\n`;
            output += `Reg Date: ${row.registrationDate}\n`;
            output += '------------------------------------------------\n';
        });
    }

    fs.writeFileSync(outputPath, output, 'utf8');
    console.log('Output written to ' + outputPath);
    db.close();
});
