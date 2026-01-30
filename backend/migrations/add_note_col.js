const db = require('../db');

console.log("Adding 'note' column to exam_results...");

db.run("ALTER TABLE exam_results ADD COLUMN note TEXT", (err) => {
    if (err) {
        if (err.message.includes("duplicate column name")) {
            console.log("Column 'note' already exists.");
        } else {
            console.error("Error adding column:", err.message);
        }
    } else {
        console.log("Column 'note' added successfully.");
    }
});
