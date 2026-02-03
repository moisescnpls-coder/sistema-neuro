import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, Save, X, Eye, EyeOff } from 'lucide-react';
import { dataService } from '../services/data';
import { showAlert } from '../utils/alerts';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const Usuarios = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState({ username: '', password: '', name: '', role: 'recepcion' });
    const [isEditing, setIsEditing] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const loadUsers = async () => {
        try {
            const data = await dataService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error(error);
            showAlert('Error al cargar usuarios', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                // For updates, password is optional. If empty, backend ignores it.
                await dataService.updateUser(currentUser);
                showAlert('Usuario actualizado', 'success');
            } else {
                if (!currentUser.password) {
                    return showAlert('La contraseña es obligatoria', 'error');
                }
                await dataService.saveUser(currentUser);
                showAlert('Usuario creado', 'success');
            }
            setIsModalOpen(false);
            loadUsers();
            resetForm();
        } catch (error) {
            showAlert(error.message, 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este usuario?')) return;
        try {
            await dataService.deleteUser(id);
            showAlert('Usuario eliminado', 'success');
            loadUsers();
        } catch (error) {
            showAlert(error.message, 'error');
        }
    };

    const openEdit = (user) => {
        setCurrentUser({ ...user, password: '' }); // Don't show hash
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setCurrentUser({ username: '', password: '', name: '', role: 'recepcion' });
        setIsEditing(false);
    };

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="section-title" style={{ margin: 0 }}>
                    <Shield size={28} className="text-blue-500" />
                    Gestión de Usuarios
                </h2>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Plus size={20} />
                    Nuevo Usuario
                </button>
            </div>

            <div className="card">
                {loading ? <p className="p-4 text-center">Cargando...</p> : (
                    <div className="overflow-x-auto">
                        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                            <thead className="bg-gray-50/50" style={{ borderBottom: '2px solid #e5e7eb' }}>
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Rol</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-gray-50" style={{ borderBottom: '1px solid #eee' }}>
                                        <td className="px-6 py-4 font-medium">{u.username}</td>
                                        <td className="px-6 py-4">{u.name}</td>
                                        <td className="px-6 py-4">
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '0.8rem',
                                                background: u.role === 'admin' ? '#dbeafe' : '#f3f4f6',
                                                color: u.role === 'admin' ? '#1e40af' : '#374151',
                                                fontWeight: 600
                                            }}>
                                                {u.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => openEdit(u)} className="btn-icon" style={{ display: 'inline-flex', marginRight: '8px', color: '#3b82f6' }}>
                                                <Edit size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(u.id)} className="btn-icon" style={{ display: 'inline-flex', color: '#ef4444' }}>
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditing ? "Editar Usuario" : "Nuevo Usuario"}
            >
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                            Nombre Completo
                        </label>
                        <input
                            required
                            className="input-field"
                            value={currentUser.name}
                            onChange={e => setCurrentUser({ ...currentUser, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                            Usuario
                        </label>
                        <input
                            required
                            className="input-field"
                            value={currentUser.username}
                            onChange={e => setCurrentUser({ ...currentUser, username: e.target.value })}
                            disabled={isEditing}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                            {isEditing ? "Contraseña (dejar en blanco para mantener)" : "Contraseña"}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                className="input-field"
                                value={currentUser.password}
                                onChange={e => setCurrentUser({ ...currentUser, password: e.target.value })}
                                style={{ paddingRight: '2.5rem' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '0.5rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: '#6b7280',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                            Rol
                        </label>
                        <select
                            className="input-field"
                            value={currentUser.role}
                            onChange={e => setCurrentUser({ ...currentUser, role: e.target.value })}
                            disabled={currentUser.username === 'admin'}
                        >
                            {((user && user.role === 'admin') || (currentUser.username === 'admin')) && (
                                <option value="admin">Administrador</option>
                            )}
                            <option value="medico">Médico</option>
                            <option value="recepcion">Recepción</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        className="btn-primary"
                        style={{
                            width: '100%',
                            marginTop: '1rem',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Save size={18} />
                        <span>Guardar</span>
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Usuarios;
