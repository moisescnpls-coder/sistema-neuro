const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Adding createdAt timestamps to prescriptions and exams tables...\n');

db.serialize(() => {
    // Add createdAt to prescriptions
    db.run(
        `ALTER TABLE prescriptions ADD COLUMN createdAt TEXT`,
        function (err) {
            if (err) {
                if (err.message.includes('duplicate column')) {
                    console.log('⚠️  Column createdAt already exists in prescriptions');
                } else {
                    console.error('❌ Error adding createdAt to prescriptions:', err);
                }
            } else {
                console.log('✅ Added createdAt column to prescriptions');
            }
        }
    );

    // Add createdAt to exams
    db.run(
        `ALTER TABLE exams ADD COLUMN createdAt TEXT`,
        function (err) {
            if (err) {
                if (err.message.includes('duplicate column')) {
                    console.log('⚠️  Column createdAt already exists in exams');
                } else {
                    console.error('❌ Error adding createdAt to exams:', err);
                }
            } else {
                console.log('✅ Added createdAt column to exams');
            }

            // Close database after all operations
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
