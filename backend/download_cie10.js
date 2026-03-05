const https = require('https');
const fs = require('fs');
const path = require('path');

const CSV_URL = 'https://raw.githubusercontent.com/verasativa/CIE-10/master/cie-10.csv';
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'cie10.json');
const OUTPUT_DIR = path.dirname(OUTPUT_PATH);

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('Descargando datos CIE-10 de GitHub...');

https.get(CSV_URL, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Descarga completa. Procesando CSV...');

        try {
            const lines = data.split('\n');
            const result = [];

            // Ignorar encabezados si es que hay o líneas vacías tempranas
            // Vamos iterando desde la primera línea
            let validRecords = 0;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                const parts = [];
                let current = '';
                let withinQuotes = false;

                for (let j = 0; j < line.length; j++) {
                    const char = line[j];
                    if (char === '"') {
                        if (withinQuotes && j + 1 < line.length && line[j + 1] === '"') {
                            current += '"';
                            j++;
                        } else {
                            withinQuotes = !withinQuotes;
                        }
                    } else if (char === ',' && !withinQuotes) {
                        parts.push(current);
                        current = '';
                    } else {
                        current += char;
                    }
                }
                parts.push(current);

                if (parts.length >= 2) {
                    let code = parts[0].trim().toUpperCase();

                    let description = '';
                    let maxLength = 0;

                    for (let p of parts) {
                        let cleanP = p.trim();

                        // Ignoramos el código y las urls, buscamos la descripción más larga
                        if (cleanP && cleanP !== code && !cleanP.startsWith('http')) {
                            if (cleanP.length > maxLength) {
                                maxLength = cleanP.length;
                                description = cleanP;
                            }
                        }
                    }

                    if (code && description && code !== 'CODE' && code !== 'CODIGO' && description.length > 2) {
                        if (code.length > 3 && !code.includes('-') && !code.includes('.')) {
                            code = code.substring(0, 3) + '.' + code.substring(3);
                        }
                        result.push({ código: code, descripción: description });
                        validRecords++;
                    }
                }
            }

            console.log(`Generando JSON con ${validRecords} enfermedades...`);
            fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
            console.log(`Guardado exitosamente en src/data/cie10.json`);

        } catch (error) {
            console.error('Error al procesar el archivo CSV:', error);
        }
    });

}).on('error', (e) => {
    console.error('Error durante la solicitud:', e);
});
