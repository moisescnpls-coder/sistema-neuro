const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando últimas entradas de historial...\n');

db.all("SELECT * FROM history ORDER BY id DESC LIMIT 5", [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }

    console.log('Últimas 5 entradas de historial:');
    console.log('='.repeat(100));

    rows.forEach(h => {
        console.log(`ID: ${h.id} | Tipo: ${h.type} | Fecha: ${h.date}`);
        console.log(`  createdAt: ${h.createdAt || 'NULL/undefined'}`);
        console.log(`  createdBy: ${h.createdBy || 'NULL/undefined'}`);
        console.log(`  Notas: ${(h.notes || '').substring(0, 50)}...`);
        console.log('');
    });

    console.log('='.repeat(100));

    db.close();
});
