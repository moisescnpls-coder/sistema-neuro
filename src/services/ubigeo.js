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

    // New helper for Province Search
    findProvinces: (query) => {
        if (!query || query.length < 2) return [];
        const normalizedQuery = query.toLowerCase();

        return provs
            .filter(p => p.provincia.toLowerCase().includes(normalizedQuery))
            .map(p => {
                const dept = depts.find(d => d.id === p.departamento_id);
                return {
                    province: p.provincia,
                    department: dept ? dept.departamento : ''
                };
            })
            .slice(0, 10); // Limit results
    }
};
