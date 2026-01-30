const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Investigando paciente C.E: 005601803...\n');

// Find patient
db.get("SELECT * FROM patients WHERE clinicalHistoryNumber = ?", ['005601803'], (err, patient) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }

    if (!patient) {
        console.log('❌ Paciente no encontrado con HC: 005601803');
        db.close();
        return;
    }

    console.log('✅ Paciente encontrado:');
    console.log(`   ID: ${patient.id}`);
    console.log(`   Nombre: ${patient.firstName} ${patient.lastName}`);
    console.log(`   HC: ${patient.clinicalHistoryNumber}\n`);

    const patientId = patient.id;

    // Check history
    db.all("SELECT * FROM history WHERE patientId = ?", [patientId], (err, history) => {
        console.log(`📋 Entradas manuales de historial: ${history ? history.length : 0}`);
        if (history && history.length > 0) {
            history.forEach(h => {
                console.log(`   - ${h.date} | ${h.type} | ${h.notes?.substring(0, 50)}...`);
            });
        }

        // Check appointments
        db.all("SELECT * FROM appointments WHERE patientId = ?", [patientId], (err, appts) => {
            console.log(`\n📅 Citas: ${appts ? appts.length : 0}`);
            if (appts && appts.length > 0) {
                appts.forEach(a => {
                    console.log(`   - ${a.date} ${a.time} | ${a.status} | ${a.type}`);
                });
            }

            // Check prescriptions
            db.all("SELECT * FROM prescriptions WHERE patientId = ?", [patientId], (err, rx) => {
                console.log(`\n💊 Recetas: ${rx ? rx.length : 0}`);
                if (rx && rx.length > 0) {
                    rx.forEach(r => {
                        console.log(`   - ${r.date} | Doctor: ${r.doctorName}`);
                    });
                }

                // Check exams
                db.all("SELECT * FROM exams WHERE patientId = ?", [patientId], (err, exams) => {
                    console.log(`\n🔬 Exámenes: ${exams ? exams.length : 0}`);
                    if (exams && exams.length > 0) {
                        exams.forEach(e => {
                            console.log(`   - ${e.date} | ${e.type} | ${e.status}`);
                        });
                    }

                    // Check triage
                    db.all("SELECT * FROM triage WHERE patientId = ?", [patientId], (err, triage) => {
                        console.log(`\n🏥 Triajes: ${triage ? triage.length : 0}`);
                        if (triage && triage.length > 0) {
                            triage.forEach(t => {
                                console.log(`   - ${t.date} | Peso: ${t.weight}kg | Altura: ${t.height}cm`);
                            });
                        }

                        console.log('\n' + '='.repeat(60));
                        const total = (history?.length || 0) + (appts?.length || 0) +
                            (rx?.length || 0) + (exams?.length || 0) + (triage?.length || 0);
                        console.log(`📊 TOTAL de registros para este paciente: ${total}`);
                        console.log('='.repeat(60));

                        db.close();
                    });
                });
            });
        });
    });
});
