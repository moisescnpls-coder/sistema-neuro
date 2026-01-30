const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando status de citas en la base de datos...\n');

// Check for appointments with status 'Completado'
db.all(
    `SELECT id, patientName, date, time, status FROM appointments WHERE status = 'Completado' ORDER BY date DESC, time DESC LIMIT 10`,
    [],
    (err, rows) => {
        if (err) {
            console.error('❌ Error al consultar:', err);
        } else {
            if (rows.length > 0) {
                console.log(`⚠️  Encontradas ${rows.length} citas con status "Completado":`);
                console.log('─'.repeat(80));
                rows.forEach(row => {
                    console.log(`ID: ${row.id} | Paciente: ${row.patientName} | Fecha: ${row.date} ${row.time} | Status: ${row.status}`);
                });
                console.log('─'.repeat(80));
            } else {
                console.log('✅ No hay citas con status "Completado"');
            }
        }

        // Check all distinct statuses
        db.all(
            `SELECT DISTINCT status, COUNT(*) as count FROM appointments GROUP BY status`,
            [],
            (err, statuses) => {
                if (err) {
                    console.error('❌ Error:', err);
                } else {
                    console.log('\n📊 Distribución de status:');
                    console.log('─'.repeat(40));
                    statuses.forEach(s => {
                        console.log(`${s.status}: ${s.count} citas`);
                    });
                    console.log('─'.repeat(40));
                }

                db.close();
            }
        );
    }
);
