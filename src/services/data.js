const API_URL = `/api`;

const calculateAge = (birthDate) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

const authHeader = () => {
    const token = localStorage.getItem('token');
    return token ? {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    } : { 'Content-Type': 'application/json' };
};

// Handle authentication errors globally
const handleAuthError = (status) => {
    if (status === 401) {
        // Clear stored authentication data
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Redirect to login page
        window.location.href = '/';

        return true; // Indicates error was handled
    }
    // 403 Forbidden shouldn't logout, just throw error to be handled by UI
    return false;
};

export const dataService = {
    login: async (credentials) => {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        return { user: data.user, token: data.token };
    },

    // Users Management
    getUsers: async () => {
        const res = await fetch(`${API_URL}/users`, { headers: authHeader() });
        if (!res.ok) {
            handleAuthError(res.status);
            throw new Error('Failed to fetch users');
        }
        return await res.json();
    },

    getLogs: async (page = 1, limit = 50) => {
        const res = await fetch(`${API_URL}/logs?page=${page}&limit=${limit}`, { headers: authHeader() });
        if (!res.ok) throw new Error('Failed to fetch logs');
        return await res.json();
    },

    saveUser: async (user) => {
        const res = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify(user)
        });
        if (!res.ok) throw new Error('Failed to create user');
        return await res.json();
    },

    updateUser: async (user) => {
        const res = await fetch(`${API_URL}/users/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify(user)
        });
        if (!res.ok) throw new Error('Failed to update user');
        return await res.json();
    },

    deleteUser: async (id) => {
        const res = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: authHeader()
        });
        if (!res.ok) throw new Error('Failed to delete user');
        return await res.json();
    },

    getPatients: async () => {
        try {
            console.log("Fetching patients from:", `${API_URL}/patients`);
            const res = await fetch(`${API_URL}/patients`);
            console.log("Response status:", res.status);

            if (!res.ok) throw new Error('Failed to fetch patients');
            const data = await res.json();
            console.log("Patients data received (count):", Array.isArray(data) ? data.length : 'Not Array', data);

            if (!Array.isArray(data)) {
                console.error('API returned non-array:', data);
                return [];
            }

            // Calculate age for display if not present (though backend could do it, frontend is safer for now)
            return data.map(p => ({
                ...p,
                age: p.birthDate ? calculateAge(p.birthDate) : p.age
            }));
        } catch (e) {
            console.error("Error in getPatients:", e);
            return [];
        }
    },

    savePatient: async (patient) => {
        const age = patient.birthDate ? calculateAge(patient.birthDate) : patient.age;
        const res = await fetch(`${API_URL}/patients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify({ ...patient, age })
        });
        if (!res.ok) {
            handleAuthError(res.status);
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Error al guardar paciente');
        }
        return await res.json();
    },

    updatePatient: async (updatedPatient) => {
        const age = updatedPatient.birthDate ? calculateAge(updatedPatient.birthDate) : updatedPatient.age;
        const res = await fetch(`${API_URL}/patients/${updatedPatient.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify({ ...updatedPatient, age })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Error al actualizar paciente');
        }
        return await res.json();
    },

    deletePatient: async (id) => {
        const res = await fetch(`${API_URL}/patients/${id}`, {
            method: 'DELETE',
            headers: authHeader()
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Error al eliminar paciente');
        }
        return await res.json();
    },

    async getUniqueReferrals() {
        try {
            const res = await fetch(`${API_URL}/referrals`, { headers: authHeader() });
            if (!res.ok) throw new Error('Failed to fetch referrals');
            return await res.json();
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    // --- Triaje ---
    addTriage: async (triageData) => {
        const response = await fetch(`${API_URL}/triage`, {
            method: 'POST',
            headers: authHeader(),
            body: JSON.stringify(triageData)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Error al guardar triaje');
        }
        return response.json();
    },

    updateTriage: async (id, triageData) => {
        const response = await fetch(`${API_URL}/triage/${id}`, {
            method: 'PUT',
            headers: authHeader(),
            body: JSON.stringify(triageData)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Error al actualizar triaje');
        }
        return response.json();
    },

    getPatientTriage: async (patientId) => {
        const response = await fetch(`${API_URL}/patients/${patientId}/triage`, { headers: authHeader() });
        if (!response.ok) throw new Error('Error al cargar triaje');
        return response.json();
    },

    getAppointments: async () => {
        try {
            const res = await fetch(`${API_URL}/appointments`);
            if (!res.ok) throw new Error('Failed to fetch appointments');
            return await res.json();
        } catch (e) {
            console.error(e);
            throw e; // Propagate error to let UI handle it
        }
    },

    getAppointmentFullDetails: async (id) => {
        const res = await fetch(`${API_URL}/appointments/${id}/full-details`, { headers: authHeader() });
        if (!res.ok) throw new Error('Error cargando detalles de la cita');
        return await res.json();
    },

    saveAppointment: async (appointment) => {
        const res = await fetch(`${API_URL}/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify(appointment)
        });
        if (!res.ok) {
            handleAuthError(res.status);
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Error al guardar cita');
        }
        return await res.json();
    },

    updateAppointment: async (updatedAppointment) => {
        const res = await fetch(`${API_URL}/appointments/${updatedAppointment.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify(updatedAppointment)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Error al actualizar cita');
        }
        return await res.json();
    },

    deleteAppointment: async (id) => {
        const res = await fetch(`${API_URL}/appointments/${id}`, {
            method: 'DELETE',
            headers: authHeader()
        });
        if (!res.ok) {
            handleAuthError(res.status);
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Error al eliminar cita');
        }
        return await res.json();
    },

    getPatientHistory: async (patientId) => {
        try {
            const res = await fetch(`${API_URL}/history/${patientId}`);
            if (!res.ok) throw new Error('Failed to fetch history');
            return await res.json();
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    addHistoryRecord: async (record) => {
        const res = await fetch(`${API_URL}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify({
                ...record,
                date: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString()
            })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Error al guardar historial');
        }
        return await res.json();
    },

    // Alias for consistency with Atencion.jsx
    addHistory: async (data) => {
        return dataService.addHistoryRecord(data);
    },

    getDashboardStats: async () => {
        try {
            const res = await fetch(`${API_URL}/stats`, { headers: authHeader() });

            // Log for debugging
            console.log('Dashboard stats response status:', res.status);

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Dashboard stats error:', res.status, errorText);

                if (res.status === 401) {
                    throw new Error('No autenticado. Por favor, inicie sesión nuevamente.');
                } else if (res.status === 403) {
                    throw new Error('No tiene permiso para ver las estadísticas del panel.');
                } else {
                    throw new Error(`Error del servidor: ${res.status}`);
                }
            }

            const data = await res.json();
            console.log('Dashboard stats loaded:', data);
            return data;
        } catch (e) {
            console.error('Error loading dashboard stats:', e);
            // Return error object instead of empty data
            return {
                error: e.message || 'Error al cargar estadísticas',
                total: 0,
                gender: [],
                recent: [],
                appointments: [],
                pendingExams: 0
            };
        }
    },

    updatePermission: async (data) => {
        const res = await fetch(`${API_URL}/permissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Error updating permission');
        return await res.json();
    },

    getPermissions: async () => {
        const res = await fetch(`${API_URL}/permissions`, { headers: authHeader() });
        if (!res.ok) throw new Error('Error loading permissions');
        return await res.json();
    },

    // --- Clinical Module ---
    getPrescriptions: async (patientId) => {
        const res = await fetch(`${API_URL}/prescriptions/${patientId}`, { headers: authHeader() });
        if (!res.ok) return [];
        const data = await res.json();
        return data.map(p => ({
            ...p,
            medications: typeof p.medications === 'string' ? JSON.parse(p.medications || '[]') : p.medications
        }));
    },

    savePrescription: async (data) => {
        const res = await fetch(`${API_URL}/prescriptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify({ ...data, createdAt: new Date().toISOString() })
        });
        if (!res.ok) {
            handleAuthError(res.status);
            throw new Error('Error saving prescription');
        }
        return await res.json();
    },

    // Alias for consistency with Atencion.jsx
    addPrescription: async (data) => {
        return dataService.savePrescription(data);
    },

    getExams: async (patientId) => {
        const res = await fetch(`${API_URL}/exams/${patientId}`);
        if (!res.ok) return [];
        return await res.json(); // Includes results
    },

    saveExam: async (data) => {
        const res = await fetch(`${API_URL}/exams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify({ ...data, createdAt: new Date().toISOString() })
        });
        if (!res.ok) throw new Error('Error saving exam request');
        return await res.json();
    },

    // Alias for consistency with Atencion.jsx
    addExam: async (data) => {
        return dataService.saveExam(data);
    },

    uploadExamResult: async (examId, file, note) => {
        const formData = new FormData();
        formData.append('file', file);
        if (note) formData.append('note', note);

        const res = await fetch(`${API_URL}/exams/${examId}/upload`, {
            method: 'POST',
            headers: { 'Authorization': authHeader().Authorization }, // Content-Type is auto-set to multipart/form-data
            body: formData
        });

        if (!res.ok) throw new Error('Error uploading file');
        return await res.json();
    },

    deletePrescription: async (id) => {
        const res = await fetch(`${API_URL}/prescriptions/${id}`, {
            method: 'DELETE',
            headers: authHeader()
        });
        if (!res.ok) throw new Error('Error eliminando receta');
        return await res.json();
    },

    deleteExam: async (id) => {
        const res = await fetch(`${API_URL}/exams/${id}`, {
            method: 'DELETE',
            headers: authHeader()
        });
        if (!res.ok) throw new Error('Error eliminando examen');
        return await res.json();
    },

    updateExam: async (id, data) => {
        const res = await fetch(`${API_URL}/exams/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Error actualizando examen');
        return await res.json();
    },

    updatePrescription: async (id, data) => {
        const res = await fetch(`${API_URL}/prescriptions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Error actualizando receta');
        return await res.json();
    },

    updateHistory: async (id, data) => {
        const res = await fetch(`${API_URL}/history/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Error actualizando historial');
        return await res.json();
    },

    deleteHistory: async (id) => {
        const res = await fetch(`${API_URL}/history/${id}`, {
            method: 'DELETE',
            headers: authHeader()
        });
        if (!res.ok) throw new Error('Error eliminando historial');
        return await res.json();
    },

    deleteExamResult: async (id) => {
        const res = await fetch(`${API_URL}/exams/results/${id}`, {
            method: 'DELETE',
            headers: authHeader()
        });
        if (!res.ok) throw new Error('Failed to delete result');
        return await res.json();
    },

    // Settings (Empresa)
    getSettings: async () => {
        const res = await fetch(`${API_URL}/settings`, { headers: authHeader() });
        if (!res.ok) throw new Error('Failed to fetch settings');
        return await res.json();
    },

    saveSettings: async (formData) => {
        const headers = authHeader();
        delete headers['Content-Type']; // Let browser set multipart/form-data boundary

        const res = await fetch(`${API_URL}/settings`, {
            method: 'POST',
            headers: headers,
            body: formData
        });
        if (!res.ok) throw new Error('Failed to save settings');
        return await res.json();
    },

    backup: async () => {
        const res = await fetch(`${API_URL}/backup`, {
            method: 'POST',
            headers: authHeader()
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to create backup');
        }
        return await res.json();
    },

    // Doctors/Staff
    getDoctors: async () => {
        const res = await fetch(`${API_URL}/doctors`, { headers: authHeader() });
        if (!res.ok) throw new Error('Failed to fetch doctors');
        return await res.json();
    },

    saveDoctor: async (formData) => {
        const headers = authHeader();
        delete headers['Content-Type'];

        const res = await fetch(`${API_URL}/doctors`, {
            method: 'POST',
            headers: headers,
            body: formData
        });
        if (!res.ok) throw new Error('Failed to create doctor');
        return await res.json();
    },

    updateDoctor: async (id, formData) => {
        const headers = authHeader();
        delete headers['Content-Type'];

        const res = await fetch(`${API_URL}/doctors/${id}`, {
            method: 'PUT',
            headers: headers,
            body: formData
        });
        if (!res.ok) throw new Error('Failed to update doctor');
        return await res.json();
    },

    deleteDoctor: async (id) => {
        const res = await fetch(`${API_URL}/doctors/${id}`, {
            method: 'DELETE',
            headers: authHeader()
        });
        if (!res.ok) throw new Error('Failed to delete doctor');
        return await res.json();
    },

    getLogs: async (page = 1, limit = 50) => {
        const res = await fetch(`${API_URL}/logs?page=${page}&limit=${limit}`, { headers: authHeader() });
        if (!res.ok) throw new Error('Error loading logs');
        return await res.json();
    },

    // Reports
    getReport: async (type, filters) => {
        const queryParams = new URLSearchParams(filters).toString();
        const res = await fetch(`${API_URL}/reports/${type}?${queryParams}`, { headers: authHeader() });
        if (!res.ok) throw new Error('Error genererando reporte');
        return await res.json();
    },

    getDashboardAnalytics: async (filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        const res = await fetch(`${API_URL}/dashboard/analytics?${queryParams}`, { headers: authHeader() });
        if (!res.ok) throw new Error('Error loading dashboard analytics');
        return await res.json();
    }
};
