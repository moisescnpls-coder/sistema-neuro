import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Plus, Save, FileText, Activity, File, Clock, Lock, Trash2, Stethoscope } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/data';
import { showAlert } from '../utils/alerts';
import { formatTime } from '../utils/format';
import Modal from '../components/Modal';

const PacienteDetalles = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [history, setHistory] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [newRecord, setNewRecord] = useState({ type: 'Consulta', notes: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});

    // ... inside component render, maybe near the bottom before closing div

    {/* Custom Delete Confirmation Modal */ }
    {
        deleteConfirmId && (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}>
                <div className="card animate-scale-in" style={{ maxWidth: '400px', width: '90%', padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Trash2 /> Eliminar Entrada
                    </h3>
                    <p style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>
                        ¿Está seguro de que desea eliminar esta entrada del historial permanentemente?
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button
                            onClick={() => setDeleteConfirmId(null)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--border)',
                                background: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    await dataService.deleteHistory(deleteConfirmId);
                                    setHistory(prev => prev.filter(h => h.id !== deleteConfirmId));
                                    showAlert('Entrada eliminada', 'success');
                                    setDeleteConfirmId(null);
                                } catch (error) {
                                    showAlert(error.message, 'error');
                                }
                            }}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius)',
                                border: 'none',
                                background: '#ef4444',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    useEffect(() => {
        const load = async () => {
            const allPatients = await dataService.getPatients();
            const found = allPatients.find(p => p.id == id);

            if (found) {
                setPatient(found);
                setEditForm(found);

                // Fetch History, Appointments, Prescriptions, Exams in parallel
                // Use individual try-catch to prevent one failure from blocking all
                const [hist, allAppointments, prescriptions, exams, triageData] = await Promise.all([
                    dataService.getPatientHistory(found.id).catch(err => { console.error('Error loading history:', err); return []; }),
                    dataService.getAppointments().catch(err => { console.error('Error loading appointments:', err); return []; }),
                    dataService.getPrescriptions(found.id).catch(err => { console.error('Error loading prescriptions:', err); return []; }),
                    dataService.getExams(found.id).catch(err => { console.error('Error loading exams:', err); return []; }),
                    dataService.getPatientTriage(found.id).catch(err => { console.error('Error loading triage:', err); return []; })
                ]);

                // Filter for this patient (include everything present in DB, even Cancelled)
                const patientAppointments = allAppointments
                    .filter(a => a.patientId == found.id)
                    .map(a => ({
                        id: `appt-${a.id}`,
                        type: a.status === 'Completado' ? 'Cita Completada' : `Cita ${a.status}`,
                        date: a.date,
                        time: formatTime(a.time), // Add time for display
                        notes: `${a.type}${a.notes ? ' - ' + a.notes : ''}`,
                        icon: Calendar,
                        color: a.status === 'Completado' ? '#10b981' : (a.status === 'Cancelado' ? '#ef4444' : (a.status === 'Confirmado' ? '#f59e0b' : '#3b82f6')),
                        source: 'appointment',
                        rawStatus: a.status,
                        referral: a.referral, // Pass referral to history object
                        createdAt: a.createdAt,
                        createdBy: a.createdBy
                    }));

                const patientRx = prescriptions.map(rx => ({
                    id: `rx-${rx.id}`,
                    type: 'Receta Médica',
                    date: rx.date,
                    time: rx.createdAt ? new Date(rx.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
                    notes: rx.medications.map(m => `${m.name} ${m.dose}`).join(', '),
                    details: rx, // Keep full object for detailed render
                    icon: FileText,
                    color: '#3b82f6',
                    source: 'prescription',
                    createdAt: rx.createdAt,
                    createdBy: rx.createdBy
                }));

                const patientExams = exams.map(ex => ({
                    id: `ex-${ex.id}`,
                    type: `Examen: ${ex.type}`,
                    date: ex.date,
                    time: ex.createdAt ? new Date(ex.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
                    notes: `Estado: ${ex.status}`,
                    details: ex,
                    icon: Activity,
                    color: '#8b5cf6',
                    source: 'exam',
                    createdAt: ex.createdAt,
                    createdBy: ex.createdBy
                }));

                const manualHistory = hist.map(h => ({
                    ...h,
                    source: 'manual',
                    icon: User,
                    color: 'var(--primary)',
                    time: h.createdAt ? new Date(h.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''
                }));

                const patientTriage = triageData.map(t => {
                    const appt = allAppointments.find(a => a.id === t.appointmentId);
                    return {
                        id: `tri-${t.id}`,
                        type: 'Triaje',
                        date: t.date,
                        time: appt ? formatTime(appt.time) : (t.createdAt ? new Date(t.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''),
                        notes: t.notes,
                        details: t,
                        icon: Activity,
                        color: '#8b5cf6',
                        source: 'triage',
                        createdAt: t.createdAt,
                        createdBy: t.createdBy
                    };
                });

                // Merge and Sort by createdAt timestamp (when available) or date
                const combined = [...manualHistory, ...patientAppointments, ...patientRx, ...patientExams, ...patientTriage].sort((a, b) => {
                    // Use createdAt for precise sorting, fallback to date, then to epoch
                    const timeA = a.createdAt ? new Date(a.createdAt) : (a.date ? new Date(a.date + 'T00:00:00') : new Date(0));
                    const timeB = b.createdAt ? new Date(b.createdAt) : (b.date ? new Date(b.date + 'T00:00:00') : new Date(0));
                    return timeB - timeA; // Newest first
                });

                setHistory(combined);
            }
        };
        load();
    }, [id]);

    const handleAddHistory = async (e) => {
        e.preventDefault();
        try {
            if (!patient) return;
            const added = await dataService.addHistoryRecord({ ...newRecord, patientId: patient.id });
            setHistory(prev => [added, ...prev]);
            setIsAdding(false);
            setNewRecord({ type: 'Consulta', notes: '' });
            showAlert('Historial agregado correctamente', 'success');
        } catch (error) {
            showAlert(error.message || 'Error al agregar historial', 'error');
        }
    };

    const handleUpdatePatient = async (e) => {
        e.preventDefault();
        try {
            const updated = await dataService.updatePatient(editForm);
            setPatient(updated);
            setIsEditing(false);
            showAlert('Datos del paciente actualizados', 'success');
        } catch (error) {
            showAlert(error.message || 'Error al actualizar paciente', 'error');
        }
    };

    const { hasPermission, isAdmin } = useAuth();

    // Filter history based on permissions
    const visibleHistory = history.filter(record => {
        if (isAdmin() || hasPermission('view_clinical')) return true;
        // If no clinical permission, only show appointments and intake/updates
        // Hide: manual (Consultas), prescription, exam, maybe triage?
        // Let's hide detailed clinical data
        return !['manual', 'prescription', 'exam', 'triage'].includes(record.source);
    });

    if (!patient) return <div className="animate-fade-in">Cargando...</div>;

    return (
        <div className="animate-fade-in">
            {/* ... header ... */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <button onClick={() => navigate('/pacientes')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <ArrowLeft size={16} /> Volver
                </button>
                <button onClick={() => setIsEditing(!isEditing)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {isEditing ? 'Cancelar Edición' : 'Editar Información'}
                </button>
            </div>

            {isEditing ? (
                // ... edit form code ...
                <div className="card" style={{ marginBottom: '2rem', border: '2px solid var(--primary)' }}>
                    <form onSubmit={handleUpdatePatient}>
                        {/* Same Edit Form */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Nombres</label>
                                <input className="input-field" value={editForm.firstName || ''} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Apellidos</label>
                                <input className="input-field" value={editForm.lastName || ''} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} />
                            </div>
                        </div>
                        {/* ... rest of form ... */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>DNI</label>
                                <input className="input-field" value={editForm.dni || ''} onChange={e => setEditForm({ ...editForm, dni: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Teléfono</label>
                                <input className="input-field" value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Fecha Nacimiento</label>
                                <input type="date" className="input-field" value={editForm.birthDate || ''} onChange={e => setEditForm({ ...editForm, birthDate: e.target.value })} />
                            </div>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block', fontWeight: 'bold' }}>Antecedentes Clínicos / Resumen</label>
                            <textarea
                                className="input-field"
                                rows="3"
                                value={editForm.clinicalSummary || ''}
                                onChange={e => setEditForm({ ...editForm, clinicalSummary: e.target.value })}
                                placeholder="Alergias, enfermedades crónicas, cirugías previas..."
                            ></textarea>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Save size={16} /> Guardar Cambios
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="card" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <User size={48} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>{patient.firstName ? `${patient.firstName} ${patient.lastName}` : patient.fullName}</h2>
                        <div style={{ display: 'flex', gap: '2rem', color: 'var(--text-muted)', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                            {patient.clinicalHistoryNumber && <span><strong>HC:</strong> {patient.clinicalHistoryNumber}</span>}
                            <span><strong>{patient.documentType || 'Doc'}:</strong> {patient.dni}</span>
                            <span><strong>Nacimiento:</strong> {patient.birthDate || 'N/A'}</span>
                            <span><strong>Edad:</strong> {patient.age} años</span>
                            <span><strong>Tel:</strong> {patient.phone}</span>
                        </div>
                        {patient.clinicalSummary && (
                            <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'var(--bg-body)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--accent)' }}>
                                <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>Antecedentes:</strong>
                                <p style={{ margin: 0 }}>{patient.clinicalSummary}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 className="section-title" style={{ margin: 0 }}>Historia Clínica</h3>
                        {(isAdmin() || hasPermission('view_clinical')) && (
                            <button onClick={() => setIsAdding(!isAdding)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Plus size={18} /> Nueva Entrada
                            </button>
                        )}
                    </div>

                    {isAdding && (isAdmin() || hasPermission('view_clinical')) && (
                        // ... add history form ...
                        <div className="card animate-fade-in" style={{ marginBottom: '2rem', border: '2px solid var(--primary)' }}>
                            <form onSubmit={handleAddHistory}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Tipo de Evento</label>
                                    <select className="input-field" value={newRecord.type} onChange={e => setNewRecord({ ...newRecord, type: e.target.value })}>
                                        <option>Consulta</option>
                                        <option>Diagnóstico</option>
                                        <option>Examen</option>
                                        <option>Receta</option>
                                        <option>Urgencia</option>
                                    </select>
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Notas Clínicas / Evolución</label>
                                    <textarea
                                        required
                                        className="input-field"
                                        rows="4"
                                        placeholder="Describe los síntomas, diagnóstico y tratamiento..."
                                        value={newRecord.notes}
                                        onChange={e => setNewRecord({ ...newRecord, notes: e.target.value })}
                                    ></textarea>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary">Cancelar</button>
                                    <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Save size={18} /> Guardar
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {!isAdding && !isAdmin() && !hasPermission('view_clinical') && visibleHistory.length === 0 && (
                        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            <Lock size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                            <p>La información clínica detallada está restringida.</p>
                        </div>
                    )}

                    <div style={{ position: 'relative', paddingLeft: '20px', borderLeft: '2px solid var(--border)' }}>
                        {visibleHistory.map((record) => (
                            // ... history item rendering ...
                            <div key={record.id} className="card animate-fade-in" style={{ marginBottom: '1.5rem', position: 'relative' }}>
                                <div style={{
                                    position: 'absolute',
                                    left: '-44px',
                                    top: '20px',
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    background: record.color || 'var(--primary)',
                                    border: '4px solid var(--bg-body)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '10px'
                                }}>
                                    {record.icon ? <record.icon size={10} /> : null}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 'bold', color: record.color || 'var(--primary-dark)' }}>
                                        {record.type}
                                    </span>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Calendar size={14} /> {record.date} {record.time ? ` - ${record.time}` : ''}
                                        {record.source === 'manual' && (isAdmin() || hasPermission('edit_clinical')) && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteConfirmId(record.id);
                                                }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#ef4444',
                                                    padding: '0',
                                                    marginLeft: '5px',
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                                title="Eliminar entrada"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </span>
                                </div>
                                {record.referral && (
                                    <div style={{ fontSize: '0.85rem', color: '#059669', marginBottom: '0.2rem', fontStyle: 'italic' }}>
                                        Referido por: {record.referral}
                                    </div>
                                )}
                                <div style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                    {record.source === 'triage' ? (
                                        <div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                                                {record.details.weight && (
                                                    <div style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Peso</span>
                                                        <strong>{record.details.weight} kg</strong>
                                                    </div>
                                                )}
                                                {record.details.height && (
                                                    <div style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Altura</span>
                                                        <strong>{record.details.height} cm</strong>
                                                    </div>
                                                )}
                                                {(record.details.weight && record.details.height) && (() => {
                                                    const imc = (record.details.weight / ((record.details.height / 100) ** 2));
                                                    let bg = '#ecfdf5', text = '#047857', border = '#a7f3d0'; // Normal (Green)

                                                    if (imc < 18.5) { // Underweight
                                                        bg = '#eff6ff'; text = '#1d4ed8'; border = '#bfdbfe'; // Blue
                                                    } else if (imc >= 25 && imc < 30) { // Overweight
                                                        bg = '#fffbeb'; text = '#b45309'; border = '#fde68a'; // Yellow/Orange
                                                    } else if (imc >= 30) { // Obesity
                                                        bg = '#fef2f2'; text = '#b91c1c'; border = '#fecaca'; // Red
                                                    }

                                                    return (
                                                        <div style={{ background: bg, padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', border: `1px solid ${border}` }}>
                                                            <span style={{ color: text, display: 'block', fontSize: '0.7rem' }}>IMC</span>
                                                            <strong style={{ color: text }}>{imc.toFixed(2)}</strong>
                                                        </div>
                                                    );
                                                })()}
                                                {record.details.systolic && record.details.diastolic && (
                                                    <div style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>P. Arterial</span>
                                                        <strong>{record.details.systolic}/{record.details.diastolic}</strong>
                                                    </div>
                                                )}
                                                {record.details.temperature && (
                                                    <div style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Temp.</span>
                                                        <strong>{record.details.temperature}°C</strong>
                                                    </div>
                                                )}
                                                {record.details.heartRate && (
                                                    <div style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>F. Card.</span>
                                                        <strong>{record.details.heartRate} bpm</strong>
                                                    </div>
                                                )}
                                                {record.details.oxygenSaturation && (
                                                    <div style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Sat. O2</span>
                                                        <strong>{record.details.oxygenSaturation}%</strong>
                                                    </div>
                                                )}
                                            </div>
                                            {record.notes && <p style={{ margin: '0.5rem 0 0', fontStyle: 'italic' }}>"{record.notes}"</p>}
                                        </div>
                                    ) : record.source === 'prescription' ? (
                                        <div>
                                            <ul style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
                                                {record.details.medications.map((m, i) => (
                                                    <li key={i}>{m.name} {m.dose} - {m.freq} ({m.duration})</li>
                                                ))}
                                            </ul>
                                            {record.details.instructions && <p style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>"{record.details.instructions}"</p>}
                                        </div>
                                    ) : record.source === 'exam' ? (
                                        <div>
                                            <p style={{ marginBottom: '0.5rem' }}>Estado: <strong>{record.details.status}</strong></p>
                                            <p>{record.details.reason}</p>
                                            {record.details.results && record.details.results.length > 0 && (
                                                <div style={{ marginTop: '0.5rem' }}>
                                                    {record.details.results.map(r => (
                                                        <a key={r.id} href={`http://localhost:5000/${r.filePath}`} target="_blank" rel="noreferrer" style={{ display: 'block', color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '4px' }}>
                                                            <File size={14} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                                                            Resultado ({new Date(r.uploadDate).toLocaleDateString()}) {r.note ? `- ${r.note}` : ''}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p style={{ lineHeight: '1.6' }}>{record.notes}</p>
                                    )}
                                </div>
                                {(record.createdAt || record.createdBy) && (
                                    <div style={{ marginTop: '0.8rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: '1rem' }}>
                                        {record.createdAt && (
                                            <span>
                                                Registrado: {new Date(record.createdAt).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                        {record.createdBy && (
                                            <span>
                                                Por: <strong>{record.createdBy}</strong>
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        {visibleHistory.length === 0 && (
                            // Logic handled above
                            null // Placeholder
                        )}
                    </div>
                </div>

                <div>
                    <div className="card">
                        <h3 style={{ marginBottom: '1rem' }}>Acciones Rápidas</h3>

                        {/* Next Appointments Display */}
                        {(() => {
                            // Find NEXT scheduled appointments (future only)
                            const now = new Date();
                            const futureAppts = history
                                .filter(h => {
                                    if (h.source !== 'appointment') return false;
                                    if (h.rawStatus !== 'Programado' && h.rawStatus !== 'Confirmado') return false;

                                    // Check if date/time is in the future
                                    const apptDate = new Date(`${h.date}T${h.time}`);
                                    return apptDate >= now;
                                })
                                .sort((a, b) => {
                                    const dateA = new Date(`${a.date}T${a.time}`);
                                    const dateB = new Date(`${b.date}T${b.time}`);
                                    return dateA - dateB;
                                })
                                .slice(0, 3); // Get top 3

                            if (futureAppts.length > 0) {
                                return (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Próximas Citas</h4>
                                        {futureAppts.map(appt => (
                                            <div key={appt.id} className="animate-fade-in" style={{ marginBottom: '0.5rem', padding: '0.8rem', background: '#ecfdf5', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 'bold', textTransform: 'capitalize' }}>
                                                        {new Date(appt.date + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                    </span>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={14} /> {appt.time}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#065f46', fontSize: '0.8rem' }}>
                                                    <span style={{ background: 'rgba(255,255,255,0.5)', padding: '2px 6px', borderRadius: '4px' }}>
                                                        {appt.rawStatus}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {(isAdmin() || hasPermission('manage_appointments')) && (
                            <button
                                onClick={() => navigate('/agenda', { state: { patientId: patient.id } })}
                                className="btn-white"
                                style={{ width: '100%', textAlign: 'left', padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                Agendar Cita / Retorno <Calendar size={16} color="var(--primary)" />
                            </button>
                        )}
                        {(isAdmin() || hasPermission('view_clinical')) && (
                            <>
                                <button
                                    onClick={() => navigate('/clinico', { state: { patientId: patient.id, action: 'exam' } })}
                                    className="btn-white"
                                    style={{ width: '100%', textAlign: 'left', padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    Solicitar Examen <Activity size={16} color="var(--primary)" />
                                </button>
                                <button
                                    onClick={() => navigate('/clinico', { state: { patientId: patient.id, action: 'rx' } })}
                                    className="btn-white"
                                    style={{ width: '100%', textAlign: 'left', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    Nueva Receta <FileText size={16} color="var(--primary)" />
                                </button>
                                <button
                                    onClick={() => navigate('/clinico', { state: { patientId: patient.id } })}
                                    className="btn-white"
                                    style={{ width: '100%', textAlign: 'left', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    Ir a Clínica <Stethoscope size={16} color="var(--primary)" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Custom Delete Confirmation Modal */}
            {/* Custom Delete Confirmation Modal using Shared Component */}
            <Modal
                isOpen={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                title="Eliminar Entrada"
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', width: '100%' }}>
                        <button
                            onClick={() => setDeleteConfirmId(null)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--border)',
                                background: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    await dataService.deleteHistory(deleteConfirmId);
                                    setHistory(prev => prev.filter(h => h.id !== deleteConfirmId));
                                    showAlert('Entrada eliminada', 'success');
                                    setDeleteConfirmId(null);
                                } catch (error) {
                                    showAlert(error.message, 'error');
                                }
                            }}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius)',
                                border: 'none',
                                background: '#ef4444',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Eliminar
                        </button>
                    </div>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1rem' }}>
                    <Trash2 size={48} color="#ef4444" style={{ marginBottom: '1rem', opacity: 0.8 }} />
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                        ¿Está seguro de que desea eliminar esta entrada del historial permanentemente?
                    </p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Esta acción no se puede deshacer.
                    </p>
                </div>
            </Modal>
        </div>
    );
};

export default PacienteDetalles;
