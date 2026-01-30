const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run("DELETE FROM role_permissions WHERE role = 'recepcion' AND permission_key = 'manage_users'", function (err) {
        if (err) {
            console.error(err.message);
        } else {
            console.log(`Deleted ${this.changes} rows (manage_users for recepcion)`);
        }
    });
});

db.close();
