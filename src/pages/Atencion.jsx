import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FileText, Activity, Save, CheckCircle,
    ArrowLeft, Stethoscope, Pill, ClipboardList, AlertCircle,
    Calendar, User, Clock, Plus, Trash2, X, Printer, Edit, Upload, Eye, CalendarClock, FileWarning
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/data';
import { showAlert } from '../utils/alerts';
import { formatTime } from '../utils/format';
import TriageModal from '../components/TriageModal';
import Modal from '../components/Modal';

const Atencion = () => {
    const { id: appointmentId, patientId } = useParams();
    const navigate = useNavigate();

    // Data State
    const [appointment, setAppointment] = useState(null);
    const [patient, setPatient] = useState(null);
    const [triage, setTriage] = useState(null);
    const [prescriptions, setPrescriptions] = useState([]);
    const [exams, setExams] = useState([]);
    const [patientAppointments, setPatientAppointments] = useState([]);

    // UI State
    const [loading, setLoading] = useState(true);
    const [triageModalOpen, setTriageModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [rxToDelete, setRxToDelete] = useState(null);
    const [viewRxModal, setViewRxModal] = useState(null); // Prescription to view
    const [editingHistory, setEditingHistory] = useState(false); // Toggle edit mode for history
    const [finishModalOpen, setFinishModalOpen] = useState(false); // Confirmation to finish attention
    // Dynamic Layout State - Focus Mode
    // 'evolution', 'diagnosis', 'rx', 'exam' or null
    const [activeSection, setActiveSection] = useState(null);

    // Forms
    const [historyText, setHistoryText] = useState('');
    const [historyId, setHistoryId] = useState(null); // Track existing history ID
    const [diagnosisText, setDiagnosisText] = useState('');
    const [editingDiagnosis, setEditingDiagnosis] = useState(false);
    const [rxData, setRxData] = useState({ medications: [], instructions: '', date: new Date().toISOString().split('T')[0] });
    const [editingRxId, setEditingRxId] = useState(null); // Track if editing existing prescription
    const [newMed, setNewMed] = useState({ name: '', dose: '', freq: '', duration: '' });
    const [examData, setExamData] = useState({ type: '', reason: '', date: new Date().toISOString().split('T')[0] });

    // Exam Management State
    const [editExam, setEditExam] = useState(null);
    const [uploadExamId, setUploadExamId] = useState(null);
    const [fileToUpload, setFileToUpload] = useState(null);
    const [uploadNote, setUploadNote] = useState('');
    const [examToDelete, setExamToDelete] = useState(null);
    const [deleteExamModalOpen, setDeleteExamModalOpen] = useState(false);
    const [resultToDelete, setResultToDelete] = useState(null); // New state for result deletion
    const [selectedExams, setSelectedExams] = useState([]); // Array of IDs
    const [usePrePrinted, setUsePrePrinted] = useState(false); // Toggle for letterhead printing

    // History Print State
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [historyStartDate, setHistoryStartDate] = useState('');
    const [historyEndDate, setHistoryEndDate] = useState('');
    const [printIncludeHistory, setPrintIncludeHistory] = useState(true);
    const [printIncludeDiagnosis, setPrintIncludeDiagnosis] = useState(true);
    const [printIncludeRx, setPrintIncludeRx] = useState(true);
    const [printIncludeExams, setPrintIncludeExams] = useState(true);
    const [historyError, setHistoryError] = useState('');

    useEffect(() => { loadData(); }, [appointmentId, patientId]);

    const loadData = async (showLoading = true) => {
        try {
            if (showLoading) {
                setLoading(true);
                setAppointment(null); // Clear previous state to avoid showing stale data during redirect
                setPatient(null);
                setTriage(null);
            }

            let effectiveId = appointmentId;

            // Robust check: if id is 'paciente' or undefined, and we have a patientId, find the latest appointment and REDIRECT
            if ((!effectiveId || effectiveId === 'paciente') && patientId) {
                const appointments = await dataService.getAppointments();
                const pIdStr = String(patientId);
                const patientAppts = appointments
                    .filter(a => String(a.patientId) === pIdStr)
                    .sort((a, b) => Number(b.id) - Number(a.id));

                if (patientAppts.length > 0) {
                    const latestId = patientAppts[0].id;
                    // Redirect to the latest appointment
                    navigate(`/atencion/${latestId}`, { replace: true });
                    return;
                } else {
                    // No appointments: Load patient data only to show history/profile
                    // Do not redirect to /pacientes

                    // Fetch patient details alone
                    const patients = await dataService.getPatients();
                    const p = patients.find(p => String(p.id) === String(patientId));
                    if (p) {
                        setPatient(p);
                        // Load history for this patient
                        const history = await dataService.getPatientHistory(patientId);
                        setPatientAppointments(appointments.filter(a => String(a.patientId) === String(patientId)));
                        // We don't have an appointment, so we can't show appointment details
                        setAppointment(null);
                    } else {
                        showAlert('Paciente no encontrado', 'error');
                        navigate('/pacientes');
                    }
                    setLoading(false);
                    return;
                }
            }

            // If we are on a 'paciente' route without a valid redirect target yet, don't try to load details
            if (!effectiveId || effectiveId === 'paciente') return;

            const data = await dataService.getAppointmentFullDetails(effectiveId);
            setAppointment(data.appointment);
            setPatient(data.patient);
            setTriage(data.triage);
            setPrescriptions(data.prescriptions || []);
            setExams(data.exams || []);
            setSelectedExams([]); // Reset selection on reload
            setPatientAppointments(data.patientAppointments || []);
            if (data.history?.length) {
                // Filter history specific to this appointment
                // Some backends return all patient history, so we must find the one for THIS appointment
                const currentHistory = data.history.find(h => h.appointmentId == appointmentId);

                if (currentHistory) {
                    setHistoryText(currentHistory.notes || '');
                    setHistoryId(currentHistory.id);
                } else {
                    setHistoryText('');
                    setHistoryId(null);
                }
            } else {
                setHistoryText('');
                setHistoryId(null);
            }
            setDiagnosisText(data.appointment.diagnosis || '');
        } catch (error) { console.error(error); showAlert('Error loading data', 'error'); }
        finally { setLoading(false); }
    };

    // --- Actions ---
    const handleSaveHistory = async () => {
        if (!historyText.trim()) return;
        try {
            if (historyId) {
                // Update existing
                await dataService.updateHistory(historyId, {
                    notes: historyText,
                    date: new Date().toISOString().split('T')[0],
                    type: 'Evolución'
                });
                showAlert('Evolución actualizada', 'success');
                setEditingHistory(false);
            } else {
                // Create new
                const res = await dataService.addHistory({
                    patientId: patient.id, date: new Date().toISOString().split('T')[0],
                    type: 'Evolución', notes: historyText, appointmentId: appointment.id
                });
                if (res.id) setHistoryId(res.id);
                showAlert('Evolución guardada', 'success');
            }
            loadData();
        } catch (e) { showAlert('Error', 'error'); }
    };

    const handleSaveDiagnosis = async () => {
        try {
            await dataService.updateAppointment({ ...appointment, diagnosis: diagnosisText });
            showAlert('Diagnóstico actualizado', 'success');
            setEditingDiagnosis(false);
            loadData();
        } catch (e) { showAlert('Error', 'error'); }
    };

    const handleAddMedication = () => {
        if (!newMed.name) return;
        setRxData(prev => ({ ...prev, medications: [...prev.medications, { ...newMed }] }));
        setNewMed({ name: '', dose: '', freq: '', duration: '' });
    };

    const handleSavePrescription = async () => {
        // UX: Warn if user typed a med but didn't add it
        if (newMed.name && newMed.name.trim() !== '') {
            return showAlert('Por favor, presione el botón "+" ver para agregar el medicamento a la lista antes de guardar.', 'warning');
        }

        // Allow saving with just medications, just instructions, or both
        if (!rxData.medications.length && !rxData.instructions.trim()) {
            return showAlert('Agregue medicamentos o instrucciones', 'warning');
        }
        try {
            if (editingRxId) {
                // Update existing prescription
                await dataService.updatePrescription(editingRxId, {
                    medications: rxData.medications,
                    instructions: rxData.instructions,
                    prescriptionDate: rxData.date
                });
                showAlert('Receta actualizada correctamente', 'success');
                setEditingRxId(null);
            } else {
                // Create new prescription
                await dataService.addPrescription({
                    patientId: patient.id,
                    medications: rxData.medications,
                    instructions: rxData.instructions,
                    appointmentId: appointment.id,
                    prescriptionDate: rxData.date
                });
                showAlert('Receta guardada correctamente', 'success');
            }
            setRxData({ medications: [], instructions: '', date: new Date().toISOString().split('T')[0] });
            loadData(); // Just reload, no auto-print
        } catch (e) {
            console.error(e);
            showAlert('Error al guardar receta', 'error');
        }
    };

    const handleEditPrescription = (prescription) => {
        setEditingRxId(prescription.id);
        setRxData({
            medications: JSON.parse(prescription.medications),
            instructions: prescription.instructions,
            date: prescription.prescriptionDate || new Date().toISOString().split('T')[0]
        });
        // Scroll to top or focus on rx section
        setActiveSection('rx');
    };

    const handleCancelEdit = () => {
        setEditingRxId(null);
        setRxData({ medications: [], instructions: '', date: new Date().toISOString().split('T')[0] });
    };

    const handleDeletePrescription = (id) => {
        setRxToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDeletePrescription = async () => {
        if (!rxToDelete) return;
        try {
            await dataService.deletePrescription(rxToDelete);
            showAlert('Receta eliminada', 'success');
            setDeleteModalOpen(false);
            setRxToDelete(null);
            loadData();
            setActiveSection('rx');
        } catch (e) {
            console.error(e);
            showAlert('Error al eliminar', 'error');
            setDeleteModalOpen(false);
            setRxToDelete(null);
        }
    };

    const handleViewRx = (prescription) => {
        setViewRxModal(prescription);
    };

    const handleSaveExam = async () => {
        if (!examData.type) return showAlert('Falta tipo', 'warning');
        try {
            await dataService.addExam({
                patientId: patient.id,
                type: examData.type,
                reason: examData.reason,
                doctorName: examData.doctorName,
                appointmentId: appointment.id,
                examDate: examData.date || new Date().toISOString().split('T')[0]
            });
            showAlert('Examen OK', 'success');
            setExamData({ type: '', reason: '', doctorName: '', date: new Date().toISOString().split('T')[0] });
            loadData(false); // Background refresh
        } catch (e) { showAlert('Error', 'error'); }
    };

    const handleDeleteExam = (id) => {
        setExamToDelete(id);
        setDeleteExamModalOpen(true);
    };

    const confirmDeleteExam = async () => {
        if (!examToDelete) return;
        try {
            await dataService.deleteExam(examToDelete);
            showAlert('Examen eliminado', 'success');
            setDeleteExamModalOpen(false);
            setExamToDelete(null);
            loadData(false); // Background refresh
        } catch (e) {
            console.error(e);
            showAlert('Error al eliminar', 'error');
            setDeleteExamModalOpen(false);
            setExamToDelete(null);
        }
    };

    const handleDeleteResult = (resultId) => {
        setResultToDelete(resultId);
    };

    const confirmDeleteResult = async () => {
        if (!resultToDelete) return;
        try {
            await dataService.deleteExamResult(resultToDelete);
            showAlert('Archivo eliminado', 'success');
            setResultToDelete(null);
            loadData(false);
        } catch (e) {
            console.error(e);
            showAlert('Error al eliminar archivo', 'error');
            setResultToDelete(null);
        }
    };

    const toggleExamSelection = (id) => {
        setSelectedExams(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            return [...prev, id];
        });
    };

    const handlePrintExams = async () => {
        const examsToPrint = selectedExams.length > 0
            ? exams.filter(e => selectedExams.includes(e.id))
            : exams;

        if (examsToPrint.length === 0) return showAlert('No hay exámenes para imprimir', 'warning');

        try {
            const settings = await dataService.getSettings();
            const isHttps = window.location.protocol === 'https:';
            const API_HOST = isHttps ? window.location.origin : `http://${window.location.hostname}:5000`;
            const printWindow = window.open('', '_blank');
            const logoUrl = settings.logoUrl ? `${API_HOST}/${settings.logoUrl}` : '';
            const pName = patient.fullName || `${patient.firstName} ${patient.lastName}`;
            const age = patient.age || (patient.birthDate ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear() : 'N/A');

            // Format Date for Header
            // Use the date of the first exam, or today if mixed? Let's use Today for the print date, but display exam dates inside if needed.
            // Or better, standard header date.
            const formattedDate = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' });

            // Generate Pages (2 exams per page)
            const pages = [];
            for (let i = 0; i < examsToPrint.length; i += 2) {
                pages.push(examsToPrint.slice(i, i + 2));
            }

            const styles = `
                <style>
                    @page { 
                        size: 21.59cm 22.5cm;
                        margin: 0;
                    }
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Calibri', sans-serif; color: #2F5496; font-size: 10pt; line-height: 1.15; }
                    .page-container { width: 100vw; min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; page-break-after: always; }
                    .exam-half { 
                        padding: 8mm 10mm 10mm 10mm;
                        border-right: 1px dashed #999; 
                        display: flex; 
                        flex-direction: column; 
                    }
                    .exam-half:last-child { border-right: none; }
                    
                    /* Header */
                    .header { 
                        text-align: center;
                        /* border-bottom removed */
                        margin-bottom: 2px;
                    }
                    .header-line {
                        height: 4px;
                        border-top: 2px solid #2F5496;
                        border-bottom: 1px solid #2F5496;
                        margin-bottom: 10px;
                    }
                    
                    .doctor-name { font-family: 'Brush Script MT', cursive; font-size: 26pt; color: #2F5496; margin-bottom: 2px; line-height: 1.2; font-weight: bold; }
                    .specialty { font-family: 'Calibri', sans-serif; font-size: 11pt; color: #2F5496; margin-bottom: 1px; font-weight: bold; }
                    .registration { font-family: 'Calibri', sans-serif; font-size: 11pt; color: #2F5496; margin-bottom: 1px; font-weight: bold; }
                    .specialty-desc { font-family: 'Arial', sans-serif; font-weight: bold; font-size: 11pt; color: #2F5496; margin-bottom: 8px; }
                    .office-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-family: 'Calibri', sans-serif; font-size: 9pt; color: #2F5496; align-items: start; margin-top: 4px; text-align: left; font-weight: bold; }
                    .office-column { display: flex; flex-direction: column; }
                    .office-column.right { text-align: right; }
                    .office-label { font-weight: bold; }
                    
                    /* Patient Info */
                    .patient-info { background: transparent; padding: 0; margin-bottom: 5px; border: none; font-size: 9pt; color: #000; font-weight: bold; font-family: 'Calibri', sans-serif; }
                    
                    /* Content Area */
                    .content-area { 
                        border: none; 
                        padding: 0 12px 12px 12px; 
                        flex: 1; 
                        position: relative; 
                        overflow: hidden; 
                        min-height: 200px; 
                        max-height: 480px; /* Enforced limit based on page height */
                        display: flex; 
                        flex-direction: column; 
                        color: #000;
                    }
                    
                    /* Watermark */
                    .content-area::before {
                        content: '';
                        position: absolute;
                        top: 0.5cm;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 6.5cm;
                        height: 7.5cm;
                        background-color: #2F5496;
                        -webkit-mask-image: url('${logoUrl}');
                        mask-image: url('${logoUrl}');
                        -webkit-mask-repeat: no-repeat;
                        mask-repeat: no-repeat;
                        -webkit-mask-position: center;
                        mask-position: center;
                        -webkit-mask-size: contain;
                        mask-size: contain;
                        opacity: 0.15;
                        z-index: 0;
                        pointer-events: none;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .content-area > * { position: relative; z-index: 1; }
                    
                    .content-title { 
                        font-family: 'Brush Script MT', cursive; 
                        font-weight: bold; 
                        font-size: 16pt; 
                        color: #2F5496; 
                        text-align: left; 
                        margin-bottom: 2px; 
                        padding-left: 0; 
                    }
                    
                    .exam-details { font-size: 10pt; line-height: 1.4; white-space: pre-wrap; text-align: left; padding-top: 0; }
                    .exam-type { font-weight: bold; font-size: 11pt; margin-bottom: 2px; }
                    
                    .signature-area { margin-top: 40px; text-align: right; page-break-inside: avoid; }
                    .signature-box { display: inline-block; border-top: 1px solid #000; min-width: 200px; text-align: center; padding-top: 4px; font-size: 8pt; color: #000; }
                    
                    /* Pre-printed mode */
                    body.pre-printed .header, 
                    body.pre-printed .header-line,
                    body.pre-printed .print-label,
                    body.pre-printed .content-title,
                    body.pre-printed .patient-info { 
                        visibility: hidden; 
                    }
                    body.pre-printed .content-area::before { 
                        display: none; 
                    }

                    @media print { 
                        @page { 
                            margin: 0; 
                            size: 21.59cm 22.5cm; 
                        } 
                        body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; } 
                    }
                </style>
            `;

            const pagesHtml = pages.map(pageExams => `
                <div class="page-container">
                    ${pageExams.map(ex => {
                const exDate = ex.examDate ? ex.examDate.split('-').reverse().join('/') : formattedDate;
                return `
                        <div class="exam-half">
                            <div class="header">
                                <div class="doctor-name">Lucrecia Compén Kong</div>
                                <div class="specialty">MEDICO NEURÓLOGA</div>
                                <div class="registration">CMP 10837 - RNE 3407</div>
                                <div class="specialty-desc">ENFERMEDADES DEL SISTEMA NERVIOSO</div>
                                
                                <div class="office-info">
                                    <div class="office-column">
                                        <div class="office-label">Consultorio</div>
                                        <div>Bolívar 276 Of 101-Trujillo</div>
                                        <div>Tel 44-308318 – 949099550</div>
                                    </div>
                                    <div class="office-column right">
                                        <div class="office-label">Lunes a viernes:</div>
                                        <div>10 am a 12m</div>
                                        <div>4 pm a 8 pm</div>
                                    </div>
                                </div>
                            </div>
                            <div class="header-line"></div>

                            <div class="patient-info">
                                <strong><span class="print-label">Paciente:</span></strong> ${pName} (${age} años)<br>
                                <strong><span class="print-label">Fecha:</span></strong> ${exDate}
                            </div>
                            
                            <div class="content-area">
                                <div class="content-title">Indicaciones:</div>
                                <div class="exam-details">
                                    <div class="exam-type">${ex.type}</div>
                                    <div>${(ex.reason || '').trim().replace(/\n\s*\n/g, '\n')}</div>
                                </div>
                                <div class="signature-area">
                                    <div class="signature-box">
                                        <strong>Firma y Sello</strong><br>
                                        <small>Dra. Lucrecia Compén Kong</small><br>
                                        <small>C.M.P. 10837</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `}).join('')}
                    ${pageExams.length === 1 ? '<div class="exam-half" style="border:none;"></div>' : ''}
                </div>
            `).join('');

            printWindow.document.write(`<html><head><title>Orden de Examen</title>${styles}</head><body class="${usePrePrinted ? 'pre-printed' : ''}">${pagesHtml}</body></html>`);
            printWindow.document.close();
            setTimeout(() => { printWindow.print(); }, 500);

        } catch (error) { console.error(error); showAlert('Error al imprimir', 'error'); }
    };

    const handleFileUpload = async () => {
        if (!fileToUpload || !uploadExamId) return;
        try {
            await dataService.uploadExamResult(uploadExamId, fileToUpload, uploadNote);
            showAlert('Archivo subido correctamente', 'success');
            setUploadExamId(null);
            setFileToUpload(null);
            setUploadNote('');
            setActiveSection('exam'); // Keep open
            setTimeout(() => loadData(false), 500); // Wait for processing
        } catch (error) {
            console.error(error);
            showAlert('Error al subir archivo', 'error');
        }
    };

    const handleUpdateExam = async (id, updatedData) => {
        try {
            await dataService.updateExam(id, updatedData);
            showAlert('Examen actualizado', 'success');
            setEditExam(null);
            setActiveSection('exam'); // Keep open
            loadData(false); // Background refresh
        } catch (e) {
            console.error(e);
            showAlert('Error al actualizar', 'error');
        }
    };

    const handleFinish = () => {
        setFinishModalOpen(true);
    };

    const confirmFinish = async () => {
        try {
            await dataService.updateAppointment({
                ...appointment,
                diagnosis: diagnosisText,
                status: 'Realizado'
            });

            // Actualizar estado local para feedback visual inmediato
            setAppointment(prev => ({ ...prev, status: 'Realizado' }));

            showAlert('Atención finalizada correctamente', 'success');
            setFinishModalOpen(false);

            // Pequeño retraso para que el usuario vea el cambio de estado antes de salir
            setTimeout(() => {
                navigate('/agenda');
            }, 1000);
        } catch (e) {
            console.error(e);
            showAlert('Error al finalizar', 'error');
            setFinishModalOpen(false);
        }
    };

    const handleTriage = async (d) => {
        try {
            if (triage) await dataService.updateTriage(triage.id, d);
            else await dataService.addTriage({ ...d, patientId: patient.id, appointmentId: appointment.id, date: appointment.date });
            setTriageModalOpen(false); loadData(); showAlert('Triaje OK', 'success');
        } catch (e) { showAlert('Error', 'error'); }
    };

    const handlePrintRxNew = async (rx) => {
        try {
            const settings = await dataService.getSettings();
            const isHttps = window.location.protocol === 'https:';
            const API_HOST = isHttps ? window.location.origin : `http://${window.location.hostname}:5000`;
            const printWindow = window.open('', '_blank');

            // HYBRID FIX:
            // 1. If HTTPS (VPS/Cloud), use relative path (proxied by Nginx) to avoid Mixed Content.
            // 2. If HTTP (Local Network), use absolute path with port 5000 to ensure access even if frontend is on different port.

            let logoPath = settings.logoUrl || '';
            if (logoPath && !logoPath.startsWith('/')) logoPath = `/${logoPath}`;

            const logoUrl = logoPath ? (isHttps ? logoPath : `${API_HOST}${logoPath}`) : '';

            // 1. Patient Name
            const pName = patient.fullName || `${patient.firstName} ${patient.lastName}`;


            // 2. Date Logic (Proven Correct)
            const rawDate = rx.prescriptionDate || rx.date;
            let formattedDate = new Date().toLocaleDateString('es-ES', { timeZone: 'America/Lima' });

            if (rawDate && rawDate !== 'null') {
                if (typeof rawDate === 'object' && rawDate.getFullYear) {
                    formattedDate = rawDate.toLocaleDateString('es-ES', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' });
                } else if (typeof rawDate === 'string') {
                    let dStr = rawDate;
                    if (dStr.includes('T')) dStr = dStr.split('T')[0];
                    if (dStr.includes('-')) {
                        const [y, m, d] = dStr.split('-');
                        formattedDate = `${d}/${m}/${y}`;
                    } else {
                        formattedDate = dStr;
                    }
                }
            }

            // 3. Generate HTML Content (Split Layout)
            const content = `
                <html>
                <head>
                    <title>Receta Médica</title>
                    <style>
                        @page { size: 21.59cm 22.5cm; margin: 0; }
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: 'Calibri', 'Arial', sans-serif; color: #2F5496; font-size: 10pt; line-height: 1.15; }
                        .page-grid { display: grid; grid-template-columns: 1fr 1fr; min-height: 100vh; }
                        .half-page { padding: 8mm 10mm 10mm 10mm; border-right: 1px dashed #ccc; display: flex; flex-direction: column; }
                        .half-page:last-child { border-right: none; }
                        .header { text-align: center; margin-bottom: 5px; }
                        
                        /* Name - Brush Script MT - Size 26 */
                        .doctor-name { 
                            font-family: 'Brush Script MT', 'Brush Script Std', cursive; 
                            font-size: 26pt; 
                            color: #2F5496; 
                            margin-bottom: 2px;
                            line-height: 1.1;
                        }
                        
                        /* Medico Neurologa / CMP - Calibri - Size 11 */
                        .specialty-info {
                            font-family: 'Calibri', 'Arial', sans-serif;
                            font-size: 11pt;
                            font-weight: bold;
                            color: #2F5496;
                            margin-bottom: 2px;
                            text-transform: uppercase;
                        }

                        /* Disease Subtitle - Arial Bold - Size 11 */
                        .disease-subtitle {
                            font-family: 'Arial', sans-serif;
                            font-weight: bold;
                            font-size: 11pt;
                            color: #2F5496;
                            margin-bottom: 12px;
                            text-transform: uppercase;
                        }

                        /* Footer Info - Calibri - Size 9 */
                        .footer-info {
                            display: flex;
                            justify-content: space-between;
                            font-family: 'Calibri', 'Arial', sans-serif;
                            font-size: 9pt;
                            font-weight: bold; /* Bold everything in footer */
                            color: #2F5496;
                            border-bottom: 2px solid #2F5496; /* Double line effect part 1 */
                            padding-bottom: 2px;
                            margin-bottom: 2px;
                        }
                        
                        .footer-info-bottom-border {
                            border-top: 1px solid #2F5496; /* Double line effect part 2 */
                            height: 2px;
                            width: 100%;
                            margin-bottom: 10px;
                        }

                        .info-col { flex: 1; }
                        .info-left { text-align: left; }
                        .info-right { text-align: right; }
                        
                        .info-label { font-weight: bold; }

                        .content-area { flex: 1; position: relative; padding-top: 10px; }
                        
                        /* Rp / Indicaciones - Brush Script MT Bold - Size 14 */
                        .section-title {
                            font-family: 'Brush Script MT', 'Brush Script Std', cursive;
                            font-size: 16pt; /* Increased to 16 to be more visible like 14 bold */
                            font-weight: bold;
                            color: #2F5496;
                            margin-bottom: 10px;
                        }

                        .med-list { list-style: none; padding: 0; color: #000; }
                        .med-item { margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px dotted #ccc; }
                        .med-item:last-child { border-bottom: none; }
                        .med-name { font-weight: bold; font-size: 10pt; display: block; margin-bottom: 2px; }
                        .med-details { font-size: 9pt; color: #333; margin-left: 6px; }
                        
                        .instructions-content { 
                            font-family: 'Calibri', 'Arial', sans-serif;
                            font-size: 10pt; 
                            color: #000;
                            line-height: 1.4; 
                            white-space: pre-line; 
                        }

                        .signature-area { margin-top: auto; padding-top: 80px; text-align: right; }
                        .signature-box { display: inline-block; border-top: 1px solid #000; min-width: 200px; text-align: center; padding-top: 4px; font-size: 9pt; color: #000; }
                        
                        /* Watermark */
                        .content-area::before {
                            content: '';
                            position: absolute;
                            top: 1.5cm;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 6.5cm;
                            height: 7.5cm;
                            background-color: #2F5496;
                            -webkit-mask-image: url('${logoUrl}');
                            mask-image: url('${logoUrl}');
                            -webkit-mask-repeat: no-repeat;
                            mask-repeat: no-repeat;
                            -webkit-mask-position: center;
                            mask-position: center;
                            -webkit-mask-size: contain;
                            mask-size: contain;
                            opacity: 0.15;
                            z-index: 0;
                            pointer-events: none;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        
                        .content-area > * { position: relative; z-index: 1; }


                        /* Pre-printed mode */
                        body.pre-printed .header, 
                        body.pre-printed .header-line,
                        body.pre-printed .print-label,
                        body.pre-printed .content-title,
                        body.pre-printed .section-title,
                        body.pre-printed .patient-info { 
                            visibility: hidden; 
                        }
                        body.pre-printed .content-area::before { 
                            display: none; 
                        }

                        @media print { @page { margin: 0; size: 21.59cm 22.5cm; } body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; } }
                    </style>
                </head>
                <body class="${usePrePrinted ? 'pre-printed' : ''}">
                    <div class="page-grid">
                        <!-- LEFT: MEDICATIONS -->
                        <div class="half-page">
                            <div class="header">
                                <div class="doctor-name">Lucrecia Compén Kong</div>
                                <div class="specialty-info">MEDICO NEURÓLOGA</div>
                                <div class="specialty-info">CMP 10837 - RNE 3407</div>
                                <div class="disease-subtitle">ENFERMEDADES DEL SISTEMA NERVIOSO</div>
                                
                                <div class="footer-info">
                                    <div class="info-col info-left">
                                        <div class="info-label">Consultorio</div>
                                        <div>Bolívar 276 Of 101-Trujillo</div>
                                        <div>Tel 44-308318 – 949099550</div>
                                    </div>
                                    <div class="info-col info-right">
                                        <div class="info-label">Lunes a viernes:</div>
                                        <div>10 am a 12m</div>
                                        <div>4 pm a 8 pm</div>
                                    </div>
                                </div>
                                <div class="footer-info-bottom-border"></div>
                            </div>

                            <div class="patient-info" style="margin-bottom: 2px; font-size: 10pt; color: #000;">
                                <strong><span class="print-label">Paciente:</span></strong> ${pName}
                            </div>
                            <div class="patient-info" style="margin-bottom: 10px; font-size: 10pt; color: #000;">
                                <strong><span class="print-label">Fecha:</span></strong> ${formattedDate}
                            </div>

                            <div class="content-area">
                                <div class="section-title">Rp.</div>
                                <ul class="med-list">
                                    ${JSON.parse(rx.medications || '[]').map(m => {
                const details = [m.freq, m.duration].filter(Boolean).join(' • ');
                return `<li class="med-item"><span class="med-name">${m.name} ${m.dose || ''}</span>${details ? `<div class="med-details">${details}</div>` : ''}</li>`;
            }).join('')}
                                </ul>
                                <div class="signature-area"><div class="signature-box"><strong>Firma y Sello</strong><br>Dra. Lucrecia Compén Kong<br>C.M.P. 10837</div></div>
                            </div>
                        </div>
                        
                        <!-- RIGHT: INSTRUCTIONS -->
                        <div class="half-page">
                            <div class="header">
                                <div class="doctor-name">Lucrecia Compén Kong</div>
                                <div class="specialty-info">MEDICO NEURÓLOGA</div>
                                <div class="specialty-info">CMP 10837 - RNE 3407</div>
                                <div class="disease-subtitle">ENFERMEDADES DEL SISTEMA NERVIOSO</div>
                                
                                <div class="footer-info">
                                    <div class="info-col info-left">
                                        <div class="info-label">Consultorio</div>
                                        <div>Bolívar 276 Of 101-Trujillo</div>
                                        <div>Tel 44-308318 – 949099550</div>
                                    </div>
                                    <div class="info-col info-right">
                                        <div class="info-label">Lunes a viernes:</div>
                                        <div>10 am a 12m</div>
                                        <div>4 pm a 8 pm</div>
                                    </div>
                                </div>
                                <div class="footer-info-bottom-border"></div>
                            </div>

                            <div class="patient-info" style="margin-bottom: 2px; font-size: 10pt; color: #000;">
                                <strong><span class="print-label">Paciente:</span></strong> ${pName}
                            </div>
                            <div class="patient-info" style="margin-bottom: 10px; font-size: 10pt; color: #000;">
                                <strong><span class="print-label">Fecha:</span></strong> ${formattedDate}
                            </div>

                            <div class="content-area">
                                <div class="section-title">Indicaciones:</div>
                                <div class="instructions-content">${(rx.instructions || '').trim()}</div>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `;


            printWindow.document.write(content);
            printWindow.document.close();
            setTimeout(() => { printWindow.print(); }, 500);

        } catch (error) { console.error(error); showAlert('Error al imprimir', 'error'); }
    };

    const handlePrintHistory = async () => {
        if (!historyStartDate || !historyEndDate) {
            showAlert('Seleccione un rango de fechas', 'warning');
            return;
        }

        // Filter appointments using string comparison for reliability with timezones (Peru)
        const filteredAppts = patientAppointments.filter(a => {
            // "a.date" is already in yyyy-mm-dd format
            const apptDateStr = a.date;
            // historyStartDate/EndDate are from <input type="date"> which returns yyyy-mm-dd
            return apptDateStr >= historyStartDate && apptDateStr <= historyEndDate;
        }).sort((a, b) => a.date.localeCompare(b.date));

        if (filteredAppts.length === 0) {
            setHistoryError('No se encontraron atenciones en el período seleccionado');
            return;
        }

        setHistoryError('');

        // Open window IMMEDIATELY to avoid popup blockers (browsers require user gesture)
        const printWindow = window.open('', 'ImprimirHistoria', 'height=800,width=1200');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Generando...</title></head><body style="font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;"><h2>Generando historia clínica, por favor espere...</h2></body></html>');
            printWindow.document.close();
        }

        try {
            showAlert('Generando historia clínica...', 'info');

            const calculateAge = (birthDate) => {
                if (!birthDate) return 'N/A';
                const today = new Date();
                const birth = new Date(birthDate);
                let age = today.getFullYear() - birth.getFullYear();
                const m = today.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
                return age;
            };

            // Fetch full details for each
            const fullHistory = await Promise.all(filteredAppts.map(async (a) => {
                try {
                    return await dataService.getAppointmentFullDetails(a.id);
                } catch (e) {
                    console.error("Error details", e);
                    return a; // Fallback to basic info
                }
            }));

            const settings = await dataService.getSettings();

            if (!printWindow || printWindow.closed) {
                showAlert('La ventana de impresión fue bloqueada o cerrada', 'error');
                return;
            }

            // HTML Generation
            const content = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Historia Clínica - ${patient.fullName}</title>
                    <style>
                        @page { size: A4 portrait; margin: 0; }
                        * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
                        html, body { 
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                            width: 210mm; /* Force A4 width */
                            height: auto !important;
                            overflow: visible !important;
                            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                            font-size: 11pt; 
                            color: #0f172a; 
                        }
                        
                        .page-container {
                            width: 210mm;
                            padding: 20mm 15mm; /* FORCE MARGINS HERE */
                            margin: 0 auto;
                            display: flex;
                            flex-direction: column;
                            position: relative;
                            background: white;
                        }

                        /* Page Break per Attention */
                        .attention-page {
                            page-break-after: always;
                            break-after: page;
                            background: white;
                            width: 210mm;
                            position: relative;
                        }
                        .attention-page:last-child {
                            page-break-after: auto;
                            break-after: auto;
                        }

                        .dr-header {
                            text-align: center;
                            margin-bottom: 5px;
                        }
                        .doctor-name { 
                            font-family: 'Brush Script MT', 'Brush Script Std', cursive; 
                            font-size: 26pt; 
                            color: #2F5496; 
                            margin-bottom: 2px;
                            line-height: 1.1;
                        }
                        .specialty-info {
                            font-family: 'Calibri', 'Arial', sans-serif;
                            font-size: 11pt;
                            font-weight: bold;
                            color: #2F5496;
                            margin-bottom: 2px;
                            text-transform: uppercase;
                        }
                        .disease-subtitle {
                            font-family: 'Arial', sans-serif;
                            font-weight: bold;
                            font-size: 11pt;
                            color: #2F5496;
                            margin-bottom: 12px;
                            text-transform: uppercase;
                        }
                        .footer-info {
                            display: flex;
                            justify-content: space-between;
                            font-family: 'Calibri', 'Arial', sans-serif;
                            font-size: 9pt;
                            font-weight: bold;
                            color: #2F5496;
                            border-bottom: 2px solid #2F5496;
                            padding-bottom: 2px;
                            margin-bottom: 2px;
                        }
                        .footer-info-bottom-border {
                            border-top: 1px solid #2F5496;
                            height: 2px;
                            width: 100%;
                            margin-bottom: 15px;
                        }
                        .info-col { flex: 1; }
                        .info-left { text-align: left; }
                        .info-right { text-align: right; }
                        .info-label { font-weight: bold; }

                        /* Patient Info banner */
                        .patient-info-box {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 12px;
                            background-color: #f1f5f9;
                            padding: 12px 18px;
                            border-radius: 12px;
                            margin-bottom: 20px;
                            border: 1px solid #cbd5e1;
                        }
                        .data-row {
                            display: flex;
                            flex-direction: column;
                            gap: 2px;
                        }
                        .data-label {
                            font-size: 8pt;
                            font-weight: 900;
                            color: #64748b;
                            text-transform: uppercase;
                        }
                        .data-value {
                            font-size: 11pt;
                            font-weight: 700;
                            color: #1e293b;
                        }

                        /* Date Banner */
                        .date-marker {
                            font-size: 15pt;
                            font-weight: 900;
                            color: #2F5496;
                            margin-bottom: 12px;
                            border-left: 6px solid #2F5496;
                            padding-left: 12px;
                        }

                        /* Sections */
                        .print-section {
                            margin-bottom: 20px;
                            border: 1px solid #e2e8f0;
                            border-radius: 14px;
                            background: white;
                            overflow: hidden;
                        }
                        .section-head {
                            background-color: #f8fafc;
                            border-bottom: 1px solid #e2e8f0;
                            padding: 8px 15px;
                        }
                        .section-label {
                            font-size: 9pt;
                            font-weight: 900;
                            color: #334155;
                            text-transform: uppercase;
                            margin: 0;
                        }
                        .section-body {
                            padding: 15px;
                        }
                        .content-txt {
                            font-size: 11pt;
                            color: #1e293b;
                            white-space: pre-line;
                            text-align: justify;
                            line-height: 1.4;
                        }
                        .dg-pill {
                            background-color: #eff6ff;
                            color: #2F5496;
                            padding: 10px 15px;
                            border-radius: 10px;
                            font-weight: 800;
                            border: 1.5px solid #bfdbfe;
                            font-size: 11pt;
                        }
                        .item-row {
                            padding: 6px 0;
                            border-bottom: 1px dashed #cbd5e1;
                            display: flex;
                            align-items: flex-start;
                            gap: 10px;
                        }
                        .item-row:last-child { border-bottom: none; }
                        .dot { color: #2F5496; font-size: 12pt; margin-top: -2px; }

                        /* Pre-printed mode override */
                        .pre-printed .dr-header {
                            visibility: hidden;
                            margin-bottom: 50mm; /* Reserve space for header */
                        }

                    </style>
                </head>
                <body class="${usePrePrinted ? 'pre-printed' : ''}" style="margin: 0; padding: 0; height: auto;">
                    ${fullHistory.map(h => {
                const appt = h.appointment || h;
                const rawDate = appt.date || appt.appointment_date;
                let dateStr = 'Fecha Pendiente';

                if (rawDate) {
                    const dParts = String(rawDate).split('T')[0].split('-');
                    if (dParts.length === 3) {
                        const d = new Date(dParts[0], dParts[1] - 1, dParts[2]);
                        dateStr = d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    }
                }

                const currentHistory = h.history?.find(note => String(note.appointmentId) === String(appt.id));
                const historyText = currentHistory?.notes || '';
                const diagnosisText = appt.diagnosis || '';

                return `
                        <div class="attention-page">
                            <div class="page-container">
                                <div class="dr-header">
                                    <div class="doctor-name">Lucrecia Compén Kong</div>
                                    <div class="specialty-info">MEDICO NEURÓLOGA</div>
                                    <div class="specialty-info">CMP 10837 - RNE 3407</div>
                                    <div class="disease-subtitle">ENFERMEDADES DEL SISTEMA NERVIOSO</div>
                                    
                                    <div class="footer-info">
                                        <div class="info-col info-left">
                                            <div class="info-label">Consultorio</div>
                                            <div>Bolívar 276 Of 101-Trujillo</div>
                                            <div>Tel 44-308318 – 949099550</div>
                                        </div>
                                        <div class="info-col info-right">
                                            <div class="info-label">Lunes a viernes:</div>
                                            <div>10 am a 12m</div>
                                            <div>4 pm a 8 pm</div>
                                        </div>
                                    </div>
                                    <div class="footer-info-bottom-border"></div>
                                </div>

                                <div class="patient-info-box">
                                    <div class="data-row">
                                        <span class="data-label">Paciente</span>
                                        <span class="data-value">${patient.fullName}</span>
                                    </div>
                                    <div class="data-row">
                                        <span class="data-label">${patient.documentType || 'DNI'}</span>
                                        <span class="data-value">${patient.documentNumber || patient.dni}</span>
                                    </div>
                                    <div class="data-row">
                                        <span class="data-label">Edad / HC</span>
                                        <span class="data-value">${calculateAge(patient.birthDate)} años / HC: ${patient.clinicalHistoryNumber || 'S/N'}</span>
                                    </div>
                                    <div class="data-row">
                                        <span class="data-label">Tipo de Atención</span>
                                        <span class="data-value">${appt.type || 'Consulta'}</span>
                                    </div>
                                </div>

                                <div class="date-marker">
                                    Atención: ${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}
                                </div>

                                <div class="content-sections">
                                    ${(printIncludeHistory && historyText && historyText.trim() && historyText !== 'undefined') ? `
                                        <div class="print-section">
                                            <div class="section-head"><h3 class="section-label">Evolución Clínica / Anamnesis</h3></div>
                                            <div class="section-body">
                                                <div class="content-txt">${historyText}</div>
                                            </div>
                                        </div>
                                    ` : ''}
                                    
                                    ${(printIncludeDiagnosis && diagnosisText && diagnosisText.trim() && diagnosisText !== 'undefined') ? `
                                        <div class="print-section">
                                            <div class="section-head"><h3 class="section-label">Diagnóstico</h3></div>
                                            <div class="section-body">
                                                <div class="dg-pill">${diagnosisText}</div>
                                            </div>
                                        </div>
                                    ` : ''}

                                    ${(() => {
                        if (!printIncludeExams || !h.exams) return '';
                        const validExams = h.exams.filter(ex => ex.type && String(ex.type) !== 'undefined');
                        if (validExams.length === 0) return '';
                        return `
                                            <div class="print-section">
                                                <div class="section-head"><h3 class="section-label">Exámenes Auxiliares</h3></div>
                                                <div class="section-body">
                                                    ${validExams.map(ex => `
                                                        <div class="item-row">
                                                            <span class="dot">▶</span>
                                                            <span>${ex.type}</span>
                                                        </div>
                                                    `).join('')}
                                                </div>
                                            </div>
                                        `;
                    })()}

                                    ${(() => {
                        if (!printIncludeRx || !h.prescriptions) return '';
                        const validRxs = h.prescriptions.filter(p => (p.medication || p.name) && String(p.medication || p.name) !== 'undefined');
                        if (validRxs.length === 0) return '';
                        return `
                                            <div class="print-section">
                                                <div class="section-head"><h3 class="section-label">Receta Médica</h3></div>
                                                <div class="section-body">
                                                    ${validRxs.map(p => {
                            const med = p.medication || p.name;
                            const d = p.dosage || p.dose;
                            const f = p.frequency || p.freq;
                            const dur = p.duration;

                            const details = [d, f, dur]
                                .map(v => String(v).trim())
                                .filter(v => v && v !== 'undefined' && v !== 'null')
                                .join(' - ');

                            return `
                                                            <div class="item-row">
                                                                <span class="dot">▶</span>
                                                                <strong>${med}</strong> 
                                                                ${details ? `<span style="color: #64748b; margin-left:12px;">(${details})</span>` : ''}
                                                            </div>
                                                        `;
                        }).join('')}
                                                </div>
                                            </div>
                                        `;
                    })()}
                                </div>
                            </div>
                        </div>
                    `;
            }).join('')}
                    <script>
                        window.onload = function() {
                            setTimeout(function() { 
                                window.print();
                                // window.close(); // Opcional
                            }, 500);
                        }
                    </script>
                </body>
                </html>
            `;

            printWindow.document.open();
            printWindow.document.write(content);
            printWindow.document.close();
            setHistoryModalOpen(false);

            // Additional focus as fallback
            setTimeout(() => {
                if (printWindow && !printWindow.closed) {
                    printWindow.focus();
                }
            }, 1000);

        } catch (error) {
            console.error(error);
            showAlert('Error al generar historia', 'error');
            if (printWindow) printWindow.close();
        }
    };

    if (loading || (!appointment && !patient)) return <div className="h-screen flex items-center justify-center text-gray-500 font-medium text-lg">Cargando datos...</div>;

    return (
        <div className="p-3 max-w-[1600px] mx-auto min-h-screen flex flex-col gap-0" onClick={() => setActiveSection(null)}>

            {/* Header */}
            {/* Header */}
            {/* Header */}
            <header className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-2 flex justify-between items-start !p-5">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate('/agenda')} className="text-gray-400 hover:text-gray-800 transition-colors p-2 rounded-full hover:bg-gray-100">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 leading-tight">
                            {patient.fullName || `${patient.firstName} ${patient.lastName}`}
                        </h1>
                        <span className="text-sm text-gray-500 font-medium mt-1 block">
                            {patient.age || (patient.birthDate ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear() : 'N/A')} años, ({patient.documentType || 'DNI'}) {patient.documentNumber || patient.dni} - HC: {patient.historyNumber || patient.id}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setHistoryModalOpen(true)}
                        className="rounded-lg shadow-sm flex items-center transition-all font-bold"
                        style={{ padding: '10px 15px', gap: '8px', backgroundColor: 'rgb(239, 246, 255)', color: 'rgb(30, 64, 175)', border: '1px solid rgb(191, 219, 254)' }}
                        title="Imprimir Historia Clínica"
                    >
                        <Printer size={20} />
                        <span className="text-sm">Imprimir Historia</span>
                    </button>

                    {!appointment ? (
                        <button
                            onClick={() => navigate('/agenda', { state: { patientId: patient.id } })}
                            style={{
                                padding: '10px 20px',
                                gap: '8px',
                                backgroundColor: '#3b82f6',
                                color: 'white'
                            }}
                            className="text-sm font-bold rounded-lg flex items-center shadow-lg transition-all hover:bg-blue-700 active:transform active:scale-95"
                        >
                            <CalendarClock size={20} />
                            CITAR PACIENTE
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => setTriageModalOpen(true)}
                                style={{
                                    padding: '10px 15px',
                                    gap: '8px',
                                    backgroundColor: triage ? '#f0fdf4' : '#ffffff',
                                    color: triage ? '#166534' : '#374151',
                                    border: triage ? '1px solid #bbf7d0' : '1px solid #e5e7eb'
                                }}
                                className="text-sm font-semibold rounded-lg flex items-center transition-all hover:bg-gray-50 shadow-sm"
                            >
                                <Activity size={18} className={triage ? 'text-green-600' : 'text-gray-400'} />
                                {triage ? (
                                    <div className="flex flex-col items-start leading-tight">
                                        <span className="text-xs uppercase font-bold opacity-70">Triaje Realizado</span>
                                        <span className="text-sm">
                                            {triage.systolic}/{triage.diastolic} <small>mmHg</small>
                                            {triage.oxygenSaturation ? ` • ${triage.oxygenSaturation}% SpO2` : ''}
                                        </span>
                                    </div>
                                ) : 'Tomar Triaje'}
                            </button>

                            <button
                                onClick={handleFinish}
                                disabled={appointment?.status === 'Realizado'}
                                style={{
                                    padding: '10px 20px',
                                    gap: '8px',
                                    backgroundColor: appointment?.status === 'Realizado' ? '#9ca3af' : '#16a34a',
                                    color: 'white',
                                    cursor: appointment?.status === 'Realizado' ? 'default' : 'pointer'
                                }}
                                className={`text-sm font-bold rounded-lg flex items-center shadow-lg transition-all ${appointment?.status !== 'Realizado' ? 'hover:bg-green-700 active:transform active:scale-95' : ''}`}
                            >
                                <CheckCircle size={20} />
                                {appointment?.status === 'Realizado' ? 'ATENCIÓN REALIZADA' : 'FINALIZAR ATENCIÓN'}
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* MAIN GRID: Gap-8 and P-8 for lots of breathing room */
                /* CHANGED: Reverted to Grid per user request */
            }
            {/* MAIN LAYOUT: Flexbox for smooth horizontal expansion */}
            {/* Click outside usually means clicking the gap or background -> Reset focus */}
            <div
                style={{ marginTop: '20px', marginBottom: '20px' }}
                className="flex-1 p-8 overflow-hidden flex items-stretch gap-4 transition-all duration-500"
                onClick={() => setActiveSection(null)}
            >

                {/* 1. PAST: History List (Fixed Width) */}
                <div
                    className="w-[280px] flex-none bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden transition-all duration-500"
                >
                    <div style={{ padding: '5px' }} className="bg-gray-50 border-b border-gray-100 text-sm font-bold text-gray-600 uppercase flex items-center gap-2 tracking-wide">
                        <Calendar size={18} className="text-blue-500" /> Historia
                    </div>
                    <div style={{ padding: '5px' }} className="flex-1 overflow-y-auto space-y-3">
                        {patientAppointments.map(appt => {
                            const isCur = String(appt.id) === String(appointmentId);
                            return (
                                <div key={appt.id} onClick={() => !isCur && navigate(`/atencion/${appt.id}`)}
                                    style={{ padding: '5px' }}
                                    className={`rounded-xl border cursor-pointer transition-all mb-2 ${isCur ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-300'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex flex-col">
                                            <span className={`text-base font-bold ${isCur ? 'text-blue-700' : 'text-gray-700'}`}>
                                                {new Date(appt.date + 'T00:00:00').toLocaleDateString()}
                                            </span>
                                            <span className={`text-xs ${isCur ? 'text-blue-500' : 'text-gray-500'} flex items-center gap-1 font-medium`}>
                                                <Clock size={12} /> {formatTime(appt.time)}
                                            </span>
                                        </div>
                                        {isCur && <div className="mt-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm ring-2 ring-blue-200" />}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1 truncate font-medium">{appt.type}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* New Scheduling Button at the bottom of the sidebar */}
                    <div style={{ padding: '10px' }} className="border-t border-gray-100 bg-gray-50/50">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate('/agenda', { state: { patientId: patient.id } });
                            }}
                            style={{
                                width: '100%',
                                padding: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                background: 'white',
                                border: '1px solid #3b82f6',
                                color: '#3b82f6',
                                borderRadius: '12px',
                                fontWeight: '600',
                                fontSize: '0.85rem'
                            }}
                            className="transition-all hover:bg-blue-50 active:scale-95 shadow-sm"
                            title="Abre la agenda para programar una nueva cita para este paciente"
                        >
                            <CalendarClock size={18} />
                            CITAR PACIENTE
                        </button>
                    </div>
                </div>

                {/* 2. PRESENT: Evolution (Dynamic Width) */}
                <div
                    className={`flex flex-col gap-4 overflow-hidden transition-all duration-500 ease-in-out ${!activeSection ? 'flex-1' : ((activeSection === 'rx' || activeSection === 'exam') ? 'flex-[4]' : 'flex-[6]')}`}
                >

                    {/* Evolution Note */}
                    <div onClick={(e) => { e.stopPropagation(); setActiveSection('evolution'); }} className={`transition-all duration-300 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden ${activeSection === 'evolution' ? 'flex-[3]' : (activeSection === 'diagnosis' ? 'flex-1' : 'flex-[1.2]')}`}>
                        <div style={{ padding: '5px' }} className="bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <span className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide"><FileText size={18} className="text-blue-600" /> Historia Clínica</span>
                            <div className="flex gap-2">
                                <div className="flex gap-2">
                                    {appointment && historyId && !editingHistory && (
                                        <button onClick={(e) => { e.stopPropagation(); setEditingHistory(true); }} className="text-amber-600 hover:text-amber-800 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded hover:bg-amber-50 transition-colors flex items-center gap-1">
                                            <Edit size={14} /> Editar
                                        </button>
                                    )}
                                    {appointment && (editingHistory || !historyId) && (
                                        <button onClick={handleSaveHistory} className="text-blue-600 hover:text-blue-800 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded hover:bg-blue-50 transition-colors">
                                            {historyId ? 'Actualizar' : 'Guardar'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="relative flex-1">
                            <textarea
                                style={{ padding: '5px' }}
                                className={`flex-1 w-full h-full text-lg leading-relaxed text-gray-800 focus:outline-none resize-none placeholder-gray-400 font-normal ${(!editingHistory && historyId) ? 'bg-gray-50' : ''}`}
                                placeholder="Escriba aquí la evolución del paciente..."
                                value={historyText}
                                onChange={e => setHistoryText(e.target.value)}
                                maxLength={2000}
                                readOnly={!!(historyId && !editingHistory) || !appointment}
                                disabled={!appointment}
                            />
                            <span style={{ position: 'absolute', bottom: '8px', right: '8px', fontSize: '0.7rem', color: (historyText?.length || 0) > 1800 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                {historyText?.length || 0}/2000
                            </span>
                        </div>
                    </div>

                    {/* Diagnosis (Bigger) */}
                    <div onClick={(e) => { e.stopPropagation(); setActiveSection('diagnosis'); }} className={`transition-all duration-300 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden ${activeSection === 'diagnosis' ? 'flex-[3]' : 'flex-1'}`}>
                        <div style={{ padding: '5px' }} className="bg-amber-50 border-b border-amber-100 flex justify-between items-center">
                            <span className="flex items-center gap-2 text-sm font-bold text-amber-800 uppercase tracking-wide"><AlertCircle size={18} /> Diagnóstico Principal</span>
                            <div className="flex gap-2">
                                <div className="flex gap-2">
                                    {appointment && diagnosisText && !editingDiagnosis && (
                                        <button onClick={(e) => { e.stopPropagation(); setEditingDiagnosis(true); }} className="text-amber-700 hover:text-amber-900 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded hover:bg-amber-100 transition-colors flex items-center gap-1">
                                            <Edit size={14} /> Editar
                                        </button>
                                    )}
                                    {appointment && (editingDiagnosis || !diagnosisText) && (
                                        <button onClick={handleSaveDiagnosis} className="text-amber-700 hover:text-amber-900 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded hover:bg-amber-100 transition-colors">
                                            {diagnosisText ? 'Actualizar' : 'Guardar'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="relative flex-1">
                            <textarea
                                style={{ padding: '5px' }}
                                className={`flex-1 w-full h-full text-lg font-normal leading-relaxed text-gray-800 focus:outline-none resize-none placeholder-gray-400 ${(!editingDiagnosis && diagnosisText) ? 'bg-amber-50/10' : 'bg-white'}`}
                                placeholder="Ingrese el diagnóstico..."
                                value={diagnosisText}
                                onChange={e => setDiagnosisText(e.target.value)}
                                maxLength={1000}
                                readOnly={!!(diagnosisText && !editingDiagnosis) || !appointment}
                                disabled={!appointment}
                            />
                            <span style={{ position: 'absolute', bottom: '8px', right: '8px', fontSize: '0.7rem', color: (diagnosisText?.length || 0) > 900 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                {diagnosisText?.length || 0}/1000
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. ACTIONS: Prescriptions & Exams (Dynamic Width) */}
                <div
                    className={`flex flex-col gap-4 overflow-hidden transition-all duration-500 ease-in-out ${!activeSection ? 'flex-[1.5]' : ((activeSection === 'rx' || activeSection === 'exam') ? 'flex-[7]' : 'flex-[3]')}`}
                >
                    {/* Print Toggle - Moved to Left and Styled as Button */}
                    <div className="flex justify-start px-2">
                        <label
                            onClick={(e) => e.stopPropagation()}
                            style={{ padding: '5px' }}
                            className={`flex items-center gap-3 cursor-pointer text-sm font-bold select-none rounded-lg border transition-all shadow-sm active:scale-95 ${usePrePrinted ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'}`}
                        >
                            <input
                                type="checkbox"
                                checked={usePrePrinted}
                                onChange={e => setUsePrePrinted(e.target.checked)}
                                className="hidden"
                            />
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${usePrePrinted ? 'bg-white border-white' : 'border-gray-400 bg-gray-50'}`}>
                                {usePrePrinted && <div className="w-2.5 h-2.5 rounded-sm bg-blue-600" />}
                            </div>
                            Papel Membretado
                        </label>
                    </div>

                    {/* Prescriptions */}
                    <div onClick={(e) => { e.stopPropagation(); setActiveSection('rx'); }} className={`transition-all duration-300 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden min-h-0 ${activeSection === 'rx' ? 'flex-[3]' : (activeSection === 'exam' ? 'flex-1' : 'flex-1')}`}>
                        <div style={{ padding: '5px' }} className="bg-gray-50 border-b border-gray-100 text-sm font-bold text-emerald-700 uppercase flex items-center gap-2 tracking-wide">
                            <Pill size={18} /> Recetas
                        </div>

                        {/* New Rx Input */}
                        {appointment && (
                            <div style={{ padding: '8px' }} className="border-b border-gray-100 bg-gray-50/30 space-y-4">
                                <input className="input-field w-full text-base" style={{ marginBottom: '10px' }} placeholder="Medicamento..." value={newMed.name} onChange={e => setNewMed({ ...newMed, name: e.target.value })} />
                                <div className="flex gap-2">
                                    <input className="input-field w-1/3 text-sm py-2" placeholder="Dosis (ej: 500mg)" value={newMed.dose} onChange={e => setNewMed({ ...newMed, dose: e.target.value })} />
                                    <input className="input-field w-1/3 text-sm py-2" placeholder="Frecuencia (ej: 8h)" value={newMed.freq} onChange={e => setNewMed({ ...newMed, freq: e.target.value })} />
                                    <input className="input-field w-1/3 text-sm py-2" placeholder="Duración (ej: 5 días)" value={newMed.duration} onChange={e => setNewMed({ ...newMed, duration: e.target.value })} />
                                    <button onClick={handleAddMedication} style={{ backgroundColor: '#059669', color: 'white', padding: '10px' }} className="rounded-lg shadow-sm mb-[2px] transition-all hover:opacity-90 flex-shrink-0"><Plus size={20} /></button>
                                </div>
                            </div>
                        )}

                        {/* Current Rx List */}
                        <div style={{ padding: '5px' }} className="flex-1 overflow-y-auto">
                            {rxData.medications.length > 0 && <h6 style={{ marginBottom: '5px' }} className="text-xs font-bold text-gray-400 uppercase mb-6">Borrador Actual ({rxData.medications.length})</h6>}

                            {rxData.medications.map((m, i) => (
                                <div key={i} style={{ padding: '5px', marginBottom: '10px' }} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-lg shadow-sm group">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800 text-base">{m.name}</span>
                                        <span className="text-sm text-gray-500">{m.dose} • {m.freq} • {m.duration}</span>
                                    </div>
                                    <button onClick={() => {
                                        const n = [...rxData.medications]; n.splice(i, 1); setRxData({ ...rxData, medications: n });
                                    }} className="text-red-400 p-2 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={18} /></button>
                                </div>
                            ))}

                            {/* Instructions Input */}
                            {appointment && (
                                <div className="mb-4">
                                    <label style={{ marginBottom: '5px' }} className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Indicaciones / Observaciones</label>
                                    <div className="relative">
                                        <textarea
                                            style={{ padding: '5px' }}
                                            className="w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-sm bg-gray-50/50 resize-y min-h-[80px]"
                                            placeholder="Escriba aquí las indicaciones generales..."
                                            value={rxData.instructions}
                                            onChange={e => setRxData(prev => ({ ...prev, instructions: e.target.value }))}
                                            maxLength={550}
                                        />
                                        <span style={{ position: 'absolute', bottom: '8px', right: '8px', fontSize: '0.7rem', color: (rxData.instructions?.length || 0) > 500 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                            {rxData.instructions?.length || 0}/550
                                        </span>
                                    </div>
                                </div>
                            )}

                            {appointment && (
                                <div className="mb-4">
                                    <label style={{ marginBottom: '5px' }} className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Fecha de Receta</label>
                                    <input
                                        type="date"
                                        className="input-field w-full text-sm py-2"
                                        value={rxData.date}
                                        onChange={e => setRxData(prev => ({ ...prev, date: e.target.value }))}
                                    />
                                </div>
                            )}

                            {/* Button changes based on edit mode */}
                            {editingRxId ? (
                                <div style={{ padding: '10px' }} className="my-4 grid grid-cols-2 gap-3">
                                    <button onClick={handleSavePrescription} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '10px' }} className="w-full text-white text-sm font-bold rounded-lg shadow-md transition-all hover:opacity-90">Actualizar Receta</button>
                                    <button onClick={handleCancelEdit} style={{ backgroundColor: '#6b7280', color: 'white', padding: '10px' }} className="w-full text-white text-sm font-bold rounded-lg shadow-md transition-all hover:opacity-90">Cancelar</button>
                                </div>
                            ) : (
                                appointment && (
                                    <div style={{ padding: '10px' }} className="my-4">
                                        <button onClick={handleSavePrescription} style={{ backgroundColor: '#059669', color: 'white', padding: '10px' }} className="w-full text-white text-sm font-bold rounded-lg shadow-md transition-all hover:opacity-90">Generar Receta</button>
                                    </div>
                                )
                            )}

                            {/* Past Prescriptions */}
                            {prescriptions.length > 0 && <h6 style={{ marginBottom: '5px' }} className="text-xs font-bold text-gray-400 uppercase mt-6 mb-3">Histórico de Hoy</h6>}
                            {prescriptions.map(p => (
                                <div key={p.id} style={{ padding: '12px', marginBottom: '12px' }} className="bg-gray-50 rounded-xl border border-gray-200">
                                    <div style={{ paddingBottom: '8px', marginBottom: '8px' }} className="font-bold text-xs text-gray-500 border-b border-gray-200 flex justify-between">
                                        <span>RECETA #{p.id}</span>
                                        <div className="text-right">
                                            <div className="text-xs text-gray-400 font-normal">
                                                Registro: {new Date(p.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            </div>
                                            <div>
                                                Receta: {p.prescriptionDate ? p.prescriptionDate.split('-').reverse().join('/') : new Date().toLocaleDateString('es-ES', { timeZone: 'America/Lima' })}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '12px' }}>
                                        {JSON.parse(p.medications).map((m, k) => (
                                            <div key={k} style={{ paddingTop: '2px', paddingBottom: '2px' }} className="text-sm text-gray-700">• {m.name} <span className="opacity-60 text-xs">({m.dose})</span></div>
                                        ))}
                                        {p.instructions && (
                                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e5e7eb', fontSize: '11px', color: '#6b7280', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                "{p.instructions}"
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <button onClick={() => handleViewRx(p)} className="flex items-center justify-center gap-1 text-green-600 bg-green-50 hover:bg-green-100 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors">
                                            <FileText size={14} /> Ver
                                        </button>
                                        <button onClick={() => handlePrintRxNew(p)} className="flex items-center justify-center gap-1 text-blue-600 bg-blue-50 hover:bg-blue-100 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors">
                                            <Printer size={14} /> Imprimir
                                        </button>
                                        <button onClick={() => handleEditPrescription(p)} className="flex items-center justify-center gap-1 text-amber-600 bg-amber-50 hover:bg-amber-100 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors">
                                            <FileText size={14} /> Editar
                                        </button>
                                        <button onClick={() => handleDeletePrescription(p.id)} className="flex items-center justify-center gap-1 text-red-600 bg-red-50 hover:bg-red-100 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors">
                                            <Trash2 size={14} /> Borrar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Exams */}
                    <div onClick={(e) => { e.stopPropagation(); setActiveSection('exam'); }} className={`transition-all duration-300 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden min-h-0 ${activeSection === 'exam' ? 'flex-[3]' : (activeSection === 'rx' ? 'flex-1' : 'flex-1')}`}>
                        <div style={{ padding: '5px' }} className="bg-gray-50 border-b border-gray-100 text-sm font-bold text-purple-700 uppercase flex justify-between items-center gap-2 tracking-wide">
                            <div className="flex items-center gap-2">
                                <ClipboardList size={18} /> Exámenes
                            </div>
                            {selectedExams.length > 0 && (
                                <button onClick={(e) => { e.stopPropagation(); handlePrintExams(); }} style={{ backgroundColor: '#7c3aed', color: 'white', padding: '4px 12px' }} className="flex items-center gap-2 rounded-lg text-xs font-bold shadow-md transition-all mr-1 hover:opacity-90">
                                    <Printer size={16} /> Imprimir ({selectedExams.length})
                                </button>
                            )}
                        </div>
                        {appointment && (
                            <div style={{ padding: '5px' }} className="border-b border-gray-100 bg-gray-50/30 flex flex-col space-y-4">
                                <input className="input-field w-full text-base" style={{ marginBottom: '5px' }} placeholder="Tipo de Examen..." value={examData.type} onChange={e => setExamData({ ...examData, type: e.target.value })} />

                                {/* Médico Solicitante Field */}
                                <input
                                    className="input-field w-full text-sm"
                                    style={{ marginBottom: '5px' }}
                                    placeholder="Médico Solicitante (opcional)..."
                                    value={examData.doctorName || ''}
                                    onChange={e => setExamData({ ...examData, doctorName: e.target.value })}
                                />

                                {/* Date Field for Exams */}
                                <div className="flex gap-2 items-center" style={{ marginBottom: '5px' }}>
                                    <label className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Fecha de Orden:</label>
                                    <input
                                        type="date"
                                        className="input-field text-sm py-1 px-2 w-auto"
                                        value={examData.date || new Date().toISOString().split('T')[0]}
                                        onChange={e => setExamData({ ...examData, date: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-2 items-start">
                                    <div className="relative w-full">
                                        <textarea
                                            className="input-field w-full text-sm py-2 resize-none h-[100px]"
                                            placeholder="Indicacion clinica / detalles del examen..."
                                            value={examData.reason || ''}
                                            onChange={e => setExamData({ ...examData, reason: e.target.value })}
                                            maxLength={500}
                                        />
                                        <span style={{ position: 'absolute', bottom: '8px', right: '8px', fontSize: '0.7rem', color: (examData.reason?.length || 0) > 450 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                            {examData.reason?.length || 0}/500
                                        </span>
                                    </div>
                                    <button onClick={handleSaveExam} style={{ backgroundColor: '#7c3aed', color: 'white' }} className="p-3 rounded-lg shadow-sm transition-all hover:opacity-90 flex items-center justify-center"><Plus size={24} /></button>
                                </div>
                            </div>
                        )}
                        <div style={{ padding: '10px' }} className="flex-1 overflow-y-auto">
                            {/* Print Button Removed from here */}

                            {exams.length === 0 && <div className="text-center text-gray-400 text-sm mt-4 italic">Sin exámenes solicitados</div>}
                            {exams.map(e => {
                                const isSelected = selectedExams.includes(e.id);
                                return (
                                    <div key={e.id} onClick={() => toggleExamSelection(e.id)} className={`p-3 !mb-2 border rounded-lg shadow-sm cursor-pointer transition-all ${isSelected ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-300' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                                        <div className="flex justify-between items-start mb-2" style={{ padding: '5px' }}>
                                            <div className="flex items-start gap-3">
                                                {/* Checkbox Visual */}
                                                <div className={`mt-1 w-5 h-5 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-300'}`}>
                                                    {isSelected && <CheckCircle size={14} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-gray-800 break-words">{e.type}</div>
                                                    {e.reason && <div className="text-xs text-gray-500 italic mt-1 break-words leading-relaxed">{e.reason}</div>}
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        {e.doctorName && <div className="font-semibold text-gray-500 mb-0.5">Solicitado por: {e.doctorName}</div>}
                                                        <div>Registro: {new Date(e.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                                                        <div>Orden: {e.examDate ? e.examDate.split('-').reverse().join('/') : '-'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`flex-shrink-0 ml-2 px-2 py-1 rounded text-xs font-bold uppercase ${e.status === 'Resultados Listos' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {e.status}
                                            </div>
                                        </div>

                                        {/* Results List */}
                                        <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-gray-50 mb-1">
                                            {e.results.map((res, idx) => {
                                                const fileExists = res.fileExists !== false; // Default to true if undefined (legacy)
                                                return (
                                                    <div
                                                        key={res.id}
                                                        className={`flex items-center justify-between px-2 py-1.5 rounded border transition-colors ${fileExists ? 'bg-green-50/50 border-green-100 hover:bg-green-50' : 'bg-green-50/50 border-green-100 hover:bg-green-50'}`} // Always green for now
                                                        style={{ padding: '5px', margin: '0 5px' }} // Horizontal only, use gap for vertical
                                                        onClick={(ev) => {
                                                            ev.stopPropagation();
                                                            window.open(`http://${window.location.hostname}:5000/${res.filePath}`, '_blank');
                                                        }}
                                                        title="Clic para ver resultado"
                                                    >
                                                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                                                            <div className="flex-shrink-0 text-green-600">
                                                                <FileText size={14} />
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-xs font-medium text-gray-700 truncate hover:text-blue-600 hover:underline">
                                                                    {res.originalName || `Archivo ${idx + 1}`}
                                                                </span>
                                                                {res.note && <span className="text-[10px] text-gray-400 italic truncate">{res.note}</span>}
                                                                {!fileExists && <span className="text-[9px] text-red-500 font-bold uppercase">No encontrado</span>}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(ev) => { ev.stopPropagation(); handleDeleteResult(res.id); }}
                                                            className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                                                            title="Eliminar registro"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 mt-2 px-1" style={{ padding: '5px' }}>
                                            {/* Upload Button */}
                                            <button onClick={(ev) => { ev.stopPropagation(); setUploadExamId(e.id); }} className="flex items-center justify-center gap-1 text-blue-600 bg-blue-50 hover:bg-blue-100 py-1.5 rounded text-xs font-semibold transition-colors" title="Subir Resultados">
                                                <Upload size={14} /> Subir
                                            </button>

                                            {/* Edit Button */}
                                            <button onClick={(ev) => { ev.stopPropagation(); setEditExam(e); }} className="flex items-center justify-center gap-1 text-amber-600 bg-amber-50 hover:bg-amber-100 py-1.5 rounded text-xs font-semibold transition-colors" title="Editar">
                                                <Edit size={14} /> Editar
                                            </button>

                                            {/* Delete Button */}
                                            <button onClick={(ev) => { ev.stopPropagation(); handleDeleteExam(e.id); }} className="flex items-center justify-center gap-1 text-red-600 bg-red-50 hover:bg-red-100 py-1.5 rounded text-xs font-semibold transition-colors" title="Eliminar">
                                                <Trash2 size={14} /> Borrar
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* View Prescription Modal */}
            <Modal isOpen={!!viewRxModal} onClose={(e) => { e && e.stopPropagation && e.stopPropagation(); setViewRxModal(null); setActiveSection('rx'); }} title="Detalles de Receta">
                {viewRxModal && (
                    <div style={{ padding: '1.5rem' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--border)' }}>
                                <h4 style={{ fontWeight: 'bold', color: 'var(--text)' }}>Medicamentos</h4>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fecha: {viewRxModal.prescriptionDate || viewRxModal.date}</span>
                            </div>
                            {JSON.parse(viewRxModal.medications).length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {JSON.parse(viewRxModal.medications).map((med, idx) => (
                                        <div key={idx} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                            <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: 'var(--text)' }}>{med.name}</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                {med.dose && <div><strong>Dosis:</strong> {med.dose}</div>}
                                                {med.freq && <div><strong>Frecuencia:</strong> {med.freq}</div>}
                                                {med.duration && <div><strong>Duración:</strong> {med.duration}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin medicamentos</p>
                            )}
                        </div>

                        {viewRxModal.instructions && (
                            <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--border)', color: 'var(--text)' }}>Indicaciones / Observaciones</h4>
                                <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'var(--text)', padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                    {viewRxModal.instructions}
                                </p>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                            <button onClick={(e) => { e.stopPropagation(); setViewRxModal(null); setActiveSection('rx'); }} className="btn-secondary">Cerrar</button>
                            <button onClick={(e) => { e.stopPropagation(); handlePrintRxNew(viewRxModal); setViewRxModal(null); setActiveSection('rx'); }} className="btn-primary">Imprimir</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={deleteModalOpen} onClose={() => { setDeleteModalOpen(false); setRxToDelete(null); }} title="Confirmar Eliminación">
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <AlertCircle size={48} style={{ color: 'var(--danger)', margin: '0 auto 1rem' }} />
                    <p style={{ marginBottom: '1.5rem' }}>
                        ¿Estás seguro que deseas eliminar este registro? <br />
                        <strong>Esta acción no se puede deshacer.</strong>
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button onClick={() => { setDeleteModalOpen(false); setRxToDelete(null); }} className="btn-secondary">Cancelar</button>
                        <button onClick={confirmDeletePrescription} className="btn-primary" style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}>Eliminar</button>
                    </div>
                </div>
            </Modal>

            {/* Delete Exam Confirmation Modal */}
            <Modal isOpen={deleteExamModalOpen} onClose={() => { setDeleteExamModalOpen(false); setExamToDelete(null); }} title="Eliminar Examen">
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <AlertCircle size={48} style={{ color: 'var(--danger)', margin: '0 auto 1rem' }} />
                    <p style={{ marginBottom: '1.5rem' }}>
                        ¿Estás seguro que deseas eliminar este examen? <br />
                        <strong>Esta acción no se puede deshacer.</strong>
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button onClick={() => { setDeleteExamModalOpen(false); setExamToDelete(null); }} className="btn-secondary">Cancelar</button>
                        <button onClick={confirmDeleteExam} className="btn-primary" style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}>Eliminar</button>
                    </div>
                </div>
            </Modal>

            {/* Delete Result Confirmation Modal */}
            <Modal isOpen={!!resultToDelete} onClose={() => setResultToDelete(null)} title="Eliminar Archivo">
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <AlertCircle size={48} style={{ color: 'var(--danger)', margin: '0 auto 1rem' }} />
                    <p style={{ marginBottom: '1.5rem' }}>
                        ¿Estás seguro que deseas eliminar este archivo? <br />
                        <strong>Esta acción no se puede deshacer.</strong>
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button onClick={() => setResultToDelete(null)} className="btn-secondary">Cancelar</button>
                        <button onClick={confirmDeleteResult} className="btn-primary" style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}>Eliminar</button>
                    </div>
                </div>
            </Modal>

            {/* Edit Exam Modal */}
            <Modal isOpen={!!editExam} onClose={(e) => { if (e && e.stopPropagation) e.stopPropagation(); setEditExam(null); setActiveSection('exam'); }} title="Editar Examen">
                {editExam && (
                    <div style={{ padding: '1.5rem' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Tipo de Examen</label>
                            <input
                                type="text"
                                className="input-field w-full"
                                value={editExam.type}
                                onChange={e => setEditExam({ ...editExam, type: e.target.value })}
                            />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Motivo / Indicación</label>
                            <input
                                type="text"
                                className="input-field w-full"
                                value={editExam.reason || ''}
                                onChange={e => setEditExam({ ...editExam, reason: e.target.value })}
                            />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Médico Solicitante</label>
                            <input
                                type="text"
                                className="input-field w-full"
                                value={editExam.doctorName || ''}
                                onChange={e => setEditExam({ ...editExam, doctorName: e.target.value })}
                                placeholder="Nombre del médico que solicita el examen..."
                            />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Fecha</label>
                            <input
                                type="date"
                                className="input-field w-full"
                                value={editExam.examDate || new Date().toISOString().split('T')[0]}
                                onChange={e => setEditExam({ ...editExam, examDate: e.target.value })}
                            />
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Estado</label>
                            <select
                                className="input-field w-full"
                                value={editExam.status}
                                onChange={e => setEditExam({ ...editExam, status: e.target.value })}
                            >
                                <option value="Solicitado">Solicitado</option>
                                <option value="Realizado">Realizado</option>
                                <option value="Resultados Listos">Resultados Listos</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button onClick={(e) => { e.stopPropagation(); setEditExam(null); setActiveSection('exam'); }} className="btn-secondary">Cancelar</button>
                            <button onClick={() => handleUpdateExam(editExam.id, editExam)} className="btn-primary">Guardar Cambios</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Upload Result Modal */}
            <Modal isOpen={!!uploadExamId} onClose={(e) => { if (e && e.stopPropagation) e.stopPropagation(); setUploadExamId(null); setFileToUpload(null); setActiveSection('exam'); }} title="Subir Resultados">
                <div style={{ padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1.5rem', border: '2px dashed #ccc', padding: '2rem', textAlign: 'center', borderRadius: '0.5rem' }}>
                        <input
                            type="file"
                            accept=".pdf, .doc, .docx, .jpg, .jpeg, .png, .gif, .webp"
                            onChange={e => {
                                const file = e.target.files[0];
                                if (!file) return;

                                // Validate size (10MB)
                                if (file.size > 10 * 1024 * 1024) {
                                    showAlert('El archivo excede el límite de 10MB', 'error');
                                    e.target.value = null;
                                    return;
                                }

                                // Validate type
                                const validTypes = [
                                    'application/pdf',
                                    'application/msword',
                                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                    'image/jpeg', 'image/png', 'image/gif', 'image/webp'
                                ];

                                // Loose check for msword/office nuances or just rely on extension if type fails
                                const validExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
                                const fileExt = '.' + file.name.split('.').pop().toLowerCase();

                                if (!validTypes.includes(file.type) && !validExtensions.includes(fileExt)) {
                                    showAlert('Formato no soportado. Solo PDF, Word e Imágenes.', 'error');
                                    e.target.value = null;
                                    return;
                                }

                                setFileToUpload(file);
                            }}
                            style={{ display: 'none' }}
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <Upload size={32} color="#666" />
                            <span style={{ color: '#007bff', fontWeight: 'bold' }}>
                                {fileToUpload ? fileToUpload.name : 'Click para seleccionar archivo'}
                            </span>
                        </label>
                        <p style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: '1rem', textAlign: 'center', fontWeight: '500' }}>
                            Permitidos: PDF, Word, Imágenes (Max 10MB)
                        </p>
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Nota (Opcional)</label>
                        <input
                            type="text"
                            className="input-field w-full"
                            placeholder="Ej: Resultados preliminares..."
                            value={uploadNote}
                            onChange={e => setUploadNote(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button onClick={(e) => { e.stopPropagation(); setUploadExamId(null); setFileToUpload(null); setActiveSection('exam'); }} className="btn-secondary">Cancelar</button>
                        <button onClick={handleFileUpload} disabled={!fileToUpload} className="btn-primary">Subir Archivo</button>
                    </div>
                </div>
            </Modal>

            <TriageModal isOpen={triageModalOpen} onClose={() => setTriageModalOpen(false)} onSave={handleTriage} initialData={triage} patientName={patient.fullName} />

            {/* Finish Attention Confirmation Modal */}
            <Modal
                isOpen={finishModalOpen}
                onClose={() => setFinishModalOpen(false)}
                title="Finalizar Atención"
            >
                <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ background: '#f0fdf4', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <CheckCircle size={32} color="#16a34a" />
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>¿Confirmar finalización?</h3>
                    <p style={{ color: '#6b7280', marginBottom: '2rem', lineHeight: '1.5' }}>
                        Se guardará el diagnóstico actual y la cita se marcará como <strong>Realizada</strong>.
                        Ya no se podrán realizar más cambios después de esto.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button
                            onClick={() => setFinishModalOpen(false)}
                            className="btn-secondary"
                            style={{ padding: '0.6rem 2rem' }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmFinish}
                            className="btn-primary"
                            style={{ padding: '0.6rem 2rem', backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                        >
                            Sí, Finalizar
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={historyModalOpen}
                onClose={() => { setHistoryModalOpen(false); setHistoryError(''); }}
                title="Imprimir Historia Clínica"
            >
                <div className="space-y-6">
                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Fecha Inicio</label>
                            <input
                                type="date"
                                className="input-field w-full"
                                value={historyStartDate}
                                onChange={e => { setHistoryStartDate(e.target.value); setHistoryError(''); }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Fecha Fin</label>
                            <input
                                type="date"
                                className="input-field w-full"
                                value={historyEndDate}
                                onChange={e => { setHistoryEndDate(e.target.value); setHistoryError(''); }}
                            />
                        </div>
                    </div>

                    {historyError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-pulse">
                            <AlertCircle size={20} className="flex-none" />
                            <span className="text-sm font-bold">{historyError}</span>
                        </div>
                    )}

                    {/* Content Filters */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">Contenido a Incluir</label>
                        <div className="flex flex-wrap gap-3">
                            <label
                                className="flex items-center gap-2 cursor-not-allowed opacity-70 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold select-none"
                                style={{ padding: '5px' }}
                            >
                                <input type="checkbox" checked={true} disabled className="accent-blue-600 w-4 h-4" />
                                Historia Clínica
                            </label>
                            <label
                                className="flex items-center gap-2 cursor-pointer bg-blue-50/30 border border-blue-100 hover:border-blue-300 rounded-lg text-sm font-bold transition-all select-none"
                                style={{ padding: '5px' }}
                            >
                                <input
                                    type="checkbox"
                                    checked={printIncludeDiagnosis}
                                    onChange={e => setPrintIncludeDiagnosis(e.target.checked)}
                                    className="accent-blue-600 w-4 h-4"
                                />
                                Diagnóstico
                            </label>
                            <label
                                className="flex items-center gap-2 cursor-pointer bg-blue-50/30 border border-blue-100 hover:border-blue-300 rounded-lg text-sm font-bold transition-all select-none"
                                style={{ padding: '5px' }}
                            >
                                <input
                                    type="checkbox"
                                    checked={printIncludeRx}
                                    onChange={e => setPrintIncludeRx(e.target.checked)}
                                    className="accent-blue-600 w-4 h-4"
                                />
                                Recetas
                            </label>
                            <label
                                className="flex items-center gap-2 cursor-pointer bg-blue-50/30 border border-blue-100 hover:border-blue-300 rounded-lg text-sm font-bold transition-all select-none"
                                style={{ padding: '5px' }}
                            >
                                <input
                                    type="checkbox"
                                    checked={printIncludeExams}
                                    onChange={e => setPrintIncludeExams(e.target.checked)}
                                    className="accent-blue-600 w-4 h-4"
                                />
                                Exámenes
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                        <button
                            onClick={() => setHistoryModalOpen(false)}
                            className="rounded-lg transition-colors font-bold flex items-center"
                            style={{ marginTop: '15px', padding: '10px 15px', gap: '8px', backgroundColor: 'rgb(254, 242, 242)', color: 'rgb(153, 27, 27)', border: '1px solid rgb(254, 202, 202)' }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handlePrintHistory}
                            disabled={!historyStartDate || !historyEndDate}
                            className="rounded-lg transition-all font-bold shadow-sm flex items-center"
                            style={{
                                marginTop: '15px',
                                padding: '10px 15px', gap: '8px',
                                backgroundColor: (!historyStartDate || !historyEndDate) ? '#f3f4f6' : 'rgb(240, 253, 244)',
                                color: (!historyStartDate || !historyEndDate) ? '#9ca3af' : 'rgb(22, 101, 52)',
                                border: (!historyStartDate || !historyEndDate) ? '1px solid #d1d5db' : '1px solid rgb(187, 247, 208)',
                                cursor: (!historyStartDate || !historyEndDate) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <Printer size={18} />
                            Imprimir
                        </button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default Atencion;


