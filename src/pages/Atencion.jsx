import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FileText, Activity, Save, CheckCircle,
    ArrowLeft, Stethoscope, Pill, ClipboardList, AlertCircle,
    Calendar, User, Clock, Plus, Trash2, X, Printer, Edit, Upload, Eye, CalendarClock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/data';
import { showAlert } from '../utils/alerts';
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
                    // Redirect to the proper URL with the appointment ID
                    navigate(`/atencion/${latestId}`, { replace: true });
                    return; // CRITICAL: Stop execution here. The navigate will trigger a new loadData call with the correct ID.
                } else {
                    showAlert('El paciente no tiene citas registradas.', 'warning');
                    navigate(`/pacientes/${patientId}`);
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
            const API_HOST = `http://${window.location.hostname}:5000`;
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
                    @page { size: landscape; margin: 0; }
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Arial', sans-serif; color: #000; font-size: 10pt; line-height: 1.25; }
                    .page-container { width: 100vw; height: 100vh; display: grid; grid-template-columns: 1fr 1fr; page-break-after: always; }
                    .exam-half { padding: 10mm; border-right: 1px dashed #999; display: flex; flex-direction: column; position: relative; }
                    .exam-half:last-child { border-right: none; }
                    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 8px; }
                    .doctor-name { font-family: 'Georgia', 'Times New Roman', serif; font-size: 14pt; font-weight: bold; margin-bottom: 2px; letter-spacing: 0.5px; }
                    .specialty { font-size: 10pt; font-weight: bold; margin-bottom: 1px; }
                    .registration { font-size: 8pt; margin-bottom: 1px; }
                    .specialty-desc { font-size: 8pt; font-weight: bold; margin-bottom: 4px; }
                    .office-info { display: grid; grid-template-columns: auto 1fr auto; gap: 10px; font-size: 7pt; align-items: center; margin-top: 4px; }
                    .office-left { text-align: left; }
                    .office-center { text-align: center; }
                    .office-right { text-align: right; }
                    .patient-info { background: #f0f0f0; padding: 5px 8px; margin-bottom: 8px; border: 1px solid #999; font-size: 8pt; }
                    .content-area { border: 2px solid #000; padding: 12px; flex: 1; position: relative; overflow: hidden; min-height: 200px; max-height: 530px; display: flex; flex-direction: column; }
                    .content-area::before { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 200px; height: 200px; background-image: url('${logoUrl}'); background-size: contain; background-repeat: no-repeat; background-position: center; opacity: 0.06; z-index: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .content-area > * { position: relative; z-index: 1; }
                    .content-title { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 5px; padding-bottom: 4px; border-bottom: 1px solid #000; text-transform: uppercase; }
                    .exam-details { font-size: 11pt; line-height: 1.4; white-space: pre-wrap; text-align: left; padding-top: 5px; }
                    .exam-type { font-weight: bold; font-size: 12pt; margin-bottom: 5px; text-decoration: underline; text-align: center; }
                    .signature-area { margin-top: 50px; text-align: right; }
                    .signature-box { display: inline-block; border-top: 1px solid #000; min-width: 200px; text-align: center; padding-top: 4px; font-size: 8pt; }
                    @media print { body { -webkit-print-color-adjust: exact; } }
                </style>
            `;

            const pagesHtml = pages.map(pageExams => `
                <div class="page-container">
                    ${pageExams.map(ex => {
                const exDate = ex.examDate ? ex.examDate.split('-').reverse().join('/') : formattedDate;
                return `
                        <div class="exam-half">
                            <div class="header"><div class="doctor-name">Lucrecia Compén Kong</div><div class="specialty">MÉDICO NEURÓLOGO</div><div class="registration">C.M.P. 10837 - R.N.E. 3407</div><div class="specialty-desc">ENFERMEDADES DEL SISTEMA NERVIOSO</div><div class="office-info"><div class="office-left"><strong>Consultorio:</strong><br>Bolívar 276 - Of. 101<br>📞 44 308318 - 949099550</div><div class="office-center"><strong>Lunes a Viernes</strong><br>10 a.m a 1 p.m<br>4 p.m a 8 p.m</div><div class="office-right"><strong>Trujillo</strong><br>Sábados<br>Previa Cita</div></div></div>
                            <div class="patient-info"><strong>Paciente:</strong> ${pName} (${age} años)<br><strong>Fecha Orden:</strong> ${exDate}</div>
                            <div class="content-area">
                                <div class="content-title">Orden de Examen</div>
                                <div class="exam-details">
                                    <div class="exam-type">${ex.type}</div>
                                    <div>${(ex.reason || '').trim().replace(/\n\s*\n/g, '\n')}</div>
                                </div>
                                <div class="signature-area"><div class="signature-box"><strong>Firma y Sello</strong><br><small>Dra. Lucrecia Compén Kong</small><br><small>C.M.P. 10837</small></div></div>
                            </div>
                        </div>
                    `}).join('')}
                    ${pageExams.length === 1 ? '<div class="exam-half" style="border:none;"></div>' : ''}
                </div>
            `).join('');

            printWindow.document.write(`<html><head><title>Orden de Examen</title>${styles}</head><body>${pagesHtml}</body></html>`);
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
            const API_HOST = `http://${window.location.hostname}:5000`;
            const printWindow = window.open('', '_blank');
            const logoUrl = settings.logoUrl ? `${API_HOST}/${settings.logoUrl}` : '';

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
                        @page { size: landscape; margin: 0; }
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: 'Arial', sans-serif; color: #000; font-size: 10pt; line-height: 1.25; }
                        .page-grid { display: grid; grid-template-columns: 1fr 1fr; min-height: 100vh; }
                        .half-page { padding: 10mm; border-right: 1px dashed #999; display: flex; flex-direction: column; }
                        .half-page:last-child { border-right: none; }
                        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 8px; }
                        .doctor-name { font-family: 'Georgia', 'Times New Roman', serif; font-size: 14pt; font-weight: bold; margin-bottom: 2px; letter-spacing: 0.5px; }
                        .specialty { font-size: 10pt; font-weight: bold; margin-bottom: 1px; }
                        .registration { font-size: 8pt; margin-bottom: 1px; }
                        .specialty-desc { font-size: 8pt; font-weight: bold; margin-bottom: 4px; }
                        .office-info { display: grid; grid-template-columns: auto 1fr auto; gap: 10px; font-size: 7pt; align-items: center; margin-top: 4px; }
                        .office-left { text-align: left; }
                        .office-center { text-align: center; }
                        .office-right { text-align: right; }
                        .patient-info { background: #f0f0f0; padding: 5px 8px; margin-bottom: 8px; border: 1px solid #999; font-size: 8pt; }
                        .content-area { border: 2px solid #000; padding: 12px; flex: 1; position: relative; overflow: hidden; min-height: 200px; max-height: 530px; }
                        .content-area::before { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 200px; height: 200px; background-image: url('${logoUrl}'); background-size: contain; background-repeat: no-repeat; background-position: center; opacity: 0.06; z-index: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .content-area > * { position: relative; z-index: 1; }
                        .content-title { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #000; }
                        .med-list { list-style: none; padding: 0; }
                        .med-item { margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px dotted #ccc; }
                        .med-item:last-child { border-bottom: none; }
                        .med-name { font-weight: bold; font-size: 10pt; display: block; margin-bottom: 2px; }
                        .med-details { font-size: 8pt; color: #333; margin-left: 6px; }
                        .instructions-content { font-size: 9pt; line-height: 1.4; white-space: pre-line; word-wrap: break-word; }
                        .signature-area { margin-top: auto; padding-top: 100px; text-align: right; }
                        .signature-box { display: inline-block; border-top: 1px solid #000; min-width: 200px; text-align: center; padding-top: 4px; font-size: 8pt; }
                        @media print { @page { margin: 0; size: landscape; } body { margin: 0; padding: 0; } }
                    </style>
                </head>
                <body>
                    <div class="page-grid">
                        <!-- LEFT: MEDICATIONS -->
                        <div class="half-page">
                            <div class="header"><div class="doctor-name">Lucrecia Compén Kong</div><div class="specialty">MÉDICO NEURÓLOGO</div><div class="registration">C.M.P. 10837 - R.N.E. 3407</div><div class="specialty-desc">ENFERMEDADES DEL SISTEMA NERVIOSO</div><div class="office-info"><div class="office-left"><strong>Consultorio:</strong><br>Bolívar 276 - Of. 101<br>📞 44 308318 - 949099550</div><div class="office-center"><strong>Lunes a Viernes</strong><br>10 a.m a 1 p.m<br>4 p.m a 8 p.m</div><div class="office-right"><strong>Trujillo</strong><br>Sábados<br>Previa Cita</div></div></div>
                            <div class="patient-info"><strong>Paciente:</strong> ${pName}<br><strong>Fecha:</strong> ${formattedDate}</div>
                            <div class="content-area">
                                <div class="content-title">Rp.</div>
                                <ul class="med-list">
                                    ${JSON.parse(rx.medications || '[]').map(m => `
                                        <li class="med-item"><span class="med-name">${m.name} ${m.dose || ''}</span><div class="med-details">${m.freq || ''}</div></li>
                                    `).join('')}
                                </ul>
                                <div class="signature-area"><div class="signature-box"><strong>Firma y Sello</strong><br><small>Dra. Lucrecia Compén Kong</small><br><small>C.M.P. 10837</small></div></div>
                            </div>
                        </div>
                        
                        <!-- RIGHT: INSTRUCTIONS -->
                        <div class="half-page">
                            <div class="header"><div class="doctor-name">Lucrecia Compén Kong</div><div class="specialty">MÉDICO NEURÓLOGO</div><div class="registration">C.M.P. 10837 - R.N.E. 3407</div><div class="specialty-desc">ENFERMEDADES DEL SISTEMA NERVIOSO</div><div class="office-info"><div class="office-left"><strong>Consultorio:</strong><br>Bolívar 276 - Of. 101<br>📞 44 308318 - 949099550</div><div class="office-center"><strong>Lunes a Viernes</strong><br>10 a.m a 1 p.m<br>4 p.m a 8 p.m</div><div class="office-right"><strong>Trujillo</strong><br>Sábados<br>Previa Cita</div></div></div>
                            <div class="patient-info"><strong>Paciente:</strong> ${pName}<br><strong>Fecha:</strong> ${formattedDate}</div>
                            <div class="content-area">
                                <div class="content-title">Indicaciones</div>
                                <div class="instructions-content">${(rx.instructions || '').trim()}</div>
                                <div class="signature-area"><div class="signature-box"><strong>Firma y Sello</strong><br><small>Dra. Lucrecia Compén Kong</small><br><small>C.M.P. 10837</small></div></div>
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

    if (loading || !appointment) return <div className="h-screen flex items-center justify-center text-gray-500 font-medium text-lg">Cargando datos...</div>;

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
                                                <Clock size={12} /> {appt.time}
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
                            <span className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide"><FileText size={18} className="text-blue-600" /> Evolución Clínica</span>
                            <div className="flex gap-2">
                                {historyId && !editingHistory && (
                                    <button onClick={(e) => { e.stopPropagation(); setEditingHistory(true); }} className="text-amber-600 hover:text-amber-800 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded hover:bg-amber-50 transition-colors flex items-center gap-1">
                                        <Edit size={14} /> Editar
                                    </button>
                                )}
                                {(editingHistory || !historyId) && (
                                    <button onClick={handleSaveHistory} className="text-blue-600 hover:text-blue-800 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded hover:bg-blue-50 transition-colors">
                                        {historyId ? 'Actualizar' : 'Guardar'}
                                    </button>
                                )}
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
                                readOnly={!!(historyId && !editingHistory)}
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
                                {diagnosisText && !editingDiagnosis && (
                                    <button onClick={(e) => { e.stopPropagation(); setEditingDiagnosis(true); }} className="text-amber-700 hover:text-amber-900 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded hover:bg-amber-100 transition-colors flex items-center gap-1">
                                        <Edit size={14} /> Editar
                                    </button>
                                )}
                                {(editingDiagnosis || !diagnosisText) && (
                                    <button onClick={handleSaveDiagnosis} className="text-amber-700 hover:text-amber-900 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded hover:bg-amber-100 transition-colors">
                                        {diagnosisText ? 'Actualizar' : 'Guardar'}
                                    </button>
                                )}
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
                                readOnly={!!(diagnosisText && !editingDiagnosis)}
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

                    {/* Prescriptions */}
                    <div onClick={(e) => { e.stopPropagation(); setActiveSection('rx'); }} className={`transition-all duration-300 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden min-h-0 ${activeSection === 'rx' ? 'flex-[3]' : (activeSection === 'exam' ? 'flex-1' : 'flex-1')}`}>
                        <div style={{ padding: '5px' }} className="bg-gray-50 border-b border-gray-100 text-sm font-bold text-emerald-700 uppercase flex items-center gap-2 tracking-wide">
                            <Pill size={18} /> Recetas
                        </div>

                        {/* New Rx Input */}
                        <div style={{ padding: '8px' }} className="border-b border-gray-100 bg-gray-50/30 space-y-4">
                            <input className="input-field w-full text-base" style={{ marginBottom: '10px' }} placeholder="Medicamento..." value={newMed.name} onChange={e => setNewMed({ ...newMed, name: e.target.value })} />
                            <div className="flex gap-2">
                                <input className="input-field w-1/3 text-sm py-2" placeholder="Dosis (ej: 500mg)" value={newMed.dose} onChange={e => setNewMed({ ...newMed, dose: e.target.value })} />
                                <input className="input-field w-1/3 text-sm py-2" placeholder="Frecuencia (ej: 8h)" value={newMed.freq} onChange={e => setNewMed({ ...newMed, freq: e.target.value })} />
                                <input className="input-field w-1/3 text-sm py-2" placeholder="Duración (ej: 5 días)" value={newMed.duration} onChange={e => setNewMed({ ...newMed, duration: e.target.value })} />
                                <button onClick={handleAddMedication} style={{ backgroundColor: '#059669', color: 'white', padding: '10px' }} className="rounded-lg shadow-sm mb-[2px] transition-all hover:opacity-90 flex-shrink-0"><Plus size={20} /></button>
                            </div>
                        </div>

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

                            <div className="mb-4">
                                <label style={{ marginBottom: '5px' }} className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Fecha de Receta</label>
                                <input
                                    type="date"
                                    className="input-field w-full text-sm py-2"
                                    value={rxData.date}
                                    onChange={e => setRxData(prev => ({ ...prev, date: e.target.value }))}
                                />
                            </div>

                            {/* Button changes based on edit mode */}
                            {editingRxId ? (
                                <div style={{ padding: '10px' }} className="my-4 grid grid-cols-2 gap-3">
                                    <button onClick={handleSavePrescription} style={{ backgroundColor: '#f59e0b', color: 'white', padding: '10px' }} className="w-full text-white text-sm font-bold rounded-lg shadow-md transition-all hover:opacity-90">Actualizar Receta</button>
                                    <button onClick={handleCancelEdit} style={{ backgroundColor: '#6b7280', color: 'white', padding: '10px' }} className="w-full text-white text-sm font-bold rounded-lg shadow-md transition-all hover:opacity-90">Cancelar</button>
                                </div>
                            ) : (
                                <div style={{ padding: '10px' }} className="my-4">
                                    <button onClick={handleSavePrescription} style={{ backgroundColor: '#059669', color: 'white', padding: '10px' }} className="w-full text-white text-sm font-bold rounded-lg shadow-md transition-all hover:opacity-90">Generar Receta</button>
                                </div>
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
                                        {e.results && e.results.length > 0 && (
                                            <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-gray-50 mb-2">
                                                {e.results.map((res, idx) => (
                                                    <div
                                                        key={res.id}
                                                        className="flex items-center justify-between bg-green-50 px-3 py-2 rounded-lg border border-green-200 shadow-sm cursor-pointer hover:bg-green-100 transition-colors"
                                                        style={{ padding: '5px' }}
                                                        onClick={(ev) => { ev.stopPropagation(); window.open(`http://${window.location.hostname}:5000/${res.filePath}`, '_blank'); }}
                                                    >
                                                        <div className="flex flex-col overflow-hidden mr-2">
                                                            <div className="flex items-center gap-1 text-xs font-bold text-green-700 truncate">
                                                                <Eye size={12} /> Archivo {idx + 1}
                                                            </div>
                                                            {res.note && <span className="text-[10px] text-gray-500 italic truncate" title={res.note}>{res.note}</span>}
                                                        </div>
                                                        <button
                                                            onClick={(ev) => { ev.stopPropagation(); handleDeleteResult(res.id); }}
                                                            className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors"
                                                            title="Eliminar archivo"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-3 gap-2 mt-1" style={{ padding: '5px' }}>
                                            {/* Upload Button */}
                                            <button onClick={(ev) => { ev.stopPropagation(); setUploadExamId(e.id); }} className="flex items-center justify-center gap-1 text-blue-600 bg-blue-50 hover:bg-blue-100 py-3 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors" title="Subir Resultados">
                                                <Upload size={14} /> Subir
                                            </button>

                                            {/* Edit Button */}
                                            <button onClick={(ev) => { ev.stopPropagation(); setEditExam(e); }} className="flex items-center justify-center gap-1 text-amber-600 bg-amber-50 hover:bg-amber-100 py-3 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors" title="Editar">
                                                <Edit size={14} /> Editar
                                            </button>

                                            {/* Delete Button */}
                                            <button onClick={(ev) => { ev.stopPropagation(); handleDeleteExam(e.id); }} className="flex items-center justify-center gap-1 text-red-600 bg-red-50 hover:bg-red-100 py-3 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors" title="Eliminar">
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
                            onChange={e => setFileToUpload(e.target.files[0])}
                            style={{ display: 'none' }}
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <Upload size={32} color="#666" />
                            <span style={{ color: '#007bff', fontWeight: 'bold' }}>
                                {fileToUpload ? fileToUpload.name : 'Click para seleccionar archivo'}
                            </span>
                        </label>
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

        </div>
    );
};

export default Atencion;


