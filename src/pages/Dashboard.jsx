import React, { useState, useEffect, useRef } from 'react';
import { Users, Calendar, Activity, Search, UserPlus, ArrowRight, Clock, FileText } from 'lucide-react';
import { dataService } from '../services/data';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { showAlert } from '../utils/alerts';

const StatCard = ({ title, value, icon, color, subtext, onClick }) => (
    <div className="card animate-fade-in" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        borderLeft: `4px solid ${color}`,
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        cursor: onClick ? 'pointer' : 'default'
    }}
        onClick={onClick}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
    >
        <div style={{
            padding: '1rem',
            borderRadius: '50%',
            background: `${color}20`, // 20% opacity using hex logic if color is hex, but here color is likely rgb var... let's assume it handles rgba
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {icon}
        </div>
        <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.2rem', fontWeight: '500' }}>{title}</p>
            <h3 style={{ fontSize: '2.2rem', fontWeight: 'bold', margin: '0', lineHeight: 1, color: 'var(--text-main)' }}>{value}</h3>
            {subtext && <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.4rem' }}>{subtext}</p>}
        </div>
    </div>
);

const QuickAction = ({ title, icon, color, onClick, description }) => (
    <button
        onClick={onClick}
        className="card animate-fade-in"
        style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            border: '2px solid transparent',
            height: '100%',
            transition: 'all 0.3s ease',
            background: 'white'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = color;
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        }}
    >
        <div style={{
            padding: '1.2rem',
            borderRadius: '50%',
            background: `${color}20`,
            color: color,
            marginBottom: '1rem',
            fontSize: '1.5rem'
        }}>
            {icon}
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-main)' }}>{title}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.4' }}>{description}</p>
    </button>
);

const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const diff = Date.now() - new Date(birthDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

const Dashboard = () => {
    const navigate = useNavigate();
    const { user, hasPermission } = useAuth();
    const appointmentsRef = useRef(null);
    const [stats, setStats] = useState({ total: 0, gender: [], recent: [], appointments: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await dataService.getDashboardStats();

                // Check if data contains an error
                if (data.error) {
                    setError(data.error);
                    setStats({ total: 0, gender: [], recent: [], appointments: [], pendingExams: 0 });
                } else {
                    // Filter past appointments (more than 20 min tolerance)
                    if (data.appointments) {
                        const now = new Date();

                        data.appointments = data.appointments.filter(appt => {
                            if (!appt.date) return false;

                            // Parse date and time
                            const [year, month, day] = appt.date.split('-').map(Number);
                            let hours = 0, minutes = 0;

                            if (appt.time) {
                                [hours, minutes] = appt.time.split(':').map(Number);
                            }

                            const apptDateTime = new Date(year, month - 1, day, hours, minutes);


                            // Calculate time limit: appointment time + 20 minutes
                            const limitTime = new Date(apptDateTime.getTime() + 20 * 60000);


                            return now <= limitTime;
                        });
                    }

                    setStats(data);
                    setError(null);
                }
            } catch (error) {
                console.error("Failed to load dashboard stats", error);
                setError(error.message || "Error al cargar las estadísticas");
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    const [showModal, setShowModal] = useState(false);
    const [modalContent, setModalContent] = useState({ title: '', items: [] });

    const handleShowAppointments = () => {
        // Scroll to the appointments panel
        if (appointmentsRef.current) {
            appointmentsRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    };

    const handleShowExams = async () => {
        if (!hasPermission('view_clinical') && !hasPermission('view_reports')) {
            showAlert('No tiene permisos para ver detalles de exámenes', 'warning');
            return;
        }

        if (!stats.pendingExams || stats.pendingExams === 0) {
            showAlert('No hay exámenes pendientes de resultados', 'info');
            return;
        }

        try {
            // Fetch all exams and filter pending ones
            const allExams = await dataService.getReport('exams', {
                startDate: '2020-01-01',
                endDate: new Date().toISOString().split('T')[0],
                status: 'Solicitado'
            });

            setModalContent({
                title: 'Exámenes Pendientes',
                items: allExams.map(exam => ({
                    id: exam.id,
                    line1: exam.patientName || 'Paciente',
                    line2: exam.type || 'Examen',
                    line3: exam.date ? `Solicitado: ${exam.date}` : ''
                }))
            });
            setShowModal(true);
        } catch (error) {
            console.error('Error fetching exams:', error);
            showAlert('Error al cargar detalles de exámenes', 'error');
        }
    };

    const getGenderCount = (gender) => {
        if (!stats.gender) return 0;
        const found = stats.gender.find(g => g.gender?.toUpperCase().startsWith(gender));
        return found ? found.count : 0;
    };

    const maleCount = getGenderCount('M');
    const femaleCount = getGenderCount('F');

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column' }}>
            <div style={{ width: '50px', height: '50px', border: '4px solid #e2e8f0', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Cargando tablero...</p>
        </div>
    );

    if (error) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column' }}>
            <div style={{ background: '#fee', padding: '2rem', borderRadius: '8px', border: '2px solid #fcc', maxWidth: '500px', textAlign: 'center' }}>
                <h3 style={{ color: '#c33', marginBottom: '1rem' }}>Error al Cargar Estadísticas</h3>
                <p style={{ color: '#666', marginBottom: '1.5rem' }}>{error}</p>
                <button
                    className="btn-primary"
                    onClick={() => window.location.reload()}
                    style={{ padding: '0.5rem 1.5rem' }}
                >
                    Reintentar
                </button>
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 className="section-title" style={{ marginBottom: '0.5rem' }}>Panel Principal</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Bienvenido al Sistema de Gestión Neurológica</p>
                </div>
                <div className="card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    <Calendar size={16} color="var(--primary)" />
                    {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <StatCard
                    title="Total Pacientes"
                    value={stats.total.toLocaleString()}
                    icon={<Users size={32} />}
                    color="var(--primary)"
                    subtext="Base de datos activa"
                />

                <StatCard
                    title="Hombres"
                    value={maleCount.toLocaleString()}
                    icon={<Users size={32} />}
                    color="#6366f1" // Indigo
                    subtext={`${((maleCount / (stats.total || 1)) * 100).toFixed(1)}% del total`}
                />
                <StatCard
                    title="Mujeres"
                    value={femaleCount.toLocaleString()}
                    icon={<Users size={32} />}
                    color="#ec4899" // Pink
                    subtext={`${((femaleCount / (stats.total || 1)) * 100).toFixed(1)}% del total`}
                />
                <StatCard
                    title="Próximas Citas"
                    value={stats.appointments?.length || 0}
                    icon={<Calendar size={32} />}
                    color="#10b981" // Emerald
                    subtext="Programadas para breve"
                    onClick={handleShowAppointments}
                />
                <StatCard
                    title="Exámenes"
                    value={stats.pendingExams || 0}
                    icon={<FileText size={32} />}
                    color="#f59e0b" // Amber
                    subtext="Pendientes de resultados"
                    onClick={handleShowExams}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

                    {/* Quick Actions */}
                    <section>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Activity size={20} color="var(--text-muted)" /> Acciones Rápidas
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                            <QuickAction
                                title="Nuevo Paciente"
                                description="Registrar ficha clínica"
                                icon={<UserPlus size={28} />}
                                color="var(--primary)"
                                onClick={() => navigate('/pacientes', { state: { openModal: true } })}
                            />
                            <QuickAction
                                title="Buscar Paciente"
                                description="Consultar historial"
                                icon={<Search size={28} />}
                                color="#8b5cf6" // Purple
                                onClick={() => navigate('/pacientes')}
                            />
                            <QuickAction
                                title="Agendar Cita"
                                description="Nueva consulta"
                                icon={<Calendar size={28} />}
                                color="#10b981" // Green
                                onClick={() => navigate('/agenda')}
                            />
                        </div>
                    </section>

                    {/* Recent Patients Table */}
                    <section className="card" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Pacientes Recientes</h3>
                            <button
                                onClick={() => navigate('/pacientes')}
                                style={{ color: 'var(--primary)', fontWeight: '500', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', background: 'none', border: 'none' }}
                            >
                                Ver todos <ArrowRight size={16} />
                            </button>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nombre Completo</th>
                                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>HC</th>
                                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Edad</th>
                                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recent?.map((patient) => (
                                        <tr key={patient.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                                            <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-main)' }}>
                                                {patient.fullName || `${patient.firstName} ${patient.lastName}`}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <span style={{ background: '#e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>
                                                    {patient.clinicalHistoryNumber}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>
                                                {patient.age || calculateAge(patient.birthDate) ? `${patient.age || calculateAge(patient.birthDate)} años` : '-'}
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => navigate(`/atencion/paciente/${patient.id}`)}
                                                    className="btn-secondary"
                                                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                                                >
                                                    Historia
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!stats.recent || stats.recent.length === 0) && (
                                        <tr>
                                            <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-light)', fontStyle: 'italic' }}>
                                                No hay pacientes recientes.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                {/* Right Column - Appointments */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <section ref={appointmentsRef} className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={20} color="var(--primary)" /> Citas Próximas
                            </h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
                            {stats.appointments?.map((appt) => (
                                <div key={appt.id} style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--bg-body)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                    <div style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', textAlign: 'center', minWidth: '50px', boxShadow: 'var(--shadow-sm)' }}>
                                        <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-light)' }}>
                                            {(() => {
                                                const [y, m, d] = appt.date.split('-').map(Number);
                                                const date = new Date(y, m - 1, d);
                                                return date.toLocaleDateString('es-PE', { month: 'short' });
                                            })()}
                                        </span>
                                        <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                            {appt.date.split('-')[2]}
                                        </span>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.2rem' }}>{appt.patientName || 'Paciente'}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            <Clock size={14} />
                                            <span>{appt.time}</span>
                                        </div>
                                        <span style={{ display: 'inline-block', marginTop: '0.5rem', padding: '0.2rem 0.5rem', background: '#dcfce7', color: '#15803d', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                            {appt.type}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {(!stats.appointments || stats.appointments.length === 0) && (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-light)' }}>
                                    <div style={{ background: 'var(--bg-body)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                        <Calendar size={30} color="#cbd5e1" />
                                    </div>
                                    <p>No hay citas programadas para hoy.</p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => navigate('/agenda')}
                            className="btn-secondary"
                            style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}
                        >
                            Ir a Agenda Completa
                        </button>
                    </section>
                </div>
            </div>

            {/* Modal for displaying exam details */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={modalContent.title}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {modalContent.items.map((item, index) => (
                        <div
                            key={item.id || index}
                            style={{
                                padding: '1rem',
                                background: 'var(--bg-body)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)'
                            }}
                        >
                            <p style={{ fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                                {item.line1}
                            </p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                {item.line2}
                            </p>
                            {item.line3 && (
                                <span style={{
                                    display: 'inline-block',
                                    marginTop: '0.5rem',
                                    padding: '0.2rem 0.5rem',
                                    background: '#dcfce7',
                                    color: '#15803d',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                }}>
                                    {item.line3}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </Modal>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
