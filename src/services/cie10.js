import cie10Data from '../data/cie10.json';


const data = cie10Data || [];

// Custom normalize specifically for search to strip accents and lowercase
const normalize = (text) => {
    if (!text) return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export const cie10Service = {
    findDiagnosis: (query) => {
        if (!query || query.length < 2) return [];

        const normalizedQuery = normalize(query);
        const results = [];

        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const code = item.código || '';
            const desc = item.descripción || '';

            const normalizedCode = normalize(code);
            const normalizedDesc = normalize(desc);

            if (normalizedCode.includes(normalizedQuery) || normalizedDesc.includes(normalizedQuery)) {
                results.push({
                    código: code,
                    descripción: desc,
                    // Determine relevance for sorting: exact code match first, then starts with name, then includes name
                    exactCodeMatch: normalizedCode === normalizedQuery,
                    codeStartsWith: normalizedCode.startsWith(normalizedQuery),
                    descStartsWith: normalizedDesc.startsWith(normalizedQuery)
                });
            }
        }

        // Sort results to bring best matches to the top
        results.sort((a, b) => {
            if (a.exactCodeMatch && !b.exactCodeMatch) return -1;
            if (!a.exactCodeMatch && b.exactCodeMatch) return 1;

            if (a.codeStartsWith && !b.codeStartsWith) return -1;
            if (!a.codeStartsWith && b.codeStartsWith) return 1;

            if (a.descStartsWith && !b.descStartsWith) return -1;
            if (!a.descStartsWith && b.descStartsWith) return 1;

            // Si empatan, alfabético por descripción
            return a.descripción.localeCompare(b.descripción);
        });

        // Limit to top 50
        return results.slice(0, 50);
    }
};
