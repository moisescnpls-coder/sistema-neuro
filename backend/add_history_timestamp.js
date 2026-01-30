const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sistema_neuro.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Adding createdAt to history table...\n');

db.run(
    `ALTER TABLE history ADD COLUMN createdAt TEXT`,
    function (err) {
        if (err) {
            if (err.message.includes('duplicate column')) {
                console.log('⚠️  Column createdAt already exists in history');
            } else {
                console.error('❌ Error adding createdAt to history:', err);
            }
        } else {
            console.log('✅ Added createdAt column to history');
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
