const db = require('./db');

setTimeout(() => {
    db.all("SELECT count(*) as count FROM patients", [], (err, rows) => {
        if (err) {
            console.error("Error querying patients:", err);
        } else {
            console.log("Patient count in DB:", rows[0].count);
        }

        db.all("SELECT id, firstName, lastName, fullName FROM patients LIMIT 5", [], (err, rows) => {
            if (err) console.error(err);
            else console.log("Sample patients:", rows);
        });
    });
}, 1000);
