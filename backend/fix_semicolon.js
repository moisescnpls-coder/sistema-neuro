const db = require('./db');

const sqlSearch = "SELECT * FROM patients WHERE firstName LIKE '%;%' OR lastName LIKE '%;%' OR fullName LIKE '%;%'";

db.all(sqlSearch, [], (err, rows) => {
    if (err) return console.error(err.message);
    console.log(`Found ${rows.length} records with ';'. Fixing...`);

    if (rows.length > 0) {
        // Fix firstName
        db.run("UPDATE patients SET firstName = REPLACE(firstName, ';', 'Ñ') WHERE firstName LIKE '%;%'", (err) => {
            if (err) console.error("Error fixing firstName:", err.message);
        });
        // Fix lastName
        db.run("UPDATE patients SET lastName = REPLACE(lastName, ';', 'Ñ') WHERE lastName LIKE '%;%'", (err) => {
            if (err) console.error("Error fixing lastName:", err.message);
        });
        // Fix fullName
        db.run("UPDATE patients SET fullName = REPLACE(fullName, ';', 'Ñ') WHERE fullName LIKE '%;%'", (err) => {
            if (err) console.error("Error fixing fullName:", err.message);
            else console.log("Fixes applied.");
        });
    } else {
        console.log("No records need fixing.");
    }
});
