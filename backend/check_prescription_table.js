const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando estructura de tabla prescriptions...\n');

db.all("PRAGMA table_info(prescriptions)", [], (err, columns) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }

    console.log('Columnas en tabla prescriptions:');
    console.log('='.repeat(80));
    columns.forEach(col => {
        console.log(`  ${col.name.padEnd(20)} | ${col.type.padEnd(10)} | PK: ${col.pk} | NotNull: ${col.notnull}`);
    });
    console.log('='.repeat(80));

    const hasCreatedBy = columns.some(c => c.name === 'createdBy');
    const hasCreatedAt = columns.some(c => c.name === 'createdAt');

    console.log(`\n✓ createdBy existe: ${hasCreatedBy ? '✅ SÍ' : '❌ NO'}`);
    console.log(`✓ createdAt existe: ${hasCreatedAt ? '✅ SÍ' : '❌ NO'}`);

    db.close();
});
