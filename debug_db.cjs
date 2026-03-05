const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

db.get("SELECT logoUrl FROM settings", (err, row) => {
    if (err) {
        console.error("Error:", err);
    } else {
        console.log("logoUrl is:", row ? row.logoUrl : 'No settings found');
    }
    db.close();
});
