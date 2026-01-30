import React, { useState, useEffect } from 'react';
import { Shield, Lock, Save, Check, X } from 'lucide-react';
import { dataService } from '../services/data';
import { showAlert } from '../utils/alerts';
import { useAuth } from '../context/AuthContext';

const Permisos = () => {
    const { user } = useAuth();
    const [permissions, setPermissions] = useState([]);
    const [rolePermissions, setRolePermissions] = useState([]);
    const [loading, setLoading] = useState(true);

    const roles = ['admin', 'medico', 'recepcion'];
    const roleLabels = { 'admin': 'Administrador', 'medico': 'Médico', 'recepcion': 'Recepción' };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await dataService.getPermissions();
            setPermissions(data.permissions);
            setRolePermissions(data.rolePermissions);
        } catch (error) {
            console.error(error);
            showAlert('Error al cargar permisos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const hasPermission = (role, permKey) => {
        return rolePermissions.some(rp => rp.role === role && rp.permission_key === permKey);
    };

    const togglePermission = async (role, permKey) => {
        if (role === 'admin' && permKey === 'manage_permissions') {
            return showAlert('No se puede revocar este permiso al administrador.', 'warning');
        }

        const isAssigned = hasPermission(role, permKey);
        const action = isAssigned ? 'remove' : 'add';

        // Optimistic update
        const updatedRolePerms = isAssigned
            ? rolePermissions.filter(rp => !(rp.role === role && rp.permission_key === permKey))
            : [...rolePermissions, { role, permission_key: permKey }];

        setRolePermissions(updatedRolePerms);

        try {
            await dataService.updatePermission({ role, permission_key: permKey, action });
        } catch (error) {
            showAlert('Error al actualizar permiso', 'error');
            // Revert changes
            setRolePermissions(rolePermissions);
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando permisos...</div>;

    if (user?.role !== 'admin') {
        return (
            <div className="p-8 text-center text-red-500">
                <Lock size={48} className="mx-auto mb-4" />
                <h2>Acceso Denegado</h2>
                <p>No tienes permiso para ver esta página.</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Shield size={28} className="text-blue-500" />
                    Gestión de Permisos y Roles
                </h2>
            </div>

            <div className="card">
                <div className="overflow-x-auto">
                    <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                        <thead className="bg-gray-50/50" style={{ borderBottom: '2px solid #e5e7eb' }}>
                            <tr>
                                <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase">Permiso</th>
                                {roles.map(role => (
                                    <th key={role} className="px-6 py-4 text-center font-semibold text-gray-500 uppercase">
                                        {roleLabels[role]}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {permissions.map(perm => (
                                <tr key={perm.key} className="hover:bg-gray-50" style={{ borderBottom: '1px solid #eee' }}>
                                    <td className="px-6 py-4">
                                        <div style={{ fontWeight: '500', color: '#1f2937' }}>{perm.description}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>{perm.key}</div>
                                    </td>
                                    {roles.map(role => {
                                        const isChecked = hasPermission(role, perm.key);
                                        const isLocked = role === 'admin' && perm.key === 'manage_permissions';

                                        return (
                                            <td key={`${role}-${perm.key}`} className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => !isLocked && togglePermission(role, perm.key)}
                                                    style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '6px',
                                                        border: isChecked ? 'none' : '2px solid #d1d5db',
                                                        background: isLocked ? '#e5e7eb' : (isChecked ? 'var(--primary)' : 'white'),
                                                        color: 'white',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: isLocked ? 'not-allowed' : 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title={isLocked ? "Este permiso es obligatorio para administradores" : ""}
                                                >
                                                    {isChecked && <Check size={16} />}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ marginTop: '1rem', padding: '1rem', background: '#eff6ff', borderRadius: '8px', color: '#1e40af', fontSize: '0.9rem' }}>
                <strong>Nota:</strong> Los cambios en los permisos se aplican inmediatamente, pero los usuarios conectados pueden necesitar volver a iniciar sesión para ver reflejados los cambios en su menú.
            </div>
        </div>
    );
};

export default Permisos;
