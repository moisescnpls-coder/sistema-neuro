const db = require('./db');

console.log("=== DEBUG: Dashboard Stats ===\n");

// 1. Check if stats tables exist and have data
console.log("1. Checking database tables...");

const queries = {
    totalPatients: "SELECT COUNT(*) as count FROM patients",
    genderDistribution: "SELECT gender, COUNT(*) as count FROM patients GROUP BY gender",
    recentPatients: "SELECT * FROM patients ORDER BY id DESC LIMIT 5",
    upcomingAppointments: `SELECT * FROM appointments WHERE status = 'Programado' AND date >= date('now', 'localtime') ORDER BY date ASC, time ASC LIMIT 10`,
    pendingExams: "SELECT COUNT(*) as count FROM exams WHERE status = 'Solicitado'"
};

const runQuery = (name, sql, method = 'all') => {
    return new Promise((resolve) => {
        db[method](sql, [], (err, result) => {
            if (err) {
                console.error(`   ❌ ${name}: ERROR - ${err.message}`);
                resolve({ error: err.message });
            } else {
                console.log(`   ✓ ${name}: SUCCESS`);
                console.log(`     Result:`, result);
                resolve(result);
            }
        });
    });
};

// 2. Check permissions table
const checkPermissions = () => {
    return new Promise((resolve) => {
        db.all("SELECT * FROM role_permissions WHERE permission_key = 'view_dashboard_stats'", [], (err, rows) => {
            if (err) {
                console.error("   ❌ Error checking permissions:", err.message);
                resolve([]);
            } else {
                console.log("\n2. Checking 'view_dashboard_stats' permission:");
                if (rows.length === 0) {
                    console.log("   ⚠️  NO ROLES have 'view_dashboard_stats' permission!");
                } else {
                    console.log(`   ✓ Found ${rows.length} role(s) with permission:`);
                    rows.forEach(r => console.log(`     - ${r.role}`));
                }
                resolve(rows);
            }
        });
    });
};

// 3. Check users
const checkUsers = () => {
    return new Promise((resolve) => {
        db.all("SELECT id, username, role FROM users", [], (err, rows) => {
            if (err) {
                console.error("   ❌ Error checking users:", err.message);
                resolve([]);
            } else {
                console.log("\n3. Checking users:");
                console.log(`   Found ${rows.length} user(s):`);
                rows.forEach(r => console.log(`     - ${r.username} (${r.role})`));
                resolve(rows);
            }
        });
    });
};

// Run all checks
(async () => {
    console.log("\n--- QUERY TESTS ---");
    await runQuery('Total Patients', queries.totalPatients, 'get');
    await runQuery('Gender Distribution', queries.genderDistribution);
    await runQuery('Recent Patients', queries.recentPatients);
    await runQuery('Upcoming Appointments', queries.upcomingAppointments);
    await runQuery('Pending Exams', queries.pendingExams, 'get');

    await checkPermissions();
    await checkUsers();

    console.log("\n=== DEBUG COMPLETE ===\n");
    db.close();
})();
