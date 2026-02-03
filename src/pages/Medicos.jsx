import React, { useState, useEffect } from 'react';
import { User, Plus, Search, Edit, Trash2, Phone, Mail, Stethoscope, Upload, X, CheckCircle, XCircle } from 'lucide-react';
import { dataService } from '../services/data';
import { showAlert } from '../utils/alerts';
import Modal from '../components/Modal';

const Medicos = () => {
    const [doctors, setDoctors] = useState([]);
    const [filteredDoctors, setFilteredDoctors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDoctor, setEditingDoctor] = useState(null);
    const [formData, setFormData] = useState({
        fullName: '',
        specialty: '',
        cmp: '',
        phone: '',
        email: '',
        bio: '',
        status: 'active'
    });
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDoctors();
    }, []);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredDoctors(doctors);
        } else {
            const filtered = doctors.filter(doc =>
                doc.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (doc.specialty && doc.specialty.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (doc.cmp && doc.cmp.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            setFilteredDoctors(filtered);
        }
    }, [searchTerm, doctors]);

    const loadDoctors = async () => {
        try {
            const data = await dataService.getDoctors();
            setDoctors(data);
            setFilteredDoctors(data);
        } catch (error) {
            showAlert('Error al cargar médicos', 'error');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const openModal = (doctor = null) => {
        if (doctor) {
            setEditingDoctor(doctor);
            setFormData({
                fullName: doctor.fullName || '',
                specialty: doctor.specialty || '',
                cmp: doctor.cmp || '',
                phone: doctor.phone || '',
                email: doctor.email || '',
                bio: doctor.bio || '',
                status: doctor.status || 'active'
            });
            if (doctor.photoUrl) {
                setPhotoPreview(`http://127.0.0.1:3001/${doctor.photoUrl}`);
            }
        } else {
            setEditingDoctor(null);
            setFormData({
                fullName: '',
                specialty: '',
                cmp: '',
                phone: '',
                email: '',
                bio: '',
                status: 'active'
            });
            setPhotoPreview(null);
        }
        setPhotoFile(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingDoctor(null);
        setPhotoFile(null);
        setPhotoPreview(null);
    };

    const handleSave = async () => {
        if (!formData.fullName.trim()) {
            showAlert('El nombre es obligatorio', 'error');
            return;
        }

        try {
            const data = new FormData();
            data.append('fullName', formData.fullName);
            data.append('specialty', formData.specialty);
            data.append('cmp', formData.cmp);
            data.append('phone', formData.phone);
            data.append('email', formData.email);
            data.append('bio', formData.bio);
            data.append('status', formData.status);

            if (photoFile) {
                data.append('photo', photoFile);
            }

            if (editingDoctor) {
                await dataService.updateDoctor(editingDoctor.id, data);
                showAlert('Médico actualizado correctamente', 'success');
            } else {
                await dataService.saveDoctor(data);
                showAlert('Médico registrado correctamente', 'success');
            }

            closeModal();
            loadDoctors();
        } catch (error) {
            showAlert('Error al guardar médico', 'error');
            console.error(error);
        }
    };

    const handleDelete = async (doctor) => {
        if (!confirm(`¿Está seguro de eliminar al Dr. ${doctor.fullName}?`)) return;

        try {
            await dataService.deleteDoctor(doctor.id);
            showAlert('Médico eliminado correctamente', 'success');
            loadDoctors();
        } catch (error) {
            showAlert('Error al eliminar médico', 'error');
            console.error(error);
        }
    };

    if (loading) {
        return <div style={{ padding: '2rem' }}>Cargando...</div>;
    }

    return (
        <div className="page-container">
            {/* Page Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '2rem',
                gap: '2rem'
            }}>
                <div style={{ flex: 1 }}>
                    <h1 style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '2rem',
                        fontWeight: '700',
                        color: 'var(--text-main)',
                        marginBottom: '0.5rem'
                    }}>
                        <Stethoscope size={32} /> Cuerpo Médico
                    </h1>
                    <p style={{
                        color: 'var(--text-muted)',
                        fontSize: '1rem',
                        margin: 0
                    }}>
                        Gestione el personal médico de la clínica
                    </p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="btn-primary"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexShrink: 0,
                        marginTop: '0.25rem'
                    }}
                >
                    <Plus size={18} /> Agregar Médico
                </button>
            </div>

            {/* Search Bar */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, especialidad o CMP..."
                        className="input-field"
                        style={{ paddingLeft: '3rem' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Doctors Grid */}
            {filteredDoctors.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <Stethoscope size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <p>{searchTerm ? 'No se encontraron médicos' : 'No hay médicos registrados'}</p>
                    {!searchTerm && (
                        <button onClick={() => openModal()} className="btn-primary" style={{ marginTop: '1rem' }}>
                            Agregar Primer Médico
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {filteredDoctors.map(doctor => (
                        <div key={doctor.id} className="card" style={{ position: 'relative' }}>
                            {/* Status Badge */}
                            <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                                {doctor.status === 'active' ? (
                                    <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', background: '#dcfce7', color: '#166534', fontWeight: '600' }}>
                                        <CheckCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                        Activo
                                    </span>
                                ) : (
                                    <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', background: '#fee2e2', color: '#991b1b', fontWeight: '600' }}>
                                        <XCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                        Inactivo
                                    </span>
                                )}
                            </div>

                            {/* Photo */}
                            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                {doctor.photoUrl ? (
                                    <img
                                        src={`http://127.0.0.1:3001/${doctor.photoUrl}`}
                                        alt={doctor.fullName}
                                        style={{
                                            width: '100px',
                                            height: '100px',
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            border: '3px solid var(--primary)',
                                            margin: '0 auto'
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '100px',
                                        height: '100px',
                                        borderRadius: '50%',
                                        background: 'var(--primary)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto',
                                        fontSize: '2rem',
                                        fontWeight: 'bold'
                                    }}>
                                        {doctor.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <h3 style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '1.2rem' }}>
                                Dr. {doctor.fullName}
                            </h3>

                            {doctor.specialty && (
                                <p style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: '600', marginBottom: '0.5rem' }}>
                                    {doctor.specialty}
                                </p>
                            )}

                            {doctor.cmp && (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                    CMP: {doctor.cmp}
                                </p>
                            )}

                            {/* Contact */}
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '1rem' }}>
                                {doctor.phone && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                        <Phone size={14} color="var(--text-muted)" />
                                        <span>{doctor.phone}</span>
                                    </div>
                                )}
                                {doctor.email && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                        <Mail size={14} color="var(--text-muted)" />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doctor.email}</span>
                                    </div>
                                )}
                            </div>

                            {/* Bio */}
                            {doctor.bio && (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', fontStyle: 'italic' }}>
                                    {doctor.bio.length > 100 ? `${doctor.bio.substring(0, 100)}...` : doctor.bio}
                                </p>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => openModal(doctor)} className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <Edit size={16} /> Editar
                                </button>
                                <button onClick={() => handleDelete(doctor)} className="btn-white" style={{ padding: '0.75rem', color: 'var(--danger)' }}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingDoctor ? 'Editar Médico' : 'Nuevo Médico'}>
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {/* Photo Upload */}
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        {photoPreview ? (
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <img
                                    src={photoPreview}
                                    alt="Preview"
                                    style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)' }}
                                />
                                <button
                                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                                    style={{
                                        position: 'absolute', top: 0, right: 0,
                                        background: 'var(--danger)', color: 'white',
                                        border: 'none', borderRadius: '50%',
                                        width: '28px', height: '28px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'inline-block' }}>
                                <label htmlFor="doctor-photo" style={{
                                    width: '120px', height: '120px', borderRadius: '50%',
                                    border: '2px dashed var(--border)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', background: '#f9fafb'
                                }}>
                                    <Upload size={32} color="var(--text-muted)" />
                                </label>
                                <input
                                    id="doctor-photo"
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    style={{ display: 'none' }}
                                />
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Foto Profesional</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="form-label">Nombre Completo *</label>
                        <input
                            className="input-field"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            placeholder="Dr. Juan Pérez García"
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="form-label">Especialidad</label>
                            <input
                                className="input-field"
                                value={formData.specialty}
                                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                placeholder="Neurología"
                            />
                        </div>
                        <div>
                            <label className="form-label">CMP (Colegio Médico del Perú)</label>
                            <input
                                className="input-field"
                                value={formData.cmp}
                                onChange={(e) => setFormData({ ...formData, cmp: e.target.value })}
                                placeholder="123456"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="form-label">Teléfono</label>
                            <input
                                className="input-field"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="999 999 999"
                            />
                        </div>
                        <div>
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="input-field"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="doctor@clinica.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Biografía/Descripción</label>
                        <textarea
                            className="input-field"
                            rows="3"
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            placeholder="Breve descripción profesional..."
                        />
                    </div>

                    <div>
                        <label className="form-label">Estado</label>
                        <select
                            className="input-field"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="active">Activo</option>
                            <option value="inactive">Inactivo</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button onClick={closeModal} className="btn-secondary" style={{ flex: 1 }}>
                            Cancelar
                        </button>
                        <button onClick={handleSave} className="btn-primary" style={{ flex: 1 }}>
                            {editingDoctor ? 'Actualizar' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Medicos;
