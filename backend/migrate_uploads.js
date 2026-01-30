const fs = require('fs');
const path = require('path');

// This script migrates existing uploads to organized folder structure
// Run with: node migrate_uploads.js

console.log('Starting file migration...');

const oldDir = 'uploads';
const newDirs = {
    patients: 'uploads/patients',
    temp: 'uploads/temp'
};

// Create directories if they don't exist
Object.values(newDirs).forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

// Get all files in uploads root
fs.readdir(oldDir, (err, files) => {
    if (err) {
        console.error('Error reading uploads directory:', err);
        return;
    }

    let movedCount = 0;
    let skippedCount = 0;

    files.forEach(file => {
        const oldPath = path.join(oldDir, file);

        // Skip if it's a directory
        if (fs.statSync(oldPath).isDirectory()) {
            skippedCount++;
            return;
        }

        // Move to patients folder (since existing files are patient photos)
        const newPath = path.join(newDirs.patients, file);

        try {
            fs.renameSync(oldPath, newPath);
            console.log(`Moved: ${file} -> ${newDirs.patients}/`);
            movedCount++;
        } catch (error) {
            console.error(`Error moving ${file}:`, error.message);
        }
    });

    console.log(`\nMigration complete!`);
    console.log(`Files moved: ${movedCount}`);
    console.log(`Files skipped: ${skippedCount}`);
});
