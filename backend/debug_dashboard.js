const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./sistema_neuro.db');

const run = async () => {
    console.log("Connecting to DB...");

    // Check tables
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) console.error("Error checking tables:", err);
        else console.log("Tables:", rows.map(r => r.name));
    });

    // 1. Raw Count
    db.get("SELECT COUNT(*) as c FROM appointments", (err, row) => {
        if (err) console.error("Error 1 (Raw Count):", err);
        else console.log("Total Appointments (Raw):", row?.c);
    });

    // 2. Count with valid date
    db.get("SELECT COUNT(*) as c FROM appointments WHERE date IS NOT NULL AND date != ''", (err, row) => {
        if (err) console.error("Error 2 (Valid Date):", err);
        else console.log("Appointments with Date:", row?.c);
    });

    // 3. Sample Dates
    db.all("SELECT date, status FROM appointments LIMIT 10", (err, rows) => {
        if (err) console.error("Error 3 (Sample):", err);
        else console.log("Sample rows:", rows);
    });
};

run();
