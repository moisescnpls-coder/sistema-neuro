import deptsData from '../data/departments.json';
import provsData from '../data/provinces.json';
import distsData from '../data/districts.json';

// Cache for performance with safety checks
const depts = (deptsData && deptsData.ubigeo_departamentos) ? deptsData.ubigeo_departamentos : [];
const provs = (provsData && provsData.ubigeo_provincias) ? provsData.ubigeo_provincias : [];
const dists = (distsData && distsData.ubigeo_distritos) ? distsData.ubigeo_distritos : [];

// Helper to normalize text for comparison if needed (optional)
// The data seems to be in uppercase in the JSONs based on the repo description/samples.

export const ubigeoService = {
    getDepartments: () => {
        return depts.map(d => d.departamento);
    },

    getProvinces: (departmentName) => {
        if (!departmentName) return [];
        const dept = depts.find(d => d.departamento === departmentName);
        if (!dept) return [];

        // The JSON fields might vary (id vs department_id). Repo says "departamento_id" for provinces.
        // Let's assume standard integer comparison.
        return provs
            .filter(p => p.departamento_id === dept.id)
            .map(p => p.provincia);
    },

    getDistricts: (departmentName, provinceName) => {
        if (!departmentName || !provinceName) return [];

        const dept = depts.find(d => d.departamento === departmentName);
        if (!dept) return [];

        const prov = provs.find(p => p.provincia === provinceName && p.departamento_id === dept.id);
        if (!prov) return [];

        return dists
            .filter(d => d.provincia_id === prov.id)
            .map(d => d.distrito);
    },

    // New helper: Search Province OR District
    findLocations: (query) => {
        if (!query || query.length < 2) return [];
        const normalizedQuery = query.toLowerCase();

        // 1. Search Provinces
        const matchingProvs = provs
            .filter(p => p.provincia.toLowerCase().includes(normalizedQuery))
            .map(p => {
                const dept = depts.find(d => d.id === p.departamento_id);
                return {
                    label: `${p.provincia} (Provincia)`,
                    type: 'Province',
                    department: dept ? dept.departamento : '',
                    province: p.provincia,
                    district: ''
                };
            });

        // 2. Search Districts
        const matchingDists = dists
            .filter(d => d.distrito.toLowerCase().includes(normalizedQuery))
            .map(d => {
                const prov = provs.find(p => p.id === d.provincia_id);
                const dept = prov ? depts.find(dept => dept.id === prov.departamento_id) : null;
                return {
                    label: `${d.distrito} (Distrito)`,
                    type: 'District',
                    department: dept ? dept.departamento : '',
                    province: prov ? prov.provincia : '',
                    district: d.distrito
                };
            });

        // 3. Combine and Sort and Limit
        const allResults = [...matchingProvs, ...matchingDists];

        // Sort alphabetically: Label (Name) -> Department
        allResults.sort((a, b) => {
            const labelA = (a.district || a.province).toLowerCase();
            const labelB = (b.district || b.province).toLowerCase();

            const startsA = labelA.startsWith(normalizedQuery);
            const startsB = labelB.startsWith(normalizedQuery);

            if (startsA && !startsB) return -1;
            if (!startsA && startsB) return 1;

            const nameCompare = labelA.localeCompare(labelB);
            if (nameCompare !== 0) return nameCompare;

            return a.department.localeCompare(b.department);
        });

        // Increase limit slightly to accommodate common names like "Santa..." or "San..."
        return allResults.slice(0, 50);
    }
};
