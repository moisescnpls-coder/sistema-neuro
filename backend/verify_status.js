const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando status de citas...\n');

// Check for any appointments with 'Completado' status
db.all(
    `SELECT COUNT(*) as count FROM appointments WHERE status = 'Completado'`,
    [],
    (err, rows) => {
        if (err) {
            console.error('Error:', err);
        } else {
            const completadoCount = rows[0].count;
            console.log(`📊 Citas con status "Completado": ${completadoCount}`);
        }

        // Check for 'Realizado' status
        db.all(
            `SELECT COUNT(*) as count FROM appointments WHERE status = 'Realizado'`,
            [],
            (err, rows) => {
                if (err) {
                    console.error('Error:', err);
                } else {
                    const realizadoCount = rows[0].count;
                    console.log(`✅ Citas con status "Realizado": ${realizadoCount}\n`);
                }

                // Show all distinct statuses
                db.all(
                    `SELECT DISTINCT status, COUNT(*) as count FROM appointments GROUP BY status`,
                    [],
                    (err, statuses) => {
                        if (err) {
                            console.error('Error:', err);
                        } else {
                            console.log('📋 Todos los status en la base de datos:');
                            console.log('─'.repeat(40));
                            statuses.forEach(s => {
                                console.log(`  ${s.status}: ${s.count}`);
                            });
                            console.log('─'.repeat(40));
                        }
                        db.close();
                    }
                );
            }
        );
    }
);
