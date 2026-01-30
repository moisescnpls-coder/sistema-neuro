const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log("Permissions for 'recepcion':");
db.all("SELECT permission_key FROM role_permissions WHERE role = 'recepcion'", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log(rows.map(r => r.permission_key));
    }
    db.close();
});
