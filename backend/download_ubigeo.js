const fs = require('fs');
const path = require('path');
const https = require('https');

const dataDir = path.join(__dirname, '../src/data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const files = [
    { name: 'departments.json', url: 'https://raw.githubusercontent.com/RitchieRD/ubigeos-peru-data/main/json/1_ubigeo_departamentos.json' },
    { name: 'provinces.json', url: 'https://raw.githubusercontent.com/RitchieRD/ubigeos-peru-data/main/json/2_ubigeo_provincias.json' },
    { name: 'districts.json', url: 'https://raw.githubusercontent.com/RitchieRD/ubigeos-peru-data/main/json/3_ubigeo_distritos.json' }
];

const download = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to browse ${url}: ${response.statusCode}`));
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Downloaded ${dest}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
};

const run = async () => {
    try {
        for (const f of files) {
            await download(f.url, path.join(dataDir, f.name));
        }
        console.log('All downloads complete.');
    } catch (e) {
        console.error('Download failed:', e);
    }
};

run();
