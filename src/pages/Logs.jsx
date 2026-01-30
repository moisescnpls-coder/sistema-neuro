import React, { useState, useEffect } from 'react';
import { Scroll, Search, Clock, User, Activity, Eye, X } from 'lucide-react';
import { dataService } from '../services/data';
import { useAuth } from '../context/AuthContext';

const Logs = () => {
    const { isAdmin, hasPermission } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLog, setSelectedLog] = useState(null); // For Modal

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });

    useEffect(() => {
        if (isAdmin || hasPermission('view_logs')) {
            loadLogs(currentPage);
        } else {
            setLoading(false);
        }
    }, [isAdmin, hasPermission, currentPage]);

    const loadLogs = async (page = 1) => {
        try {
            setLoading(true);
            const data = await dataService.getLogs(page, 20);
            console.log('Logs API response:', data);
            console.log('Has logs property?', 'logs' in data);
            console.log('Is array?', Array.isArray(data));

            // Check if response has pagination (new format) or is just array (old format)
            if (data && data.logs) {
                console.log('Using new format with pagination');
                setLogs(data.logs);
                setPagination(data.pagination);
            } else if (Array.isArray(data)) {
                // Fallback for old API format
                console.log('Using old format (array)');
                setLogs(data);
            } else {
                console.error('Unexpected data format:', data);
                setLogs([]);
            }
        } catch (error) {
            console.error('Error loading logs:', error);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const term = searchTerm.toLowerCase();
        return (
            (log.username && log.username.toLowerCase().includes(term)) ||
            (log.action && log.action.toLowerCase().includes(term)) ||
            (log.details && log.details.toLowerCase().includes(term))
        );
    });

    if (loading) return <div className="p-8 text-center">Cargando logs...</div>;

    if (!isAdmin && !hasPermission('view_logs')) {
        return <div className="p-8 text-center text-red-500">No tiene permiso para ver los registros de auditoría.</div>;
    }

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="section-title" style={{ margin: 0 }}>
                    <Scroll size={24} /> Logs de Auditoría
                </h2>
            </div>

            <div className="card">
                {/* Search */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: '500px' }}>
                        <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input
                            type="text"
                            placeholder="Buscar por usuario, acción o detalles..."
                            className="input-field"
                            style={{ paddingLeft: '40px', width: '100%' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {filteredLogs.length} registros encontrados
                    </div>
                </div>

                <div className="min-h-table overflow-x-auto rounded-lg shadow-sm">
                    <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                        <thead className="bg-gray-50/50" style={{ borderBottom: '2px solid #e5e7eb' }}>
                            <tr>
                                <th style={{ padding: '5px 5px' }} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha / Hora</th>
                                <th style={{ padding: '5px 5px' }} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                                <th style={{ padding: '5px 5px' }} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Acción</th>
                                <th style={{ padding: '5px 5px' }} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Detalles</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {filteredLogs.map(log => (
                                <tr key={log.id} className="hover:bg-blue-50/30 transition-colors duration-200" style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Clock size={14} className="text-gray-400" />
                                            {new Date(log.timestamp).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <User size={14} className="text-gray-400" />
                                            {log.username}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${log.action === 'LOGIN' ? 'bg-green-100 text-green-800' :
                                            log.action.includes('DELETE') ? 'bg-red-100 text-red-800' :
                                                log.action === 'BACKUP' ? 'bg-purple-100 text-purple-800' :
                                                    'bg-blue-100 text-blue-800'
                                            }`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                maxWidth: '400px',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }} title={log.details}>
                                                {log.details ? log.details.replace(/[{}"]/g, '') : ''}
                                            </div>
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="btn-icon"
                                                title="Ver detalles completos"
                                                style={{ padding: '4px' }}
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredLogs.length === 0 && (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No se encontraron registros.
                        </div>
                    )}
                </div>
            </div>

            {/* Event Details Modal - Redesigned */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
                        {/* Header - Subtle Design */}
                        <div style={{ padding: '10px' }} className="border-b border-gray-200 flex justify-between items-start flex-shrink-0 bg-gray-50 rounded-t-xl">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                        <Activity size={18} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800">Detalles del Evento</h3>
                                </div>
                                <div className="flex items-center gap-3 text-gray-500 text-sm" style={{ paddingLeft: '8px' }}>
                                    <div className="flex items-center gap-1">
                                        <Clock size={14} />
                                        {new Date(selectedLog.timestamp).toLocaleString()}
                                    </div>
                                    <span>•</span>
                                    <div className="flex items-center gap-1">
                                        <User size={14} />
                                        {selectedLog.username}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-2 rounded-lg transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(90vh - 180px)', padding: '10px' }}>
                            {/* Action Badge */}
                            <div className="mb-6">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Tipo de Acción</label>
                                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${selectedLog.action === 'LOGIN' ? 'bg-green-100 text-green-700 border border-green-200' :
                                    selectedLog.action.includes('DELETE') ? 'bg-red-100 text-red-700 border border-red-200' :
                                        selectedLog.action === 'BACKUP' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                            'bg-blue-100 text-blue-700 border border-blue-200'
                                    }`}>
                                    <Activity size={16} />
                                    {selectedLog.action}
                                </span>
                            </div>

                            {/* Content Card */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Información Detallada</label>
                                <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
                                    <pre className="text-sm font-mono text-gray-800 leading-relaxed" style={{
                                        overflowWrap: 'break-word',
                                        wordBreak: 'break-word',
                                        whiteSpace: 'pre-wrap',
                                        margin: '3px'
                                    }}>
                                        {(() => {
                                            try {
                                                // Attempt pretty print if JSON
                                                if (selectedLog.details && (selectedLog.details.startsWith('{') || selectedLog.details.startsWith('['))) {
                                                    return JSON.stringify(JSON.parse(selectedLog.details), null, 2);
                                                }
                                                return selectedLog.details || 'Sin información adicional';
                                            } catch (e) {
                                                return selectedLog.details || 'Sin información adicional';
                                            }
                                        })()}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination Controls */}
            {!searchTerm && pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
                    <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="btn-secondary"
                        style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
                    >
                        Anterior
                    </button>

                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Página {pagination.page} de {pagination.totalPages} ({pagination.total} logs)
                    </span>

                    <button
                        onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                        disabled={currentPage === pagination.totalPages}
                        className="btn-secondary"
                        style={{ opacity: currentPage === pagination.totalPages ? 0.5 : 1 }}
                    >
                        Siguiente
                    </button>
                </div>
            )}
        </div>
    );
};

export default Logs;
