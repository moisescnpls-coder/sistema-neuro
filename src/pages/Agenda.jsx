import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, Plus, Search, CheckCircle, XCircle, MoreVertical, CalendarClock, Trash2, ChevronLeft, ChevronRight, Grid, List, AlignJustify, Activity, Stethoscope } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { dataService } from '../services/data';
import Modal from '../components/Modal';
import TriageModal from '../components/TriageModal';
import Toast from '../components/Toast';
import { showAlert } from '../utils/alerts';

const Agenda = () => {
    const { isAdmin, hasPermission, user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // Helper to get current date in Lima timezone (UTC-5)
    const getTodayInLima = () => {
        const now = new Date();
        // Convert to Lima time (UTC-5)
        const limaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
        const year = limaTime.getFullYear();
        const month = String(limaTime.getMonth() + 1).padStart(2, '0');
        const day = String(limaTime.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [appointments, setAppointments] = useState([]);
    const [referralOptions, setReferralOptions] = useState([]); // Autocomplete options
    const [patients, setPatients] = useState([]);
    const [selectedDate, setSelectedDate] = useState(getTodayInLima());
    const [viewMode, setViewMode] = useState('day'); // 'day', 'week', 'month'
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [showPatientList, setShowPatientList] = useState(false);

    // Confirmation State
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [appointmentToCancel, setAppointmentToCancel] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // For deleting history
    const [appointmentToDelete, setAppointmentToDelete] = useState(null);
    const [showPastDateConfirm, setShowPastDateConfirm] = useState(false);
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    const [existingAppointments, setExistingAppointments] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        id: null,
        patientId: '',
        patientName: '', // For display in form
        date: getTodayInLima(),
        time: '09:00',
        type: 'Consulta Inicial',
        notes: '',
        history: [], // Log of changes
        referral: ''
    });

    // Triage Modal State
    const [triageModalOpen, setTriageModalOpen] = useState(false);
    const [triageAppointment, setTriageAppointment] = useState(null);

    // Toast Notification State
    const [toasts, setToasts] = useState([]);

    const openTriage = async (appt) => {
        let triageData = null;
        if (appt.triageId) {
            try {
                const allTriage = await dataService.getPatientTriage(appt.patientId);
                triageData = allTriage.find(t => t.id === appt.triageId);
            } catch (e) {
                console.error("Error fetching triage details", e);
            }
        }
        setTriageAppointment({ ...appt, initialData: triageData });
        setTriageModalOpen(true);
    };

    const handleSaveTriage = async (data) => {
        try {
            console.log("Saving triage data:", data);
            console.log("Context:", triageAppointment);

            if (!triageAppointment || !triageAppointment.patientId || !triageAppointment.id) {
                console.error("Missing IDs:", triageAppointment);
                throw new Error(`Error interno: Datos incompletos (PatID: ${triageAppointment?.patientId}, ApptID: ${triageAppointment?.id})`);
            }

            if (triageAppointment.initialData) {
                // Update existing
                await dataService.updateTriage(triageAppointment.triageId, data);
                showAlert('Triaje actualizado correctamente', 'success');
            } else {
                // Create new
                const payload = {
                    ...data,
                    patientId: triageAppointment.patientId,
                    appointmentId: triageAppointment.id,
                    date: triageAppointment.date
                };

                await dataService.addTriage(payload);
                showAlert('Triaje guardado correctamente', 'success');
            }
            setTriageModalOpen(false);
            setTriageAppointment(null);
            await loadData(); // Refresh to update list status and buttons
        } catch (error) {
            console.error("Triage Save Error:", error);
            showAlert(error.message || 'Error al guardar triaje', 'error');
        }
    };

    useEffect(() => {
        loadData();
        loadReferrals();
    }, []);

    // Handle navigation state after patients load
    useEffect(() => {
        if (patients.length > 0 && location.state?.patientId) {
            const incomingId = location.state.patientId;
            const patient = patients.find(p => String(p.id) === String(incomingId));
            if (patient) {
                selectPatient(patient);
                setIsModalOpen(true);
                // Clear state properly using navigate to prevent reopening on re-renders
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [patients, location.state, navigate, location.pathname]);

    const loadData = async () => {
        setAppointments(await dataService.getAppointments());
        setPatients(await dataService.getPatients());
    };

    const loadReferrals = async () => {
        const refs = await dataService.getUniqueReferrals();
        setReferralOptions(refs);
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();

        // If it's a new appointment, ensure patient is selected
        if (!formData.id && !formData.patientId) return;

        // Validate if date is in the past
        const appointmentDateTime = new Date(`${formData.date}T${formData.time}`);
        const now = new Date();

        // Only check if we haven't already confirmed
        if (appointmentDateTime < now && !showPastDateConfirm) {
            setShowPastDateConfirm(true);
            return;
        }

        // Check for duplicate appointments (only for new appointments)
        if (!formData.id && formData.patientId) {
            // Get today's date in Lima timezone (YYYY-MM-DD format)
            const todayInLima = getTodayInLima();

            const futureAppointments = appointments.filter(a => {
                if (a.patientId != formData.patientId) return false;
                if (a.status === 'Cancelado' || a.status === 'Realizado') return false;
                // Compare dates only (not time), from today onwards
                return a.date >= todayInLima;
            });

            if (futureAppointments.length > 0 && !showDuplicateWarning) {
                // Force fresh state update
                setExistingAppointments([...futureAppointments]);
                // Small delay to ensure state update before showing modal
                setTimeout(() => {
                    setShowDuplicateWarning(true);
                }, 0);
                return;
            }
        }

        await executeSave();
    };

    const executeSave = async () => {
        try {
            if (formData.id) {
                // Rescheduling / Updating
                // Rescheduling / Updating
                const original = appointments.find(a => a.id === formData.id);
                let history = original.history;
                if (typeof history === 'string') {
                    try { history = JSON.parse(history); } catch (e) { history = []; }
                }
                if (!Array.isArray(history)) history = [];

                // Check if date or time changed to log it
                // Defensive comparison: ignore seconds if backend returns HH:mm:ss
                const originalTime = (original.time || '').substring(0, 5);
                const newTime = (formData.time || '').substring(0, 5);

                if (original.date !== formData.date || originalTime !== newTime) {
                    history.push({
                        date: new Date().toISOString(),
                        action: 'Reprogramado',
                        from: `${original.date} ${original.time}`,
                        to: `${formData.date} ${formData.time}`
                    });
                }

                const updated = { ...formData, history };
                await dataService.updateAppointment(updated);
                showAlert('Cita actualizada correctamente', 'success');
            } else {
                // New Appointment
                const patient = patients.find(p => p.id == formData.patientId);
                const appointment = {
                    ...formData,
                    patientName: patient.fullName || (patient.firstName ? `${patient.firstName} ${patient.lastName}` : patient.name),
                    status: 'Programado',
                    createdAt: new Date().toISOString(),
                    createdBy: user?.name || user?.username || 'Sistema',
                    history: []
                };
                await dataService.saveAppointment(appointment);
                showAlert('Cita agendada correctamente', 'success');
            }

            loadData();
            loadReferrals(); // Refresh referrals list
            closeModal();
            setShowPastDateConfirm(false); // Close confirmation if open
            setShowDuplicateWarning(false); // Close duplicate warning if open
        } catch (error) {
            showAlert(error.message || 'Error al guardar cita', 'error');
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setFormData({
            id: null,
            patientId: '',
            patientName: '',
            date: getTodayInLima(),
            time: '09:00',
            type: 'Consulta Inicial',
            notes: '',
            history: [],
            referral: ''
        });
        setSearchTerm('');
        setShowPatientList(false);
        setShowDuplicateWarning(false);
        setExistingAppointments([]);
    };

    const openRescheduleModal = (appointment) => {
        setFormData(appointment);
        setSearchTerm(appointment.patientName); // Pre-fill name for display
        setIsModalOpen(true);
    };

    const updateStatus = async (id, newStatus) => {
        try {
            const appointment = appointments.find(a => a.id === id);
            if (appointment) {
                await dataService.updateAppointment({ ...appointment, status: newStatus });
                loadData();
                showAlert(`Cita marcada como ${newStatus}`, 'success');
            }
        } catch (error) {
            showAlert('Error al actualizar estado', 'error');
        }
    };

    const initiateCancel = (appointment) => {
        setAppointmentToCancel(appointment);
        setShowCancelConfirm(true);
    };

    const confirmCancel = async () => {
        if (appointmentToCancel) {
            await updateStatus(appointmentToCancel.id, 'Cancelado');
            setShowCancelConfirm(false);
            setAppointmentToCancel(null);
        }
    };

    const initiateDelete = (appointment) => {
        setAppointmentToDelete(appointment);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (appointmentToDelete) {
            try {
                await dataService.deleteAppointment(appointmentToDelete.id);
                loadData();
                showAlert('Cita eliminada permanentemente', 'success');
            } catch (error) {
                showAlert('Error al eliminar la cita', 'error');
            }
            setShowDeleteConfirm(false);
            setAppointmentToDelete(null);
        }
    };

    // Helper for status colors
    const statusColors = {
        'Programado': 'var(--primary)',
        'Confirmado': 'var(--success)',
        'Cancelado': 'var(--danger)', // Will be kept visible
        'Realizado': 'var(--text-muted)'
    };


    // Optimized patient search with useMemo and result limiting
    const filteredPatients = React.useMemo(() => {
        if (!searchTerm || searchTerm.length < 2) return []; // Require at least 2 chars

        const term = searchTerm.toLowerCase();
        const results = patients.filter(p => {
            const display = p.fullName || (p.firstName ? `${p.firstName} ${p.lastName}` : '') || '';

            return (
                display.toLowerCase().includes(term) ||
                (p.firstName && p.firstName.toLowerCase().includes(term)) ||
                (p.lastName && p.lastName.toLowerCase().includes(term)) ||
                (p.dni && p.dni.includes(term)) ||
                (p.clinicalHistoryNumber && p.clinicalHistoryNumber.includes(term)) ||
                (p.phone && p.phone.includes(term))
            );
        });

        // Limit to 20 results for performance
        return results.slice(0, 20);
    }, [searchTerm, patients]);

    const changeDate = (direction) => {
        const date = new Date(selectedDate); // Expects 'YYYY-MM-DD', but new Date('YYYY-MM-DD') is UTC.
        // Better to work with local time parts to avoid timezone jumps
        const [y, m, d] = selectedDate.split('-').map(Number);
        const current = new Date(y, m - 1, d);

        if (viewMode === 'day') {
            current.setDate(current.getDate() + direction);
        } else if (viewMode === 'week') {
            current.setDate(current.getDate() + (direction * 7));
        } else if (viewMode === 'month') {
            current.setMonth(current.getMonth() + direction);
        }

        // Format back to YYYY-MM-DD
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        setSelectedDate(`${year}-${month}-${day}`);
    };

    const getDateLabel = () => {
        const [y, m, d] = selectedDate.split('-').map(Number);
        const date = new Date(y, m - 1, d);

        const options = { year: 'numeric', month: 'long', day: 'numeric' };

        if (viewMode === 'day') {
            return date.toLocaleDateString('es-PE', { weekday: 'long', ...options });
        } else if (viewMode === 'week') {
            const start = new Date(date);
            const day = start.getDay() || 7; // 1=Mon, 7=Sun (if 0 is sun, make it 7)
            if (day !== 1) start.setDate(start.getDate() - (day - 1)); // Go to Monday

            const end = new Date(start);
            end.setDate(end.getDate() + 6);

            return `${start.getDate()} - ${end.getDate()} ${end.toLocaleDateString('es-PE', { month: 'long' })}`;
        } else if (viewMode === 'month') {
            return date.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
        }
    };

    const getAppointmentsForView = () => {
        const [y, m, d] = selectedDate.split('-').map(Number);
        const current = new Date(y, m - 1, d);

        if (viewMode === 'day') {
            return appointments
                .filter(a => a.date === selectedDate)
                .sort((a, b) => a.time.localeCompare(b.time));
        }

        if (viewMode === 'week') {
            const start = new Date(current);
            const day = start.getDay() || 7;
            if (day !== 1) start.setDate(start.getDate() - (day - 1));

            // Generate array of 7 date strings
            const weekDates = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(start);
                d.setDate(d.getDate() + i);
                weekDates.push(d.toLocaleDateString('en-CA')); // YYYY-MM-DD
            }
            // Return all appts in these dates
            return appointments.filter(a => weekDates.includes(a.date));
        }

        if (viewMode === 'month') {
            const MonthStr = String(m).padStart(2, '0');
            return appointments.filter(a => a.date.startsWith(`${y}-${MonthStr}`));
        }
        return [];
    };

    const selectPatient = (patient) => {
        const display = patient.fullName || (patient.firstName ? `${patient.firstName} ${patient.lastName}` : '');
        setFormData({
            ...formData,
            patientId: patient.id,
            patientName: display
        });
        setSearchTerm(display);
        setShowPatientList(false);
    };

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="section-title" style={{ margin: 0 }}>Agenda de Citas</h2>
                <button onClick={() => setIsModalOpen(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={20} />
                    Nueva Cita
                </button>
            </div>

            {/* Header / Navigation Controls */}
            <div className="card" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', background: 'var(--bg-body)', borderRadius: 'var(--radius-sm)', padding: '4px' }}>
                        <button
                            onClick={() => setViewMode('day')}
                            className={viewMode === 'day' ? 'btn-white' : 'btn-text'}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem', boxShadow: viewMode === 'day' ? 'var(--shadow-sm)' : 'none' }}
                        >
                            Día
                        </button>
                        <button
                            onClick={() => setViewMode('week')}
                            className={viewMode === 'week' ? 'btn-white' : 'btn-text'}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem', boxShadow: viewMode === 'week' ? 'var(--shadow-sm)' : 'none' }}
                        >
                            Semana
                        </button>
                        <button
                            onClick={() => setViewMode('month')}
                            className={viewMode === 'month' ? 'btn-white' : 'btn-text'}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem', boxShadow: viewMode === 'month' ? 'var(--shadow-sm)' : 'none' }}
                        >
                            Mes
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => changeDate(-1)} className="btn-secondary" style={{ padding: '0.4rem' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', minWidth: '200px', textAlign: 'center' }}>
                        {getDateLabel()}
                    </div>
                    <button onClick={() => changeDate(1)} className="btn-secondary" style={{ padding: '0.4rem' }}>
                        <ChevronRight size={20} />
                    </button>
                </div>

                <button onClick={() => { setSelectedDate(getTodayInLima()); setViewMode('day'); }} className="btn-secondary">
                    Hoy
                </button>
            </div>

            {/* Content Area */}
            <div style={{ minHeight: '60vh' }}>
                {viewMode === 'day' && (
                    <div style={{ display: 'grid', gap: '1rem', alignContent: 'start' }}>
                        {getAppointmentsForView().length > 0 ? (
                            getAppointmentsForView().map(app => (
                                <div key={app.id} className="card animate-fade-in" style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    borderLeft: `4px solid ${statusColors[app.status] || 'var(--border)'} `
                                }}>
                                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                        <div style={{ textAlign: 'center', minWidth: '80px' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{app.time}</h3>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{app.type}</span>
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span
                                                    onClick={() => hasPermission('access_attention') ? navigate(`/atencion/${app.id}`) : navigate(`/pacientes/${app.patientId}`)}
                                                    style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
                                                    className="hover:text-blue-600 hover:underline"
                                                    title={hasPermission('access_attention') ? "Ir a Atención Clínica" : "Ver detalles del paciente"}
                                                >
                                                    {app.patientName}
                                                </span>
                                                {(() => {
                                                    let history = app.history;
                                                    if (typeof history === 'string') {
                                                        try { history = JSON.parse(history); } catch (e) { history = []; }
                                                    }
                                                    history = Array.isArray(history) ? history : [];

                                                    const rescheduleCount = history.filter(h => h.action === 'Reprogramado').length;
                                                    if (rescheduleCount > 0) {
                                                        return (
                                                            <span style={{ fontSize: '0.7rem', background: '#fff7ed', color: '#c2410c', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fed7aa' }}>
                                                                Reprogramado ({rescheduleCount})
                                                            </span>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </h4>
                                            {/* HC Number */}
                                            {(() => {
                                                const patient = patients.find(p => p.id == app.patientId);
                                                return (
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '0.2rem' }}>
                                                        {patient?.clinicalHistoryNumber && (
                                                            <span style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: '600' }}>
                                                                HC: {patient.clinicalHistoryNumber}
                                                            </span>
                                                        )}
                                                        {app.triageId && (
                                                            <span style={{ background: '#f0fdf4', color: '#166534', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Activity size={12} /> {app.systolic}/{app.diastolic} {app.oxygenSaturation ? ` • ${app.oxygenSaturation}% SpO2` : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                            <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{app.notes || 'Sin notas adicionales'}</p>
                                            {app.referral && (
                                                <p style={{ margin: '0.2rem 0 0', color: '#059669', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                                    Referido por: {app.referral}
                                                </p>
                                            )}
                                            {(app.createdBy || app.createdAt) && (
                                                <div style={{ margin: '0.5rem 0 0', color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic', display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                                                    {app.createdBy && <span>Agendado por: {app.createdBy}</span>}
                                                    {app.createdAt && <span>Creado el: {new Date(app.createdAt).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ padding: '0.3rem 0.8rem', borderRadius: '1rem', fontSize: '0.8rem', background: `color-mix(in srgb, ${statusColors[app.status]} 10%, transparent)`, color: statusColors[app.status], fontWeight: '500' }}>
                                            {app.status}
                                        </span>
                                        {/* Actions */}
                                        {(app.status === 'Programado' || app.status === 'Confirmado') && (
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                {/* BTN TRIAJE - Visible to both Reception and Doctor */}
                                                <button
                                                    onClick={() => openTriage(app)}
                                                    className="btn-white"
                                                    style={{
                                                        fontSize: '0.85rem',
                                                        color: app.triageId ? '#059669' : '#3b82f6',
                                                        borderColor: app.triageId ? '#bbf7d0' : '#e5e7eb',
                                                        background: app.triageId ? '#f0fdf4' : 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '0.5rem 0.8rem'
                                                    }}
                                                >
                                                    <Activity size={16} /> {app.triageId ? 'Editar Triaje' : 'Triaje'}
                                                </button>

                                                {app.status === 'Programado' && (
                                                    <div style={{ display: 'flex', gap: '5px' }}>
                                                        <button onClick={() => openRescheduleModal(app)} title="Reprogramar" className="btn-white" style={{ padding: '0.5rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}><CalendarClock size={18} /></button>
                                                        <button onClick={() => updateStatus(app.id, 'Confirmado')} title="Confirmar" className="btn-white" style={{ padding: '0.5rem', color: 'var(--success)' }}><CheckCircle size={18} /></button>
                                                        {hasPermission('delete_appointments') && <button onClick={() => initiateCancel(app)} title="Cancelar" className="btn-white" style={{ padding: '0.5rem', color: 'var(--danger)' }}><XCircle size={18} /></button>}
                                                        {hasPermission('delete_history_appointments') && <button onClick={() => initiateDelete(app)} title="Eliminar permanentemente" className="btn-white" style={{ padding: '0.5rem', color: 'var(--text-muted)' }}><Trash2 size={18} /></button>}
                                                    </div>
                                                )}

                                                {app.status === 'Confirmado' && hasPermission('access_attention') && (
                                                    <button onClick={() => navigate(`/atencion/${app.id}`)} className="btn-primary" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', padding: '0.5rem 1rem' }}>
                                                        <Stethoscope size={16} /> Atender
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {(app.status === 'Cancelado' || app.status === 'Realizado') && hasPermission('delete_history_appointments') && <button onClick={() => initiateDelete(app)} title="Eliminar permanentemente" className="btn-white" style={{ padding: '0.5rem', color: 'var(--text-muted)' }}><Trash2 size={18} /></button>}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-light)' }}>
                                <CalendarIcon size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                <p>No hay citas programadas para este día.</p>
                                <button onClick={() => setIsModalOpen(true)} style={{ color: 'var(--primary)', marginTop: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>+ Programar una cita</button>
                            </div>
                        )}
                    </div>
                )}

                {viewMode === 'week' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', overflowX: 'auto' }}>
                        {(() => {
                            const [y, m, d] = selectedDate.split('-').map(Number);
                            const current = new Date(y, m - 1, d);
                            const start = new Date(current);
                            const day = start.getDay() || 7;
                            if (day !== 1) start.setDate(start.getDate() - (day - 1));

                            const days = [];
                            for (let i = 0; i < 7; i++) {
                                const d = new Date(start);
                                d.setDate(d.getDate() + i);
                                days.push(d);
                            }

                            return days.map(dObj => {
                                const dStr = dObj.toLocaleDateString('en-CA');
                                const dayAppts = appointments.filter(a => a.date === dStr).sort((a, b) => a.time.localeCompare(b.time));
                                const isToday = dStr === new Date().toLocaleDateString('en-CA');

                                return (
                                    <div key={dStr} className="card" style={{ padding: '0.5rem', minHeight: '300px', display: 'flex', flexDirection: 'column', background: isToday ? '#eff6ff' : 'white', borderColor: isToday ? 'var(--primary)' : 'var(--border)' }}>
                                        <div
                                            style={{ textAlign: 'center', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                                            onClick={() => { setSelectedDate(dStr); setViewMode('day'); }}
                                        >
                                            <div style={{ textTransform: 'capitalize', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{dObj.toLocaleDateString('es-PE', { weekday: 'short' })}</div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{dObj.getDate()}</div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                            {dayAppts.map(appt => (
                                                <div key={appt.id}
                                                    onClick={() => { setSelectedDate(dStr); setViewMode('day'); }}
                                                    style={{
                                                        padding: '0.4rem',
                                                        borderRadius: '4px',
                                                        background: statusColors[appt.status],
                                                        color: 'white',
                                                        fontSize: '0.7rem',
                                                        cursor: 'pointer',
                                                        opacity: 0.9
                                                    }}
                                                >
                                                    <strong>{appt.time}</strong> {(() => {
                                                        const nameParts = (appt.patientName || '').trim().split(' ');
                                                        return nameParts.length > 0 ? nameParts[nameParts.length - 1] : '';
                                                    })()}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                )}

                {viewMode === 'month' && (
                    <div className="card" style={{ padding: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)' }}>
                            {/* Headers */}
                            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                                <div key={day} style={{ background: '#f8fafc', padding: '0.5rem', textAlign: 'center', fontWeight: '600', fontSize: '0.8rem' }}>{day}</div>
                            ))}

                            {/* Calendar Grid */}
                            {(() => {
                                const [y, m, d] = selectedDate.split('-').map(Number);
                                const current = new Date(y, m - 1, 1);
                                const startDay = current.getDay() || 7; // 1-7
                                const daysInMonth = new Date(y, m, 0).getDate();
                                const cells = [];

                                // Empty cells
                                for (let i = 1; i < startDay; i++) {
                                    cells.push(<div key={`empty-${i}`} style={{ background: 'white', minHeight: '100px' }}></div>);
                                }

                                // Days
                                for (let i = 1; i <= daysInMonth; i++) {
                                    const dStr = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                                    const dayAppts = appointments.filter(a => a.date === dStr);
                                    const isToday = dStr === new Date().toLocaleDateString('en-CA');

                                    cells.push(
                                        <div
                                            key={dStr}
                                            onClick={() => { setSelectedDate(dStr); setViewMode('day'); }}
                                            style={{
                                                background: isToday ? '#eff6ff' : 'white',
                                                minHeight: '100px',
                                                padding: '5px',
                                                cursor: 'pointer',
                                                position: 'relative'
                                            }}
                                            className="hover:bg-gray-50"
                                        >
                                            <div style={{ fontSize: '0.9rem', fontWeight: isToday ? 'bold' : 'normal', color: isToday ? 'var(--primary)' : 'inherit' }}>{i}</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                                                {dayAppts.slice(0, 3).map(appt => (
                                                    <div key={appt.id} style={{ fontSize: '10px', background: statusColors[appt.status], color: 'white', padding: '1px 3px', borderRadius: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {appt.time} {(() => {
                                                            const nameParts = (appt.patientName || '').trim().split(' ');
                                                            return nameParts.length > 0 ? nameParts[nameParts.length - 1] : '';
                                                        })()}
                                                    </div>
                                                ))}
                                                {dayAppts.length > 3 && (
                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>+ {dayAppts.length - 3} más</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }
                                return cells;
                            })()}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Nueva/Editar Cita */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={formData.id ? 'Reprogramar Cita' : 'Agendar Nueva Cita'}
                footer={
                    <>
                        <button type="button" onClick={closeModal} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                        <button type="submit" form="agenda-form" className="btn-primary" style={{ flex: 1 }}>{formData.id ? 'Guardar Cambios' : 'Agendar Cita'}</button>
                    </>
                }
            >
                <form id="agenda-form" onSubmit={handleSave} className="grid-form" style={{ gridTemplateColumns: '1fr' }}>

                    {/* Patient Search - Only show search if new appointment */}
                    {!formData.id && (
                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Buscar Paciente</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, apellido o DNI..."
                                    className="input-field"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setShowPatientList(true); }}
                                    onFocus={() => setShowPatientList(true)}
                                    style={{ paddingLeft: '2.5rem' }}
                                />
                                <Search size={18} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            </div>

                            {showPatientList && searchTerm && (
                                <div className="card" style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    zIndex: 10,
                                    marginTop: '5px',
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    padding: 0,
                                    border: '1px solid var(--border)',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}>
                                    {searchTerm.length < 2 ? (
                                        <div style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>
                                            Digite al menos 2 caracteres para buscar...
                                        </div>
                                    ) : filteredPatients.length > 0 ? (
                                        <>
                                            {filteredPatients.map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => selectPatient(p)}
                                                    style={{
                                                        padding: '0.8rem',
                                                        borderBottom: '1px solid var(--border)',
                                                        cursor: 'pointer',
                                                        transition: 'background 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                                                    onMouseLeave={(e) => e.target.style.background = 'white'}
                                                >
                                                    <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                                                        {p.fullName || (p.firstName ? `${p.firstName} ${p.lastName}` : p.name)}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                                                        <span><strong>HC:</strong> {p.clinicalHistoryNumber || '-'}</span>
                                                        <span><strong>{p.documentType || 'Doc'}:</strong> {p.dni || '-'}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {filteredPatients.length === 20 && (
                                                <div style={{ padding: '0.5rem', background: '#f8fafc', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.75rem', borderTop: '1px solid var(--border)' }}>
                                                    Mostrando primeiros 20 resultados. Refine sua busca para encontrar outros.
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>No se encontraron pacientes.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* If editing/rescheduling, just show the name read-only */}
                    {formData.id && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Paciente</label>
                            <input className="input-field" value={formData.patientName} readOnly style={{ background: 'var(--bg-body)' }} />
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Fecha</label>
                            <input
                                type="date"
                                required
                                className="input-field"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Hora</label>
                            <input
                                type="time"
                                required
                                className="input-field"
                                value={formData.time}
                                onChange={e => setFormData({ ...formData, time: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Tipo</label>
                        <select
                            className="input-field"
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                        >
                            <option>Consulta Inicial</option>
                            <option>Seguimiento</option>
                            <option>Lectura de Examenes</option>
                            <option>Procedimiento</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Notas / Motivo</label>
                        <textarea
                            className="input-field"
                            rows="2"
                            placeholder="Motivo principal de la consulta..."
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        ></textarea>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Referido por</label>
                        <input
                            type="text"
                            list="referral-options"
                            placeholder="Nombre del doctor que refiere..."
                            className="input-field"
                            value={formData.referral || ''}
                            onChange={e => setFormData({ ...formData, referral: e.target.value })}
                        />
                        <datalist id="referral-options">
                            {referralOptions.map((ref, i) => (
                                <option key={i} value={ref} />
                            ))}
                        </datalist>
                    </div>

                    {/* View History if Rescheduled */}
                    {formData.history && formData.history.length > 0 && (
                        <div style={{ background: '#fff7ed', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid #fed7aa' }}>
                            <h5 style={{ margin: '0 0 0.5rem 0', color: '#9a3412', fontSize: '0.9rem' }}>Historial de Cambios</h5>
                            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#c2410c' }}>
                                {formData.history.map((h, i) => (
                                    <li key={i}>
                                        Reprogramado de {h.from} a {h.to}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                </form>
            </Modal>

            {/* Confirmation Modal */}
            <Modal isOpen={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} title="Confirmar Cancelación">
                <div style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ background: '#fee2e2', padding: '1rem', borderRadius: '50%', color: '#ef4444' }}>
                            <XCircle size={48} />
                        </div>
                    </div>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>¿Está seguro que desea cancelar esta cita?</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                        Esta acción cambiará o estado da cita para "Cancelado".
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button
                            onClick={() => setShowCancelConfirm(false)}
                            className="btn-secondary"
                        >
                            No, Volver
                        </button>
                        <button
                            onClick={confirmCancel}
                            className="btn-primary"
                            style={{ background: '#ef4444', borderColor: '#ef4444' }}
                        >
                            Si, Cancelar Cita
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Past Date Confirmation Modal */}
            <Modal isOpen={showPastDateConfirm} onClose={() => setShowPastDateConfirm(false)} title="Fecha Pasada Detectada">
                <div style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ background: '#ffedd5', padding: '1rem', borderRadius: '50%', color: '#f97316' }}>
                            <Clock size={48} />
                        </div>
                    </div>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>¿Confirma agendar en el pasado?</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                        Está intentando agendar una cita para <strong>{new Date(`${formData.date}T${formData.time}`).toLocaleString()}</strong>, que es una fecha pasada.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button
                            onClick={() => setShowPastDateConfirm(false)}
                            className="btn-secondary"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={executeSave}
                            className="btn-primary"
                            style={{ background: '#f97316', borderColor: '#f97316' }}
                        >
                            Sí, Agendar de todas formas
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete History Modal */}
            <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Eliminar Cita Permanentemente">
                <div style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '50%', color: '#4b5563' }}>
                            <Trash2 size={48} />
                        </div>
                    </div>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>¿Eliminar registro histórico?</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                        Estás a punto de eliminar una cita <strong>{appointmentToDelete?.status}</strong>. Esta acción no se puede deshacer.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary">Cancelar</button>
                        <button onClick={confirmDelete} className="btn-primary" style={{ background: '#4b5563', borderColor: '#4b5563' }}>Eliminar</button>
                    </div>
                </div>
            </Modal>

            {/* Duplicate Appointment Warning Modal */}
            <Modal isOpen={showDuplicateWarning} onClose={() => { setShowDuplicateWarning(false); setExistingAppointments([]); }} title="Cita Duplicada Detectada">
                <div style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '50%', color: '#f59e0b' }}>
                            <CalendarClock size={48} />
                        </div>
                    </div>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Este paciente ya tiene cita(s) programada(s)</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                        El paciente <strong>{formData.patientName}</strong> ya tiene {existingAppointments.length} cita{existingAppointments.length > 1 ? 's' : ''} programada{existingAppointments.length > 1 ? 's' : ''}:
                    </p>

                    {/* List of existing appointments */}
                    <div style={{
                        background: '#f8fafc',
                        borderRadius: '8px',
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        textAlign: 'left',
                        maxHeight: '200px',
                        overflowY: 'auto'
                    }}>
                        {existingAppointments.map((appt, index) => (
                            <div key={appt.id} style={{
                                padding: '0.75rem',
                                background: 'white',
                                borderRadius: '6px',
                                marginBottom: index < existingAppointments.length - 1 ? '0.5rem' : '0',
                                border: '1px solid #e2e8f0'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    <CalendarIcon size={14} color="var(--primary)" />
                                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                                        {(() => {
                                            // Parse date correctly to avoid timezone issues
                                            const [year, month, day] = appt.date.split('-').map(Number);
                                            const localDate = new Date(year, month - 1, day);
                                            return localDate.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
                                        })()}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '1.25rem' }}>
                                    <Clock size={14} color="var(--text-muted)" />
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{appt.time}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>•</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{appt.type}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p style={{ color: '#92400e', fontSize: '0.9rem', marginBottom: '2rem', fontStyle: 'italic' }}>
                        ¿Está seguro que desea agendar otra cita para este paciente?
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button
                            onClick={() => {
                                setShowDuplicateWarning(false);
                                setExistingAppointments([]);
                            }}
                            className="btn-secondary"
                        >
                            No, Cancelar
                        </button>
                        <button
                            onClick={executeSave}
                            className="btn-primary"
                            style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                        >
                            Sí, Agendar de todas formas
                        </button>
                    </div>
                </div>
            </Modal>
            {triageAppointment && (
                <TriageModal
                    isOpen={triageModalOpen}
                    onClose={() => setTriageModalOpen(false)}
                    onSave={handleSaveTriage}
                    patientName={triageAppointment.patientName}
                    initialData={triageAppointment.initialData}
                />
            )}
        </div >
    );
};

export default Agenda;
