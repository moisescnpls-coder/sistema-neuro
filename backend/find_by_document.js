const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Buscando paciente con documento C.E: 005601803...\n');

// Search by DNI (document number)
db.get("SELECT * FROM patients WHERE dni = ?", ['005601803'], (err, patient) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }

    if (!patient) {
        console.log('❌ Paciente no encontrado con documento: 005601803');
        console.log('Buscando variantes...\n');

        // Try without leading zeros
        db.get("SELECT * FROM patients WHERE dni = ?", ['5601803'], (err, patient2) => {
            if (patient2) {
                console.log('✅ Encontrado con documento: 5601803 (sin ceros)');
                investigatePatient(patient2);
            } else {
                console.log('❌ No se encontró el paciente\n');
                db.close();
            }
        });
        return;
    }

    investigatePatient(patient);
});

function investigatePatient(patient) {
    console.log('✅ Paciente encontrado:');
    console.log(`   ID: ${patient.id}`);
    console.log(`   Nombre: ${patient.firstName} ${patient.lastName}`);
    console.log(`   Tipo Doc: ${patient.documentType || 'N/A'}`);
    console.log(`   Documento: ${patient.dni}`);
    console.log(`   HC: ${patient.clinicalHistoryNumber || 'N/A'}\n`);

    const patientId = patient.id;

    // Check all records
    db.all("SELECT * FROM history WHERE patientId = ?", [patientId], (err, history) => {
        console.log(`📋 Entradas manuales: ${history ? history.length : 0}`);
        if (history && history.length > 0) {
            history.forEach(h => {
                console.log(`   - ${h.date} | ${h.type} | createdAt: ${h.createdAt || 'N/A'}`);
            });
        }

        db.all("SELECT * FROM appointments WHERE patientId = ?", [patientId], (err, appts) => {
            console.log(`\n📅 Citas: ${appts ? appts.length : 0}`);
            if (appts && appts.length > 0) {
                appts.forEach(a => {
                    console.log(`   - ${a.date} ${a.time} | ${a.status}`);
                });
            }

            db.all("SELECT * FROM prescriptions WHERE patientId = ?", [patientId], (err, rx) => {
                console.log(`\n💊 Recetas: ${rx ? rx.length : 0}`);
                if (rx && rx.length > 0) {
                    rx.forEach(r => {
                        console.log(`   - ${r.date} | createdAt: ${r.createdAt || 'N/A'}`);
                    });
                }

                db.all("SELECT * FROM exams WHERE patientId = ?", [patientId], (err, exams) => {
                    console.log(`\n🔬 Exámenes: ${exams ? exams.length : 0}`);
                    if (exams && exams.length > 0) {
                        exams.forEach(e => {
                            console.log(`   - ${e.date} | ${e.type} | createdAt: ${e.createdAt || 'N/A'}`);
                        });
                    }

                    db.all("SELECT * FROM triage WHERE patientId = ?", [patientId], (err, triage) => {
                        console.log(`\n🏥 Triajes: ${triage ? triage.length : 0}`);
                        if (triage && triage.length > 0) {
                            triage.forEach(t => {
                                console.log(`   - ${t.date} | createdAt: ${t.createdAt || 'N/A'}`);
                            });
                        }

                        console.log('\n' + '='.repeat(60));
                        const total = (history?.length || 0) + (appts?.length || 0) +
                            (rx?.length || 0) + (exams?.length || 0) + (triage?.length || 0);
                        console.log(`📊 TOTAL de registros: ${total}`);
                        console.log('='.repeat(60));

                        db.close();
                    });
                });
            });
        });
    });
}
