const db = require('./db');

const sql = "SELECT id, username, name, role FROM users";
db.all(sql, [], (err, rows) => {
    if (err) {
        console.error(err.message);
        return;
    }
    console.log("Users in Database:");
    console.table(rows);
});
