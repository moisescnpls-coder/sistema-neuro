const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

const migrations = [
    "ALTER TABLE prescriptions ADD COLUMN appointmentId INTEGER",
    "ALTER TABLE exams ADD COLUMN appointmentId INTEGER",
    "ALTER TABLE history ADD COLUMN appointmentId INTEGER",
    "ALTER TABLE appointments ADD COLUMN diagnosis TEXT"
];

db.serialize(() => {
    migrations.forEach(sql => {
        db.run(sql, (err) => {
            if (err) {
                if (err.message.includes("duplicate column")) {
                    console.log(`Skipping: Column already exists (${sql})`);
                } else {
                    console.error(`Error executing ${sql}:`, err.message);
                }
            } else {
                console.log(`Success: ${sql}`);
            }
        });
    });
});

db.close(() => {
    console.log("Migration check completed.");
});
