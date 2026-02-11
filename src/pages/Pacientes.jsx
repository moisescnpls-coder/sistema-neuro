import React, { useState, useEffect } from 'react';
import { Search, Plus, User, FileText, Eye, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/data';
import { ubigeoService } from '../services/ubigeo';
import { useNavigate, useLocation } from 'react-router-dom';
import Modal from '../components/Modal';
import { showAlert } from '../utils/alerts';

// Helper Component for Uniform Spacing
const FormField = ({ label, children, required, smallLabel }) => (
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '8px' }}>
        <label
            className={`block ${smallLabel ? 'text-xs' : 'text-sm'} font-medium text-gray-700`}
            style={{
                marginBottom: '7px', // Forced inline style for spacing
                minHeight: '1.5rem',
                display: 'block'
            }}
        >
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div style={{ width: '100%' }}>
            {children}
        </div>
    </div>
);

const Pacientes = () => {
    const { isAdmin, hasPermission } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    console.log("Pacientes: Rendering component");
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState(''); // Global search (will be removed)
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [patientToDelete, setPatientToDelete] = useState(null);
    const [deleteError, setDeleteError] = useState(null);
    const [modalError, setModalError] = useState(null); // Error state for modal

    // Column Filters State
    const [filters, setFilters] = useState({
        name: '',
        document: '',
        hc: '',
        phone: '',
        age: ''
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // View Mode State
    const [isViewMode, setIsViewMode] = useState(false);

    const initialFormState = {
        firstName: '', lastName: '', fullName: '', dni: '', phone: '', email: '',
        age: '', birthDate: '', gender: '',
        clinicalHistoryNumber: '', maritalStatus: '', documentType: 'DNI',
        registrationDate: new Date().toISOString().split('T')[0],
        address: '', department: '', province: '', district: '',
        clinicalSummary: ''
    };

    const [currentPatient, setCurrentPatient] = useState(initialFormState);
    const [isEditing, setIsEditing] = useState(false);

    // Ubigeo State
    const [departments, setDepartments] = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);

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

    useEffect(() => {
        const load = async () => {
            try {
                const data = await dataService.getPatients();
                // Calculate age for all patients
                const processed = data.map(p => ({
                    ...p,
                    age: calculateAge(p.birthDate)
                }));
                setPatients(processed);

                try {
                    const depts = ubigeoService.getDepartments();
                    setDepartments(depts);
                } catch (uErr) {
                    console.error('Ubigeo Error:', uErr);
                    setDepartments([]);
                }
                setLoading(false); // Enable UI rendering
            } catch (err) {
                console.error('Load Error:', err);
                showAlert('Error al cargar datos', 'error');
                setLoading(false); // Ensure loading is cleared on error
            }
        };
        load();
    }, []);

    // Auto-open modal when navigating from Dashboard
    useEffect(() => {
        if (location.state?.openModal) {
            resetForm();
            setIsModalOpen(true);
            // Clear the state to prevent reopening on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Update cascading selectors
    useEffect(() => {
        if (currentPatient.department) {
            setProvinces(ubigeoService.getProvinces(currentPatient.department));
        } else {
            setProvinces([]);
        }
    }, [currentPatient.department]);

    useEffect(() => {
        if (currentPatient.province) {
            setDistricts(ubigeoService.getDistricts(currentPatient.department, currentPatient.province));
        } else {
            setDistricts([]);
        }
    }, [currentPatient.province]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);



    const handleBirthDateChange = (e) => {
        const date = e.target.value;
        const age = calculateAge(date);
        setCurrentPatient(prev => ({ ...prev, birthDate: date, age: age }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setModalError(null); // Clear previous errors

        try {
            let saved;
            // Force uppercase logic before saving
            const patientToSave = {
                ...currentPatient,
                firstName: currentPatient.firstName?.toUpperCase(),
                lastName: currentPatient.lastName?.toUpperCase(),
                fullName: currentPatient.lastName ? `${currentPatient.lastName} ${currentPatient.firstName || ''}`.trim().toUpperCase() : currentPatient.fullName,
                address: currentPatient.address?.toUpperCase()
            };



            if (isEditing) {
                saved = await dataService.updatePatient(patientToSave);
                setPatients(prev => prev.map(p => p.id === saved.id ? { ...saved, age: calculateAge(saved.birthDate) } : p));
                showAlert('Paciente actualizado correctamente', 'success');
            } else {
                saved = await dataService.savePatient(patientToSave);

                setPatients(prev => [...prev, { ...saved, age: calculateAge(saved.birthDate) }]);
                showAlert('Paciente registrado correctamente', 'success');
            }
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            console.error('Save failed:', error);
            // Show error inside modal instead of toast
            setModalError(error.message || 'Error al guardar los cambios');
            // Optionally still show toast for consistency
            showAlert(error.message || 'Error al guardar los cambios', 'error');
        }
    };

    const handleDeleteClick = (patient) => {
        setPatientToDelete(patient);
        setDeleteError(null);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!patientToDelete) return;

        try {
            await dataService.deletePatient(patientToDelete.id);
            showAlert('Paciente eliminado exitosamente', 'success');
            setIsDeleteModalOpen(false);
            setPatientToDelete(null);

            // Reload data
            setLoading(true);
            const data = await dataService.getPatients();
            setPatients(data);
            setLoading(false);
        } catch (error) {
            console.error('Error deleting patient:', error);
            setDeleteError(error.message || 'Error al eliminar paciente');
            // showAlert(error.message || 'Error al eliminar paciente', 'error'); // Optional: keep or remove. Keeping it might be redundant if shown in modal.
        }
    };

    const resetForm = () => {
        setCurrentPatient(initialFormState);
        setIsEditing(false);
        setIsViewMode(false);
        setModalError(null); // Clear modal errors when resetting
    };

    const openEditModal = (patient) => {
        // Populate form with patient data, ensure nulls are empty strings
        setCurrentPatient({
            ...initialFormState,
            ...patient,
            firstName: patient.firstName || '',
            lastName: patient.lastName || '',
            department: patient.department || '',
            province: patient.province || '',
            district: patient.district || ''
        });
        setIsEditing(true);
        setIsViewMode(false);
        setIsModalOpen(true);
    };

    const openViewModal = (patient) => {
        setCurrentPatient({
            ...initialFormState,
            ...patient,
            firstName: patient.firstName || '',
            lastName: patient.lastName || '',
            department: patient.department || '',
            province: patient.province || '',
            district: patient.district || ''
        });
        setIsEditing(false);
        setIsViewMode(true);
        setIsModalOpen(true);
    };


    // Filter patients by column
    const filteredPatients = patients.filter(patient => {
        // Name filter (firstName + lastName)
        if (filters.name) {
            const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.toLowerCase();
            const searchTerms = filters.name.toLowerCase().split(/\s+/).filter(term => term.length > 0);
            const matchesAllTerms = searchTerms.every(term => fullName.includes(term));

            if (!matchesAllTerms) return false;
        }

        // Document filter (DNI)
        if (filters.document) {
            const doc = String(patient.dni || '').toLowerCase();
            if (!doc.includes(filters.document.toLowerCase())) return false;
        }

        // HC filter
        if (filters.hc) {
            const hc = String(patient.clinicalHistoryNumber || '').toLowerCase();
            if (!hc.includes(filters.hc.toLowerCase())) return false;
        }

        // Phone filter
        if (filters.phone) {
            const phone = String(patient.phone || '').toLowerCase();
            if (!phone.includes(filters.phone.toLowerCase())) return false;
        }

        // Age filter
        if (filters.age) {
            const patientAge = patient.age ? patient.age.toString() : '';
            if (!patientAge.includes(filters.age)) return false;
        }

        return true;
    });

    // Sort by ID descending (most recent first)
    const sortedPatients = [...filteredPatients].sort((a, b) => b.id - a.id);

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = sortedPatients.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(sortedPatients.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    if (loading) return <div className="p-8 text-center">Cargando...</div>;

    return (
        <>
            <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 className="section-title" style={{ margin: 0 }}>Gestión de Pacientes</h2>
                    <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={20} />
                        Nuevo Paciente
                    </button>
                </div>

                <div className="card">
                    {/* Results Counter & Actions - Moved Top */}
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {filters.name || filters.document || filters.hc || filters.phone || filters.age ? (
                                <>
                                    <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{filteredPatients.length}</span> de {patients.length} pacientes
                                </>
                            ) : (
                                <>Total: <span style={{ fontWeight: '600' }}>{patients.length}</span> pacientes</>
                            )}
                        </div>
                        {(filters.name || filters.document || filters.hc || filters.phone || filters.age) && (
                            <button
                                onClick={() => setFilters({ name: '', document: '', hc: '', phone: '', age: '' })}
                                className="btn-secondary"
                                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Trash2 size={14} />
                                Limpiar filtros
                            </button>
                        )}
                    </div>

                    {/* Filters Grid */}
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100" style={{ padding: '10px', marginBottom: '5px' }}>
                        {/* Name Filter */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Paciente</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className="input-field w-full !pl-10"
                                    placeholder="Buscar aquí por Nombres o Apellidos..."
                                    value={filters.name}
                                    onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            </div>
                        </div>

                        {/* Document Filter */}
                        <div className="col-span-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Documento</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className="input-field w-full !pl-10"
                                    placeholder="Buscar aquí por documento..."
                                    value={filters.document}
                                    onChange={(e) => setFilters({ ...filters, document: e.target.value })}
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            </div>
                        </div>

                        {/* HC Filter */}
                        <div className="col-span-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Historia Clínica</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className="input-field w-full !pl-10"
                                    placeholder="Buscar por Nº de Historia..."
                                    value={filters.hc}
                                    onChange={(e) => setFilters({ ...filters, hc: e.target.value })}
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            </div>
                        </div>
                    </div>

                    <div className="min-h-table overflow-x-auto rounded-lg shadow-sm">
                        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                            <thead className="bg-gray-50/50">
                                {/* Column Headers */}
                                <tr style={{ borderBottom: '5px solid #e5e7eb' }}>
                                    <th style={{ padding: '5px', paddingLeft: '20px' }} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Paciente</th>
                                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ padding: '5px' }}>Documento</th>
                                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ padding: '5px' }}>HC</th>
                                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ padding: '5px' }}>Teléfono</th>
                                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ padding: '5px' }}>Edad</th>
                                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ padding: '5px' }}>Acciones</th>
                                </tr>
                                {/* Filter Row Removed */}
                            </thead>
                            <tbody className="bg-white">
                                {currentItems.map(patient => (
                                    <tr key={patient.id} className="hover:bg-blue-50/30 transition-colors duration-200" style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ paddingLeft: '20px' }} className="px-6 py-3 whitespace-nowrap">
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', marginRight: '12px' }}>
                                                    <User size={18} />
                                                </div>
                                                <div
                                                    className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                                                    onClick={() => hasPermission('access_attention') ? navigate(`/atencion/paciente/${patient.id}`) : navigate(`/pacientes/${patient.id}`)}
                                                >
                                                    {patient.fullName || `${patient.firstName} ${patient.lastName}`}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 whitespace-nowrap text-sm" style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 500 }}>
                                                    {patient.documentType?.replace('PASSAPORTE', 'PASAPORTE') || 'DNI'}
                                                </span>
                                                <span style={{ fontSize: '0.95rem', color: '#374151', fontWeight: 500 }}>{patient.dni}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-600" style={{ textAlign: 'center' }}>
                                            {patient.clinicalHistoryNumber}
                                        </td>
                                        <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-600" style={{ textAlign: 'center' }}>
                                            {patient.phone}
                                        </td>
                                        <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-600" style={{ textAlign: 'center' }}>
                                            {patient.age ? <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs font-medium">{patient.age} años</span> : 'N/A'}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                <button
                                                    onClick={() => openViewModal(patient)}
                                                    className="btn-icon"
                                                    style={{ color: '#2563eb' }}
                                                    title="Ver detalles"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(patient)}
                                                    className="btn-secondary"
                                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: '#4f46e5', borderColor: '#e0e7ff' }}
                                                    title="Editar paciente"
                                                >
                                                    <FileText size={14} />
                                                    Editar
                                                </button>
                                                {hasPermission('access_attention') && (
                                                    <button
                                                        onClick={() => navigate(`/atencion/paciente/${patient.id}`)}
                                                        className="btn-secondary"
                                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                                                    >
                                                        <FileText size={14} />
                                                        Historia
                                                    </button>
                                                )}
                                                {hasPermission('delete_patients') && (
                                                    <button
                                                        onClick={() => handleDeleteClick(patient)}
                                                        className="btn-icon"
                                                        style={{ color: '#ef4444' }}
                                                        title="Eliminar paciente"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {currentItems.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <Search size={48} className="text-gray-300 mb-4" />
                                                <p className="text-lg font-medium text-gray-900">No se encontraron pacientes</p>
                                                <p className="text-sm text-gray-500">Intenta ajustar los filtros de búsqueda</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {filteredPatients.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', padding: '1rem' }}>
                            <button
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="btn-secondary"
                                style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                            >
                                Anterior
                            </button>

                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Página {currentPage} de {totalPages}
                            </span>

                            <button
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="btn-secondary"
                                style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                            >
                                Siguiente
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isViewMode ? "Detalle del Paciente" : (isEditing ? "Editar Paciente" : "Registrar Paciente")}
                footer={
                    !isViewMode && (
                        <button type="submit" form="paciente-form" className="btn-primary" style={{ marginTop: 0, width: '100%' }}>
                            {isEditing ? 'Actualizar Paciente' : 'Guardar Paciente'}
                        </button>
                    )
                }
            >
                <form id="paciente-form" onSubmit={handleSave} className="space-y-6">
                    {/* Error Alert - Displayed prominently inside modal */}
                    {modalError && (
                        <div style={{
                            background: '#fee2e2',
                            border: '2px solid #fca5a5',
                            borderRadius: '8px',
                            padding: '1rem',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            animation: 'shake 0.5s'
                        }}>
                            <div style={{
                                background: '#dc2626',
                                color: 'white',
                                borderRadius: '50%',
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                flexShrink: 0
                            }}>!</div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ color: '#991b1b', margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: '600' }}>
                                    Error al guardar paciente
                                </h4>
                                <p style={{ color: '#7f1d1d', margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
                                    {modalError}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalError(null)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#991b1b',
                                    cursor: 'pointer',
                                    fontSize: '1.5rem',
                                    lineHeight: 1,
                                    padding: 0,
                                    flexShrink: 0,
                                    fontWeight: 'bold'
                                }}
                                title="Cerrar alerta"
                            >×</button>
                        </div>
                    )}
                    <fieldset disabled={isViewMode} style={{ border: 'none', padding: 0, margin: 0 }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                            {/* Row 1 */}
                            <FormField label="Nº Historia Clínica" required>
                                <input
                                    required
                                    type="text"
                                    pattern="[0-9]+"
                                    className="input-field"
                                    value={currentPatient.clinicalHistoryNumber || ''}
                                    placeholder="Ingrese número de HC (solo números)"
                                    title="Solo se permiten números"
                                    autoComplete="off"
                                    name={`hc_${Date.now()}`}
                                    data-lpignore="true"
                                    data-form-type="other"
                                    onChange={(e) => setCurrentPatient({
                                        ...currentPatient,
                                        clinicalHistoryNumber: e.target.value
                                    })}
                                />
                            </FormField>
                            <FormField label="Fecha Registro">
                                <input
                                    type="date"
                                    className="input-field"
                                    value={currentPatient.registrationDate}
                                    onChange={(e) => setCurrentPatient({ ...currentPatient, registrationDate: e.target.value })}
                                />
                            </FormField>

                            {/* Row 2 */}
                            <FormField label="Apellidos (Completo)" required>
                                <input
                                    required
                                    type="text"
                                    className="input-field uppercase"
                                    value={currentPatient.lastName}
                                    onChange={(e) => setCurrentPatient({ ...currentPatient, lastName: e.target.value.toUpperCase() })}
                                    placeholder="APELLIDOS"
                                />
                            </FormField>
                            <FormField label="Nombres">
                                <input
                                    type="text"
                                    className="input-field uppercase"
                                    value={currentPatient.firstName}
                                    onChange={(e) => setCurrentPatient({ ...currentPatient, firstName: e.target.value.toUpperCase() })}
                                    placeholder="NOMBRES"
                                />
                            </FormField>

                            {/* Row 3 */}
                            <FormField label="Tipo Documento">
                                <select
                                    className="input-field"
                                    value={currentPatient.documentType}
                                    onChange={(e) => setCurrentPatient({ ...currentPatient, documentType: e.target.value })}
                                >
                                    <option value="DNI">DNI</option>
                                    <option value="C.E">C.E</option>
                                    <option value="PASSAPORTE">PASSAPORTE</option>
                                    <option value="PTP/CPP">PTP/CPP</option>
                                </select>
                            </FormField>
                            <FormField label="Nº Documento" required>
                                <input
                                    required
                                    type="text"
                                    className="input-field"
                                    value={currentPatient.dni}
                                    onChange={(e) => setCurrentPatient({ ...currentPatient, dni: e.target.value })}
                                />
                            </FormField>

                            {/* Row 4 */}
                            <FormField label="Fecha Nacimiento">
                                <input type="date" className="input-field" value={currentPatient.birthDate} onChange={handleBirthDateChange} />
                            </FormField>
                            <FormField label="Edad">
                                <input type="text" readOnly className="input-field bg-gray-100" value={currentPatient.age ? `${currentPatient.age} años` : ''} />
                            </FormField>

                            {/* Row 5 */}
                            <FormField label="Sexo">
                                <select className="input-field" value={currentPatient.gender} onChange={(e) => setCurrentPatient({ ...currentPatient, gender: e.target.value })}>
                                    <option value="">Seleccione</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Feminino">Feminino</option>
                                </select>
                            </FormField>
                            <FormField label="Estado Civil">
                                <select className="input-field" value={currentPatient.maritalStatus} onChange={(e) => setCurrentPatient({ ...currentPatient, maritalStatus: e.target.value })}>
                                    <option value="">Seleccione</option>
                                    <option value="Soltero">Soltero/a</option>
                                    <option value="Casado">Casado/a</option>
                                    <option value="Viudo">Viudo/a</option>
                                    <option value="Divorciado">Divorciado/a</option>
                                    <option value="Otro">Otro/a</option>
                                </select>
                            </FormField>

                            {/* Row 6 */}
                            <FormField label="Teléfono">
                                <input className="input-field" value={currentPatient.phone} onChange={(e) => setCurrentPatient({ ...currentPatient, phone: e.target.value })} />
                            </FormField>
                            <FormField label="Email">
                                <input type="email" className="input-field" value={currentPatient.email} onChange={(e) => setCurrentPatient({ ...currentPatient, email: e.target.value })} />
                            </FormField>



                            {/* Row 7 - Address full width */}
                            <div className="md:col-span-2">
                                <FormField label="Dirección">
                                    <input className="input-field uppercase" value={currentPatient.address} onChange={(e) => setCurrentPatient({ ...currentPatient, address: e.target.value.toUpperCase() })} />
                                </FormField>
                            </div>

                            {/* Row 8 - Ubigeo - Triplet needs nested grid or special handling */}
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                                <FormField label="Departamento" smallLabel>
                                    <select
                                        className="input-field"
                                        value={currentPatient.department}
                                        onChange={(e) => setCurrentPatient({ ...currentPatient, department: e.target.value, province: '', district: '' })}
                                    >
                                        <option value="">Seleccione</option>
                                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </FormField>
                                <FormField label="Provincia" smallLabel>
                                    <select
                                        className="input-field"
                                        value={currentPatient.province}
                                        onChange={(e) => setCurrentPatient({ ...currentPatient, province: e.target.value, district: '' })}
                                        disabled={!currentPatient.department}
                                    >
                                        <option value="">Seleccione</option>
                                        {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </FormField>
                                <FormField label="Distrito" smallLabel>
                                    <select
                                        className="input-field"
                                        value={currentPatient.district}
                                        onChange={(e) => setCurrentPatient({ ...currentPatient, district: e.target.value })}
                                        disabled={!currentPatient.province}
                                    >
                                        <option value="">Seleccione</option>
                                        {districts.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </FormField>
                            </div>

                            {/* Row 9 - Summary full width */}
                            <div className="md:col-span-2">
                                <FormField label="Resumen Clínico">
                                    <textarea
                                        className="input-field"
                                        rows="3"
                                        value={currentPatient.clinicalSummary}
                                        onChange={(e) => setCurrentPatient({ ...currentPatient, clinicalSummary: e.target.value })}
                                    ></textarea>
                                </FormField>
                            </div>

                            {/* Row 10 - Diagnosis full width */}
                            <div className="md:col-span-2">
                                <FormField label="Diagnóstico">
                                    <textarea
                                        className="input-field"
                                        rows="2"
                                        placeholder="Diagnóstico principal del paciente..."
                                        value={currentPatient.diagnosis || ''}
                                        onChange={(e) => setCurrentPatient({ ...currentPatient, diagnosis: e.target.value })}
                                    ></textarea>
                                </FormField>
                            </div>
                        </div>
                    </fieldset>
                </form>
            </Modal >

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Eliminar Paciente"
            >
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <div style={{
                        margin: '0 auto 1.5rem',
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: '#fee2e2',
                        color: '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Trash2 size={40} />
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1f2937' }}>
                        ¿Eliminar este paciente?
                    </h3>

                    <p style={{ color: '#4b5563', marginBottom: '2rem', lineHeight: '1.6' }}>
                        Estás a punto de eliminar a <strong>{patientToDelete?.fullName || `${patientToDelete?.firstName} ${patientToDelete?.lastName}`}</strong>.<br />
                        Esta acción borrará todos sus datos y el historial clínico de forma permanente.
                    </p>

                    {deleteError && (
                        <div style={{ marginBottom: '1.5rem', padding: '0.75rem', background: '#fef2f2', color: '#991b1b', borderRadius: '0.375rem', border: '1px solid #fecaca', fontSize: '0.9rem' }}>
                            <strong>No se puede eliminar:</strong><br />
                            {deleteError.replace('No se puede eliminar:', '')}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            style={{
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: '1px solid #d1d5db',
                                background: 'white',
                                color: '#374151',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmDelete}
                            style={{
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                background: '#dc2626',
                                color: 'white',
                                fontWeight: '500',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.3)',
                                transition: 'all 0.2s'
                            }}
                        >
                            Sí, Eliminar
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default Pacientes;
