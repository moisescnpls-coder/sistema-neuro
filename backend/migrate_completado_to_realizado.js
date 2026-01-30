const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Iniciando migración de status "Completado" a "Realizado"...\n');

// Update appointments table
db.run(
    `UPDATE appointments SET status = 'Realizado' WHERE status = 'Completado'`,
    function (err) {
        if (err) {
            console.error('❌ Error al actualizar appointments:', err);
        } else {
            console.log(`✅ Actualizado ${this.changes} registros en appointments`);
        }

        // Close the database connection
        db.close((err) => {
            if (err) {
                console.error('Error cerrando la base de datos:', err);
            } else {
                console.log('\n✅ Migración completada exitosamente!');
                console.log('Todos los status "Completado" han sido cambiados a "Realizado".');
            }
        });
    }
);
