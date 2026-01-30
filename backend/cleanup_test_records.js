const sqlite3 = require('sqlite3').verbose();
const dbPath = './sistema_neuro.db';
const db = new sqlite3.Database(dbPath);

console.log('\n=== Buscando HCs de teste ===\n');

// Buscar registros com HC 9999, 8888, etc
db.all(`
    SELECT id, clinicalHistoryNumber, firstName, lastName, dni, registrationDate
    FROM patients 
    WHERE clinicalHistoryNumber IN ('9999', '8888', '171797', '000001')
    ORDER BY id DESC
`, [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }

    console.log(`Encontrados ${rows.length} registros de teste:\n`);
    rows.forEach(row => {
        console.log(`ID: ${row.id} | HC: ${row.clinicalHistoryNumber} | Nome: ${row.firstName} ${row.lastName} | DNI: ${row.dni}`);
    });

    console.log('\n=== Deletando registros de teste ===\n');

    // Deletar registros de teste (com DNI de teste ou nome TESTE)
    db.run(`
        DELETE FROM patients 
        WHERE dni IN ('12345678', '87654321') 
        OR lastName LIKE '%TESTE%'
    `, [], function (err) {
        if (err) {
            console.error('Error ao deletar:', err);
        } else {
            console.log(`✅ ${this.changes} registros de teste deletados com sucesso!`);
        }
        db.close();
    });
});
