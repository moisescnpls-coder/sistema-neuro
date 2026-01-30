import React, { useState } from 'react';
import { FileBarChart, Download, Calendar, Users, Activity, Filter, Printer, ChevronRight, X, Search, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/data';
import { ubigeoService } from '../services/ubigeo';

import { useLocation } from 'react-router-dom';

const Relatorios = () => {
    const { hasPermission, isAdmin } = useAuth();
    const location = useLocation(); // Hook for reading state
    const [activeReport, setActiveReport] = useState(null);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        status: '',
        department: '',
        gender: ''
    });
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isFilterOpen, setIsFilterOpen] = useState(true);
    const [settings, setSettings] = useState(null);

    React.useEffect(() => {
        dataService.getSettings().then(setSettings).catch(console.error);

        // Auto-select report from navigation state
        if (location.state?.activeReport) {
            setActiveReport(location.state.activeReport);
            if (location.state.filters) {
                setFilters(prev => ({ ...prev, ...location.state.filters }));
                // Optional: Auto-generate logic could go here or user clicks manually
            }
        }
    }, [location.state]); // Depend on location.state

    const API_HOST = `http://${window.location.hostname}:5000`;

    const departments = ubigeoService.getDepartments();

    if (!isAdmin && !hasPermission('view_reports')) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center p-8 bg-white/50 backdrop-blur rounded-xl shadow-lg border border-red-100">
                    <div className="bg-red-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-red-500">
                        <Filter size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Acceso Restringido</h2>
                    <p className="text-gray-500">No tiene permiso para visualizar este módulo.</p>
                </div>
            </div>
        );
    }

    const reportTypes = [
        {
            id: 'patients',
            title: 'Pacientes Nuevos',
            icon: <Users size={32} />,
            desc: 'Análisis detallado del crecimiento de pacientes, segmentado por demografía y ubicación.',
            color: 'from-blue-500 to-cyan-500',
            bg: 'bg-blue-50',
            text: 'text-blue-600'
        },
        {
            id: 'appointments',
            title: 'Control de Citas',
            icon: <Calendar size={32} />,
            desc: 'Monitoreo de asistencia, cancelaciones y carga de trabajo por agenda.',
            color: 'from-emerald-500 to-teal-500',
            bg: 'bg-emerald-50',
            text: 'text-emerald-600'
        },
        {
            id: 'exams',
            title: 'Exámenes Clínicos',
            icon: <Activity size={32} />,
            desc: 'Seguimiento de solicitudes de exámenes, estados de resultados y productividad.',
            color: 'from-violet-500 to-purple-500',
            bg: 'bg-violet-50',
            text: 'text-violet-600'
        },
    ];

    const handleGenerate = async () => {
        if (!activeReport) return;

        // Validation: Date Range is required
        if (!filters.startDate || !filters.endDate) {
            setError('Por favor, selecciona un rango de fechas (Desde y Hasta) para generar el reporte.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const cleanFilters = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''));
            const data = await dataService.getReport(activeReport, cleanFilters);
            setResults(data);
            if (window.innerWidth < 768) setIsFilterOpen(false); // Auto close on mobile
        } catch (err) {
            setError(err.message);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadCSV = () => {
        if (results.length === 0) return;
        const headers = Object.keys(results[0]).join(',');
        const rows = results.map(row => Object.values(row).map(v => `"${v || ''}"`).join(','));
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `reporte_${activeReport}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const resetFilters = () => {
        setFilters({ startDate: '', endDate: '', status: '', department: '', gender: '' });
        setResults([]);
        setError(null);
        setIsFilterOpen(true);
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 pb-24 fade-in-animation">
            {/* Header / Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 print:hidden">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3 tracking-tight">
                        <div className="p-5 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30 border-2 border-white/20">
                            <FileBarChart size={32} />
                        </div>
                        Reportes Estratégicos
                    </h1>
                    <p className="text-slate-500 mt-2 ml-1 text-lg font-light">
                        Inteligencia de negocios para su centro médico.
                    </p>
                </div>
            </div>

            {/* Selection Grid */}
            {!activeReport ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-12 print:hidden">
                    {reportTypes.map((report) => (
                        <div
                            key={report.id}
                            onClick={() => { setActiveReport(report.id); resetFilters(); }}
                            className="group relative bg-white rounded-2xl shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer border border-slate-100 overflow-hidden"
                            style={{ padding: '20px' }}
                        >
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${report.color} opacity-10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150`}></div>

                            <div className={`mb-6 inline-flex p-4 rounded-2xl ${report.bg} ${report.text} shadow-inner`}>
                                {report.icon}
                            </div>

                            <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors">
                                {report.title}
                            </h3>
                            <p className="text-slate-500 leading-relaxed mb-6">
                                {report.desc}
                            </p>

                            <div className="flex items-center text-sm font-semibold text-slate-400 group-hover:text-blue-600 transition-colors">
                                Explorar Datos <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="animate-slide-up">
                    {/* Active Report Header */}
                    {/* Active Report Header */}
                    <div className="flex items-center justify-between mb-8 print:hidden" style={{ marginBottom: '10px' }}>
                        <button
                            onClick={() => setActiveReport(null)}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium px-4 py-2 hover:bg-slate-100 rounded-lg"
                        >
                            ← Volver al Panel
                        </button>
                        <div className="flex gap-3">
                            <button
                                onClick={() => window.print()}
                                style={{
                                    backgroundColor: '#4f46e5', // Indigo
                                    color: '#ffffff',
                                    padding: '10px 20px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                                className="hover:opacity-90 transition-opacity"
                            >
                                <Printer size={18} /> Imprimir
                            </button>
                            <button
                                onClick={handleDownloadCSV}
                                disabled={results.length === 0}
                                style={{
                                    backgroundColor: '#10b981', // Emerald
                                    color: '#ffffff',
                                    padding: '10px 20px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: results.length === 0 ? 'not-allowed' : 'pointer',
                                    opacity: results.length === 0 ? 0.6 : 1,
                                    fontWeight: 'bold',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                                className="hover:opacity-90 transition-opacity"
                            >
                                <Download size={18} /> Exportar
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Filters Sidebar */}
                        <div className={`lg:w-80 flex-shrink-0 print:hidden transition-all duration-300 ${isFilterOpen ? 'opacity-100' : 'hidden lg:block'}`}>
                            <div className="bg-white rounded-2xl shadow-lg border border-slate-100" style={{ padding: '20px', paddingBottom: '80px' }}>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <Filter size={20} className="text-blue-500" />
                                        Configuración
                                    </h3>
                                    {results.length > 0 && (
                                        <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                            {results.length} Resultados
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Período</label>
                                        <div className="grid grid-cols-1 gap-3">
                                            <div>
                                                <span className="text-xs text-slate-500 mb-1 block">Desde</span>
                                                <input
                                                    type="date"
                                                    className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-sm mt-1"
                                                    style={{ paddingLeft: '5px', paddingRight: '5px' }}
                                                    value={filters.startDate}
                                                    onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-500 mb-1 block">Hasta</span>
                                                <input
                                                    type="date"
                                                    className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-sm"
                                                    style={{ paddingLeft: '5px', paddingRight: '5px' }}
                                                    value={filters.endDate}
                                                    onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {activeReport === 'patients' && (
                                        <div className="space-y-4 pt-4 border-t border-slate-100">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Demografía</label>
                                                <select
                                                    className="w-full h-11 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm appearance-none mt-2"
                                                    style={{ paddingLeft: '10px', paddingRight: '10px' }}
                                                    value={filters.gender}
                                                    onChange={e => setFilters({ ...filters, gender: e.target.value })}
                                                >
                                                    <option value="">Todos los Géneros</option>
                                                    <option value="Masculino">Masculino</option>
                                                    <option value="Feminino">Femenino</option>
                                                </select>
                                                <select
                                                    className="w-full h-11 px-3 mt-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm appearance-none"
                                                    style={{ paddingLeft: '10px', paddingRight: '10px', marginTop: '20px' }}
                                                    value={filters.department}
                                                    onChange={e => setFilters({ ...filters, department: e.target.value })}
                                                >
                                                    <option value="">Todos los Departamentos</option>
                                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {(activeReport === 'appointments' || activeReport === 'exams') && (
                                        <div className="space-y-4 pt-4 border-t border-slate-100">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</label>
                                                <select
                                                    className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm appearance-none"
                                                    style={{ paddingLeft: '10px', paddingRight: '10px' }}
                                                    value={filters.status}
                                                    onChange={e => setFilters({ ...filters, status: e.target.value })}
                                                >
                                                    <option value="">Todos los Estados</option>
                                                    {activeReport === 'appointments' ? (
                                                        <>
                                                            <option value="Programado">Programado</option>
                                                            <option value="Confirmado">Confirmado</option>
                                                            <option value="Realizado">Realizado</option>
                                                            <option value="Cancelado">Cancelado</option>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <option value="Solicitado">Solicitado</option>
                                                            <option value="Resultados Listos">Resultados Listos</option>
                                                        </>
                                                    )}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleGenerate}
                                        disabled={loading}
                                        className="w-full shadow-md hover:shadow-lg transition-all font-bold group"
                                        style={{
                                            backgroundColor: '#2563eb',
                                            color: '#ffffff',
                                            padding: '15px',
                                            borderRadius: '12px',
                                            marginTop: '30px',
                                            border: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px',
                                            width: '100%',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <FileText size={20} />
                                                Generar Informe
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1">

                            {/* PRINT ONLY HEADER - Visible only when printing */}
                            <div className="hidden print:block mb-8 border-b-2 border-slate-800 pb-4">
                                <div className="flex justify-between items-end mb-4">
                                    <div className="flex items-center gap-4">
                                        {settings?.logoUrl && (
                                            <img
                                                src={`${API_HOST}/${settings.logoUrl}`}
                                                alt="Logo"
                                                className="h-16 w-auto object-contain"
                                            />
                                        )}
                                        <div>
                                            <h1 className="text-2xl font-bold text-slate-900">
                                                {settings?.nombreComercial || 'NEUROCENTER BOLIVAR'}
                                            </h1>
                                            <p className="text-sm text-slate-600">
                                                {settings?.direccion || 'Sistema de Gestión Médica'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500">Fecha de Impresión:</p>
                                        <p className="font-mono text-sm font-bold">{new Date().toLocaleString()}</p>
                                        {settings?.ruc && <p className="text-xs text-slate-500 mt-1">RUC: {settings.ruc}</p>}
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wide">
                                        REPORTE DE {reportTypes.find(r => r.id === activeReport).title.toUpperCase()}
                                    </h2>
                                    <p className="text-sm text-slate-600 mt-1">
                                        Período: <span className="font-semibold">{filters.startDate}</span> al <span className="font-semibold">{filters.endDate}</span>
                                    </p>
                                </div>
                            </div>

                            {/* SCREEN ONLY HEADER - Hidden when printing */}
                            <div className="print:hidden report-header-card bg-white rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row items-start md:items-center gap-4" style={{ padding: '20px', marginBottom: '15px' }}>
                                <div className={`report-header-icon p-3 rounded-xl ${reportTypes.find(r => r.id === activeReport).bg} ${reportTypes.find(r => r.id === activeReport).text}`}>
                                    {reportTypes.find(r => r.id === activeReport).icon}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">{reportTypes.find(r => r.id === activeReport).title}</h2>
                                    <p className="text-slate-500 text-sm">Visualizando datos filtrados</p>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg flex items-center gap-3 text-red-700 animate-shake">
                                    <Filter size={20} />
                                    <span className="font-medium">{error}</span>
                                </div>
                            )}

                            {/* Data Table */}
                            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden min-h-[400px] overflow-x-auto print:shadow-none print:border-0 print:min-h-0">
                                {results.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-slate-600 print:text-black">
                                            <thead className="bg-slate-50 border-b border-slate-200 print:bg-white print:border-b-2 print:border-black">
                                                <tr>
                                                    {activeReport === 'patients' && ['Paciente', 'HC', 'Documento', 'F. Registro', 'Teléfono', 'Ubicación'].map((h, i) => (
                                                        <th key={h} style={{ paddingLeft: i === 0 ? '20px' : '' }} className="px-4 py-4 font-bold text-slate-700 text-left uppercase text-xs tracking-wider whitespace-nowrap">{h}</th>
                                                    ))}
                                                    {activeReport === 'appointments' && ['Paciente', 'Fecha', 'Hora', 'Tipo', 'Estado'].map((h, i) => (
                                                        <th key={h} style={{ paddingLeft: i === 0 ? '20px' : '' }} className="px-4 py-4 font-bold text-slate-700 text-left uppercase text-xs tracking-wider whitespace-nowrap">{h}</th>
                                                    ))}
                                                    {activeReport === 'exams' && ['Paciente', 'Examen', 'Fecha', 'Doctor', 'Estado'].map((h, i) => (
                                                        <th key={h} style={{ paddingLeft: i === 0 ? '20px' : '' }} className="px-4 py-4 font-bold text-slate-700 text-left uppercase text-xs tracking-wider whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {results.map((row, index) => (
                                                    <tr key={index} className="hover:bg-blue-50/50 transition-colors">
                                                        {activeReport === 'patients' && (
                                                            <>
                                                                <td style={{ paddingLeft: '20px' }} className="px-4 py-4 font-semibold text-slate-800 whitespace-nowrap">{row.fullName}</td>
                                                                <td className="px-4 py-4 whitespace-nowrap"><span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{row.clinicalHistoryNumber}</span></td>
                                                                <td className="px-4 py-4 whitespace-nowrap">{row.dni}</td>
                                                                <td className="px-4 py-4 whitespace-nowrap">{row.registrationDate}</td>
                                                                <td className="px-4 py-4 text-xs whitespace-nowrap">{row.phone}</td>
                                                                <td className="px-4 py-4 text-xs whitespace-nowrap">{row.department}/{row.province}</td>
                                                            </>
                                                        )}
                                                        {activeReport === 'appointments' && (
                                                            <>
                                                                <td style={{ paddingLeft: '20px' }} className="px-6 py-4 font-semibold text-slate-800">{row.patientName}</td>
                                                                <td className="px-6 py-4">{row.date}</td>
                                                                <td className="px-6 py-4 font-mono text-xs">{row.time}</td>
                                                                <td className="px-6 py-4"><span className="text-xs font-medium px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md">{row.type}</span></td>
                                                                <td className="px-6 py-4">
                                                                    <StatusBadge status={row.status} />
                                                                </td>
                                                            </>
                                                        )}
                                                        {activeReport === 'exams' && (
                                                            <>
                                                                <td style={{ paddingLeft: '20px' }} className="px-6 py-4 font-semibold text-slate-800">{row.patientName || <span className="text-slate-400 italic">Desconocido</span>}</td>
                                                                <td className="px-6 py-4 text-indigo-600 font-medium">{row.type}</td>
                                                                <td className="px-6 py-4">{row.date}</td>
                                                                <td className="px-6 py-4 text-xs">{row.doctorName || '-'}</td>
                                                                <td className="px-6 py-4">
                                                                    <StatusBadge status={row.status} />
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[400px] text-center p-8 bg-slate-50/50">
                                        <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                                            <Search size={48} className="text-slate-300" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-700 mb-2">Esperando Consulta</h3>
                                        <p className="text-slate-500 max-w-sm">
                                            Utilice el panel de configuración a la izquierda para seleccionar fechas y filtros, luego presione "Generar Informe".
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

const StatusBadge = ({ status }) => {
    let classes = 'bg-slate-100 text-slate-600';
    if (status === 'Atendida' || status === 'Resultados Listos' || status === 'Confirmada') classes = 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    if (status === 'Cancelada') classes = 'bg-rose-100 text-rose-700 border border-rose-200';
    if (status === 'Pendiente' || status === 'Solicitado') classes = 'bg-amber-100 text-amber-700 border border-amber-200';

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${classes}`}>
            {status}
        </span>
    );
};

export default Relatorios;
