import React, { useState, useEffect } from 'react';
import { Building2, Save, Upload, Image as ImageIcon, Database } from 'lucide-react';
import { dataService } from '../services/data';
import { showAlert } from '../utils/alerts';
import { useAuth } from '../context/AuthContext';

import Modal from '../components/Modal';

const Configuracion = () => {
    const { isAdmin, hasPermission } = useAuth();
    const [settings, setSettings] = useState({
        ruc: '',
        razonSocial: '',
        nombreComercial: '',
        celular: '',
        telefono: '',
        correo: '',
        direccion: '',
        logoUrl: ''
    });
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await dataService.getSettings();
            setSettings(data);
            if (data.logoUrl) {
                // Use relative path for VPS/HTTPS compatibility
                setLogoPreview(data.logoUrl.startsWith('http') ? data.logoUrl : `/${data.logoUrl}`);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!isAdmin) {
            showAlert('Solo administradores pueden modificar la configuración', 'error');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('ruc', settings.ruc || '');
            formData.append('razonSocial', settings.razonSocial || '');
            formData.append('nombreComercial', settings.nombreComercial || '');
            formData.append('celular', settings.celular || '');
            formData.append('telefono', settings.telefono || '');
            formData.append('correo', settings.correo || '');
            formData.append('direccion', settings.direccion || '');

            if (logoFile) {
                formData.append('logo', logoFile);
            }

            const updated = await dataService.saveSettings(formData);
            setSettings(updated);
            if (updated.logoUrl) {
                setLogoPreview(updated.logoUrl.startsWith('http') ? updated.logoUrl : `/${updated.logoUrl}`);
            }
            showAlert('Configuración guardada correctamente', 'success');
        } catch (error) {
            showAlert(error.message || 'Error al guardar configuración', 'error');
            console.error(error);
        }
    };

    const handleBackupClick = () => {
        setIsBackupModalOpen(true);
    };

    const confirmBackup = async () => {
        try {
            const result = await dataService.backup();
            showAlert(`Backup generado: ${result.filename}`, 'success');
            setIsBackupModalOpen(false);
        } catch (error) {
            console.error(error);
            showAlert('Error al generar backup', 'error');
        }
    };

    if (loading) {
        return <div style={{ padding: '2rem' }}>Cargando...</div>;
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building2 size={28} /> Configuración de la Empresa
                    </h1>
                    <p className="page-subtitle">Gestione la información de su clínica o consultorio</p>
                </div>
            </div>

            <div className="card" style={{ maxWidth: '900px', marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    {/* Left Column - Form */}
                    <div>
                        <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-dark)' }}>Información General</h3>

                        <div style={{ marginBottom: '1rem' }}>
                            <label className="form-label">RUC</label>
                            <input
                                className="input-field"
                                value={settings.ruc || ''}
                                onChange={(e) => setSettings({ ...settings, ruc: e.target.value })}
                                placeholder="Ej: 20123456789"
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label className="form-label">Razón Social</label>
                            <input
                                className="input-field"
                                value={settings.razonSocial || ''}
                                onChange={(e) => setSettings({ ...settings, razonSocial: e.target.value })}
                                placeholder="Nombre legal de la empresa"
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label className="form-label">Nombre Comercial</label>
                            <input
                                className="input-field"
                                value={settings.nombreComercial || ''}
                                onChange={(e) => setSettings({ ...settings, nombreComercial: e.target.value })}
                                placeholder="Nombre de fantasía"
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label className="form-label">Celular</label>
                                <input
                                    className="input-field"
                                    value={settings.celular || ''}
                                    onChange={(e) => setSettings({ ...settings, celular: e.target.value })}
                                    placeholder="999 999 999"
                                />
                            </div>
                            <div>
                                <label className="form-label">Teléfono</label>
                                <input
                                    className="input-field"
                                    value={settings.telefono || ''}
                                    onChange={(e) => setSettings({ ...settings, telefono: e.target.value })}
                                    placeholder="01 234 5678"
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label className="form-label">Correo Electrónico</label>
                            <input
                                type="email"
                                className="input-field"
                                value={settings.correo || ''}
                                onChange={(e) => setSettings({ ...settings, correo: e.target.value })}
                                placeholder="contacto@empresa.com"
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label">Dirección</label>
                            <textarea
                                className="input-field"
                                rows="3"
                                value={settings.direccion || ''}
                                onChange={(e) => setSettings({ ...settings, direccion: e.target.value })}
                                placeholder="Dirección completa del consultorio"
                            />
                        </div>

                        <button onClick={handleSave} className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <Save size={18} /> Guardar Configuración
                        </button>
                    </div>

                    {/* Right Column - Logo */}
                    <div>
                        <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-dark)' }}>Logotipo</h3>

                        <div style={{
                            border: '2px dashed var(--border)',
                            borderRadius: 'var(--radius-md)',
                            padding: '2rem',
                            textAlign: 'center',
                            background: '#f9fafb',
                            minHeight: '300px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {logoPreview ? (
                                <div style={{ marginBottom: '1rem' }}>
                                    <img
                                        src={logoPreview}
                                        alt="Logo Preview"
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '200px',
                                            objectFit: 'contain',
                                            borderRadius: 'var(--radius-sm)'
                                        }}
                                    />
                                </div>
                            ) : (
                                <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                                    <ImageIcon size={48} style={{ opacity: 0.3 }} />
                                    <p style={{ marginTop: '1rem' }}>Sin logo</p>
                                </div>
                            )}

                            <label
                                htmlFor="logo-upload"
                                className="btn-secondary"
                                style={{
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <Upload size={18} /> Seleccionar Imagen
                            </label>
                            <input
                                id="logo-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleLogoChange}
                                style={{ display: 'none' }}
                            />
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                                Formatos: PNG, JPG, SVG (Max 2MB)
                            </p>
                        </div>

                        <div style={{
                            marginTop: '1.5rem',
                            padding: '1rem',
                            background: '#eff6ff',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid #bfdbfe'
                        }}>
                            <p style={{ fontSize: '0.85rem', color: '#1e40af', margin: 0 }}>
                                💡 <strong>Tip:</strong> El logo aparecerá en recetas médicas y reportes.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {(isAdmin || hasPermission('manage_backup')) && (
                <div className="card" style={{ maxWidth: '900px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Database size={20} /> Datos y Seguridad
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Realice copias de seguridad de la base de datos para prevenir pérdidas de información.</p>
                        </div>
                        <button onClick={handleBackupClick} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', borderColor: '#cbd5e1' }}>
                            <Database size={16} />
                            Realizar Backup
                        </button>
                    </div>
                </div>
            )}

            <Modal
                isOpen={isBackupModalOpen}
                onClose={() => setIsBackupModalOpen(false)}
                title="Respaldo de Sistema"
            >
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <div style={{
                        margin: '0 auto 1.5rem',
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: '#e0f2fe',
                        color: '#0284c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Database size={40} />
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1f2937' }}>
                        ¿Generar copia de seguridad?
                    </h3>

                    <p style={{ color: '#4b5563', marginBottom: '2rem', lineHeight: '1.6' }}>
                        Esta acción creará un archivo de respaldo completo de la base de datos actual.<br />
                        Podrá encontrarlo en la carpeta de backups del servidor.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <button
                            onClick={() => setIsBackupModalOpen(false)}
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
                            onClick={confirmBackup}
                            style={{
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                background: '#0284c7',
                                color: 'white',
                                fontWeight: '500',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.3)',
                                transition: 'all 0.2s'
                            }}
                        >
                            Confirmar Backup
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Configuracion;
