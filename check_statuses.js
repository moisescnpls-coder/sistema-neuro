const db = require('./backend/db');

db.all("SELECT DISTINCT status FROM appointments", [], (err, rows) => {
    if (err) {
        console.error("Error:", err.message);
    } else {
        console.log("Distinct Statuses:", rows);
    }
});
