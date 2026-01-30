const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend/sistema_neuro.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to database at ' + dbPath);
    }
});

const searchTerm = 'VILLEGAS';
const document = '75674384';

console.log(`Searching for name containing "${searchTerm}" or DNI "${document}"...`);

const sql = `SELECT * FROM patients WHERE fullName LIKE ? OR firstName LIKE ? OR lastName LIKE ? OR dni = ?`;

db.all(sql, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, document], (err, rows) => {
    if (err) {
        console.error('Query Error:', err);
    } else {
        console.log('Rows found:', rows.length);
        rows.forEach((row) => {
            console.log('------------------------------------------------');
            console.log('ID:', row.id);
            console.log('Full Name:', row.fullName);
            console.log('First Name:', row.firstName);
            console.log('Last Name:', row.lastName);
            console.log('DNI:', row.dni);
            console.log('HC (clinicalHistoryNumber):', row.clinicalHistoryNumber);
            console.log('------------------------------------------------');
        });
    }
});

db.close();
