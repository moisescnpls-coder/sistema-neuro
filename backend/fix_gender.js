const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 REPARANDO DATOS DE GÉNERO...');

const fixGender = () => {
    return new Promise((resolve, reject) => {
        // 1. Cambiar 'Feminino' (Portugués) a 'Femenino' (Español)
        const sql = `UPDATE patients SET gender = 'Femenino' WHERE gender = 'Feminino'`;

        db.run(sql, function (err) {
            if (err) {
                console.error("❌ Error actualizando géneros:", err.message);
                reject(err);
            } else {
                console.log(`✅ Se actualizaron ${this.changes} pacientes de 'Feminino' a 'Femenino'.`);
                resolve();
            }
        });
    });
};

fixGender().then(() => {
    console.log('✨ Reparación completada.');
    db.close();
});
