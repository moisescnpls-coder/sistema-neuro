const db = require('./db');

console.log("Adding 'view_dashboard_stats' permission to 'recepcion' role...\n");

db.run(
    "INSERT OR IGNORE INTO role_permissions (role, permission_key) VALUES (?, ?)",
    ['recepcion', 'view_dashboard_stats'],
    function (err) {
        if (err) {
            console.error("❌ Error:", err.message);
            db.close();
            process.exit(1);
        }

        if (this.changes > 0) {
            console.log("✅ Permission added successfully!");
        } else {
            console.log("ℹ️  Permission already exists (no changes needed)");
        }

        // Verify the permission was added
        db.all("SELECT * FROM role_permissions WHERE permission_key = 'view_dashboard_stats'", [], (err, rows) => {
            if (err) {
                console.error("Error verifying:", err.message);
            } else {
                console.log("\nCurrent roles with 'view_dashboard_stats' permission:");
                rows.forEach(r => console.log(`  - ${r.role}`));
            }

            db.close();
            console.log("\n✓ Done!");
        });
    }
);
