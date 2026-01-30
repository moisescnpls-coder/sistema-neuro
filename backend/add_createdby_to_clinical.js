const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Adding createdBy to prescriptions and exams tables...\n');

db.serialize(() => {
    // Add createdBy to prescriptions
    db.run(
        `ALTER TABLE prescriptions ADD COLUMN createdBy TEXT`,
        function (err) {
            if (err) {
                if (err.message.includes('duplicate column')) {
                    console.log('⚠️  Column createdBy already exists in prescriptions');
                } else {
                    console.error('❌ Error adding createdBy to prescriptions:', err);
                }
            } else {
                console.log('✅ Added createdBy column to prescriptions');
            }
        }
    );

    // Add createdBy to exams
    db.run(
        `ALTER TABLE exams ADD COLUMN createdBy TEXT`,
        function (err) {
            if (err) {
                if (err.message.includes('duplicate column')) {
                    console.log('⚠️  Column createdBy already exists in exams');
                } else {
                    console.error('❌ Error adding createdBy to exams:', err);
                }
            } else {
                console.log('✅ Added createdBy column to exams');
            }

            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('\n✅ Migration completed successfully!');
                }
            });
        }
    );
});
