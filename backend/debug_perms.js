const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

const output = {
    roles: [],
    role_permissions: []
};

db.serialize(() => {
    db.all("SELECT DISTINCT role FROM users", [], (err, roles) => {
        if (err) console.error(err);
        output.roles = roles;
    });

    db.all("SELECT * FROM role_permissions", [], (err, rows) => {
        if (err) console.error(err);
        output.role_permissions = rows;
        fs.writeFileSync(path.resolve(__dirname, 'db_dump.json'), JSON.stringify(output, null, 2));
        console.log('Done mapping DB to db_dump.json');
        db.close();
    });
});
