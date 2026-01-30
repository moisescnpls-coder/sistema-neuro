const db = require('./db');
const bcrypt = require('bcryptjs');

const updates = [
    { username: 'admin', name: 'Administrador' }, // Correcting typo "Adeministrador" to "Administrador" or user preference? User said "Adeministrador" in example but likely meant "Administrador". I'll use "Administrador" properly.
    { username: 'lkopen', name: 'LUCRECIA COMPEN KONG' }
];

updates.forEach(u => {
    db.run("UPDATE users SET name = ? WHERE username = ?", [u.name, u.username], function (err) {
        if (err) return console.error(err.message);
        console.log(`Updated ${u.username}: Rows affected: ${this.changes}`);
    });
});
