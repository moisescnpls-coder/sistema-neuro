const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'sistema_neuro.db');
// Use local time for backup filename
const now = new Date();
const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
const backupPath = path.join(__dirname, `backup_before_cleanup_${localDate}.db`);

console.log('🔄 Script de limpieza segura de datos de prueba\n');
console.log('Este script:');
console.log('1. Crea un backup automático de la base de datos');
console.log('2. Limpia SOLO el historial del paciente de prueba (C.E: 005601803)');
console.log('3. Mantiene el paciente registrado para nuevas pruebas\n');

// Paso 1: Crear backup
console.log('📦 Paso 1: Creando backup...');
fs.copyFileSync(dbPath, backupPath);
console.log(`✅ Backup creado: ${backupPath}\n`);

// Paso 2: Limpiar datos
const db = new sqlite3.Database(dbPath);

// Buscar el ID del paciente
db.get("SELECT id, firstName, lastName, dni FROM patients WHERE dni = ? OR dni = ?",
    ['005601803', '5601803'],
    (err, patient) => {
        if (err) {
            console.error('❌ Error:', err);
            db.close();
            return;
        }

        if (!patient) {
            console.log('❌ Paciente no encontrado');
            db.close();
            return;
        }

        console.log('✅ Paciente encontrado:');
        console.log(`   ID: ${patient.id}`);
        console.log(`   Nombre: ${patient.firstName} ${patient.lastName}`);
        console.log(`   Documento: ${patient.dni}\n`);

        const patientId = patient.id;

        console.log('🗑️  Paso 2: Eliminando registros de este paciente...\n');

        // Eliminar en orden para evitar problemas de foreign keys
        const deletions = [
            { table: 'exam_results', query: 'DELETE FROM exam_results WHERE examId IN (SELECT id FROM exams WHERE patientId = ?)' },
            { table: 'exams', query: 'DELETE FROM exams WHERE patientId = ?' },
            { table: 'prescriptions', query: 'DELETE FROM prescriptions WHERE patientId = ?' },
            { table: 'triage', query: 'DELETE FROM triage WHERE patientId = ?' },
            { table: 'history', query: 'DELETE FROM history WHERE patientId = ?' },
            { table: 'appointments', query: 'DELETE FROM appointments WHERE patientId = ?' }
        ];

        let completed = 0;
        const results = {};

        deletions.forEach(del => {
            db.run(del.query, [patientId], function (err) {
                if (err) {
                    console.error(`❌ Error eliminando de ${del.table}:`, err);
                    results[del.table] = { success: false, error: err.message };
                } else {
                    results[del.table] = { success: true, deleted: this.changes };
                    console.log(`   ✅ ${del.table}: ${this.changes} registro(s) eliminado(s)`);
                }

                completed++;

                if (completed === deletions.length) {
                    console.log('\n' + '='.repeat(80));
                    console.log('✅ LIMPIEZA COMPLETADA');
                    console.log('='.repeat(80));
                    console.log('\nResumen:');
                    Object.keys(results).forEach(table => {
                        const r = results[table];
                        if (r.success) {
                            console.log(`  ${table}: ${r.deleted} eliminado(s)`);
                        }
                    });
                    console.log('\n📋 El paciente sigue registrado y listo para nuevos datos');
                    console.log(`💾 Backup guardado en: ${backupPath}`);
                    console.log('\n⚠️  Si algo sale mal, puedes restaurar con:');
                    console.log(`   Renombrar "${backupPath}" a "sistema_neuro.db"`);

                    db.close();
                }
            });
        });
    }
);
