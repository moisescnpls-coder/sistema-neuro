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

                // Formato de CSV según pudimos ver: código, código2?, nombre, urls...
                // Para ser mas robustos y no traer dependencias de parseo CSV:
                if (!line) continue;

                // Un split muy basico asumiendo que el código y el nombre no contienen comas (o la controlamos limitando indices)
                const parts = line.split(',');
                if (parts.length >= 2) {
                    let code = parts[0].trim().toUpperCase();

                    // A veces tiene comillas
                    if (code.startsWith('"') && code.endsWith('"')) {
                        code = code.slice(1, -1);
                    }

                    // Asumiendo que despues de unos campos vacios, tenemos la descripción en la última o penúltima parte antes de URLs
                    // En el log pudimos ver:
                    // code,code_0,code_1,code_algo,url,descripción?
                    // "G00-G99",,,,,,"Trastornos"

                    // La descripción suele ser el texto principal, busquemos el primer texto largo o tomemos el último valor
                    // Vamos a limpiar las comillas de todas las partes
                    const cleanParts = parts.map(p => {
                        let c = p.trim();
                        if (c.startsWith('"') && c.endsWith('"')) c = c.slice(1, -1);
                        return c;
                    });

                    let description = '';

                    // La descripción normalmente está al final, antes del enlace si lo hay, o es el string más largo
                    // Ignoraremos URLs.
                    for (let p of cleanParts) {
                        if (p && p !== code && !p.startsWith('http') && p.length > description.length) {
                            description = p;
                        }
                    }

                    if (code && description && code !== 'CODE' && code !== 'CODIGO') {
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
