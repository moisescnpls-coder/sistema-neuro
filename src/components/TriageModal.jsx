import React, { useState } from 'react';
import { Save, Activity, Heart, Thermometer, Wind } from 'lucide-react';
import Modal from './Modal';

const TriageModal = ({ isOpen, onClose, onSave, patientName, initialData }) => {
    const [formData, setFormData] = useState({
        weight: '',
        height: '',
        temperature: '',
        systolic: '',
        diastolic: '',
        heartRate: '',
        oxygenSaturation: '',
        notes: ''
    });

    React.useEffect(() => {
        if (initialData) {
            setFormData({
                weight: initialData.weight || '',
                height: initialData.height || '',
                temperature: initialData.temperature || '',
                systolic: initialData.systolic || '',
                diastolic: initialData.diastolic || '',
                heartRate: initialData.heartRate || '',
                oxygenSaturation: initialData.oxygenSaturation || '',
                notes: initialData.notes || ''
            });
        } else {
            setFormData({
                weight: '',
                height: '',
                temperature: '',
                systolic: '',
                diastolic: '',
                heartRate: '',
                oxygenSaturation: '',
                notes: ''
            });
        }
    }, [initialData, isOpen]);

    // Calculate BMI automatically
    const bmi = (formData.weight && formData.height)
        ? (formData.weight / ((formData.height / 100) ** 2)).toFixed(2)
        : '';

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Activity size={24} color="#3b82f6" />
                    Triaje: {patientName}
                </div>
            }
            footer={
                <>
                    <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
                    <button type="button" className="btn-primary" onClick={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Save size={18} />
                        Guardar Triaje
                    </button>
                </>
            }
        >
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Peso y Talla */}
                    <div>
                        <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Peso (kg)</label>
                        <input
                            type="number"
                            step="0.1"
                            name="weight"
                            className="input-field"
                            value={formData.weight}
                            onChange={handleChange}
                            placeholder="Ej: 70.5"
                        />
                    </div>
                    <div>
                        <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Talla (cm)</label>
                        <input
                            type="number"
                            name="height"
                            className="input-field"
                            value={formData.height}
                            onChange={handleChange}
                            placeholder="Ej: 175"
                        />
                    </div>
                </div>

                {/* IMC Display */}
                {bmi && (
                    <div style={{
                        background: '#f8fafc',
                        padding: '0.8rem',
                        borderRadius: '8px',
                        textAlign: 'center',
                        border: '1px solid #e2e8f0',
                        color: '#475569',
                        fontWeight: '500'
                    }}>
                        IMC Calculado: <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{bmi}</span>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Presión Arterial */}
                    <div>
                        <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Presión Sistólica</label>
                        <input
                            type="number"
                            name="systolic"
                            className="input-field"
                            value={formData.systolic}
                            onChange={handleChange}
                            placeholder="Ej: 120"
                        />
                    </div>
                    <div>
                        <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Presión Diastólica</label>
                        <input
                            type="number"
                            name="diastolic"
                            className="input-field"
                            value={formData.diastolic}
                            onChange={handleChange}
                            placeholder="Ej: 80"
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    {/* Signos Vitales */}
                    <div>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            <Heart size={14} color="#ef4444" /> F. Cardíaca
                        </label>
                        <input
                            type="number"
                            name="heartRate"
                            className="input-field"
                            value={formData.heartRate}
                            onChange={handleChange}
                            placeholder="LPM"
                        />
                    </div>
                    <div>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            <Thermometer size={14} color="#f59e0b" /> Temp. (°C)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            name="temperature"
                            className="input-field"
                            value={formData.temperature}
                            onChange={handleChange}
                            placeholder="°C"
                        />
                    </div>
                    <div>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            <Wind size={14} color="#0ea5e9" /> Sat. O₂ (%)
                        </label>
                        <input
                            type="number"
                            name="oxygenSaturation"
                            className="input-field"
                            value={formData.oxygenSaturation}
                            onChange={handleChange}
                            placeholder="%"
                        />
                    </div>
                </div>

                <div>
                    <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Notas Adicionales</label>
                    <textarea
                        name="notes"
                        className="input-field"
                        rows="3"
                        value={formData.notes}
                        onChange={handleChange}
                        placeholder="Observaciones..."
                        style={{ resize: 'vertical' }}
                    />
                </div>
            </form>
        </Modal>
    );
};

export default TriageModal;
