const sqlite3 = require('sqlite3').verbose();
const dbPath = './sistema_neuro.db';
const db = new sqlite3.Database(dbPath);

// Verificar se há triggers
db.all("SELECT * FROM sqlite_master WHERE type='trigger'", [], (err, triggers) => {
    if (err) {
        console.error('Error checking triggers:', err);
    } else {
        console.log('\n=== TRIGGERS NO BANCO ===');
        if (triggers.length === 0) {
            console.log('Nenhum trigger encontrado');
        } else {
            triggers.forEach(t => {
                console.log('\nNome:', t.name);
                console.log('SQL:', t.sql);
            });
        }
    }
    db.close();
});
