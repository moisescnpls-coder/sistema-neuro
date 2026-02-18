import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Activity, Printer, Search, Plus, Trash2, Upload, Eye, File, Edit, AlertCircle, History, User, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/data';
import { showAlert } from '../utils/alerts';
import Modal from '../components/Modal';

import { useLocation } from 'react-router-dom';
// ... imports

const Clinico = () => {
    const navigate = useNavigate();
    const location = useLocation();
    // Context State
    const { hasPermission, isAdmin, user } = useAuth();
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [activeTab, setActiveTab] = useState('recetas');

    // Delete/Edit State
    const [deleteModal, setDeleteModal] = useState({ open: false, type: null, id: null, item: null });
    const [editExam, setEditExam] = useState(null); // For editing status/notes

    // Search State
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showPatientList, setShowPatientList] = useState(false);

    // Prescription State
    // Prescription State
    const [prescriptions, setPrescriptions] = useState([]);
    const [currentRx, setCurrentRx] = useState({
        medications: [],
        instructions: ''
    });
    const [editingRxId, setEditingRxId] = useState(null); // ID of prescription being edited
    const [prescriptionDate, setPrescriptionDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD format
    const [newMed, setNewMed] = useState({ name: '', dose: '', freq: '', duration: '' });

    // Exams State
    const [exams, setExams] = useState([]);
    const [newExam, setNewExam] = useState({ type: '', reason: '' });
    const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [uploadExamId, setUploadExamId] = useState(null);
    const [fileToUpload, setFileToUpload] = useState(null);
    const [uploadNote, setUploadNote] = useState('');
    const [usePrePrinted, setUsePrePrinted] = useState(false); // Toggle for letterhead printing

    useEffect(() => {
        if (!isAdmin() && !hasPermission('view_clinical')) {
            showAlert('Acceso denegado a módulo clínico', 'error');
            navigate('/pacientes');
        }
    }, [isAdmin, hasPermission, navigate]);

    useEffect(() => {
        loadPatients();
    }, []);

    // Handle navigation state
    useEffect(() => {
        if (patients.length > 0 && location.state?.patientId) {
            const p = patients.find(pat => pat.id === location.state.patientId);
            if (p) {
                // Determine tab from action or default to recetas
                const targetTab = location.state.action === 'exam' ? 'examenes' : 'recetas';
                setActiveTab(targetTab);
                handleSelectPatient(p);
                // Clear state properly
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [patients, location.state, navigate, location.pathname]);

    useEffect(() => {
        if (selectedPatient) {
            loadPatientData(selectedPatient.id);
        }
    }, [selectedPatient]);

    const loadPatients = async () => {
        const data = await dataService.getPatients();
        setPatients(data);
    };

    const loadPatientData = async (id) => {
        const rx = await dataService.getPrescriptions(id);
        const ex = await dataService.getExams(id);
        setPrescriptions(rx);
        setExams(ex);
    };

    // Patient Selection
    const filteredPatients = patients.filter(p =>
        (p.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.dni || '').includes(searchTerm)
    );

    const handleSelectPatient = (patient) => {
        setSelectedPatient(patient);
        setSearchTerm(patient.fullName || patient.firstName);
        setShowPatientList(false);
    };

    // Prescription Logic
    const addMedication = () => {
        if (!newMed.name) return;
        setCurrentRx({
            ...currentRx,
            medications: [...currentRx.medications, newMed]
        });
        setNewMed({ name: '', dose: '', freq: '', duration: '' });
    };

    const removeMedication = (index) => {
        const updated = [...currentRx.medications];
        updated.splice(index, 1);
        setCurrentRx({ ...currentRx, medications: updated });
    };

    const savePrescription = async () => {
        // Validate that there's at least medications OR instructions
        if (currentRx.medications.length === 0 && !currentRx.instructions.trim()) {
            return showAlert('Agregue medicamentos o instrucciones adicionales', 'error');
        }

        try {
            if (editingRxId) {
                // Update implementation
                await dataService.updatePrescription(editingRxId, {
                    medications: currentRx.medications,
                    instructions: currentRx.instructions,
                    prescriptionDate: prescriptionDate
                });
                showAlert('Receta actualizada correctamente', 'success');
                setEditingRxId(null);
            } else {
                // Create implementation
                await dataService.savePrescription({
                    patientId: selectedPatient.id,
                    medications: currentRx.medications,
                    instructions: currentRx.instructions,
                    prescriptionDate: prescriptionDate
                });
                showAlert('Receta guardada correctamente', 'success');
            }

            setCurrentRx({ medications: [], instructions: '' });
            loadPatientData(selectedPatient.id);
        } catch (error) {
            showAlert('Error al guardar receta', 'error');
        }
    };

    // Exam Logic
    const saveExamRequest = async () => {
        if (!newExam.type) return showAlert('Seleccione un tipo de examen', 'error');

        try {
            await dataService.saveExam({
                patientId: selectedPatient.id,
                type: newExam.type,
                reason: newExam.reason,
                examDate: examDate // Send the selected date
            });
            showAlert('Solicitud de examen creada', 'success');
            setNewExam({ type: '', reason: '' });
            loadPatientData(selectedPatient.id);
        } catch (error) {
            showAlert('Error al solicitar examen', 'error');
        }
    };

    const handleFileUpload = async () => {
        if (!fileToUpload || !uploadExamId) return;
        try {
            await dataService.uploadExamResult(uploadExamId, fileToUpload, uploadNote);
            showAlert('Resultados subidos correctamente', 'success');
            setUploadExamId(null);
            setFileToUpload(null);
            setUploadNote('');
            loadPatientData(selectedPatient.id);
        } catch (error) {
            showAlert('Error al subir archivo', 'error');
        }
    };

    // --- Handlers for Deletion and Editing ---
    const handleDeleteInit = (type, item) => {
        setDeleteModal({ open: true, type, id: item.id, item });
    };

    const handleConfirmDelete = async () => {
        try {
            if (deleteModal.type === 'prescription') {
                await dataService.deletePrescription(deleteModal.id);
                setPrescriptions(prev => prev.filter(p => p.id !== deleteModal.id));
                showAlert('Receta eliminada', 'success');
            } else if (deleteModal.type === 'exam') {
                await dataService.deleteExam(deleteModal.id);
                setExams(prev => prev.filter(e => e.id !== deleteModal.id));
                showAlert('Examen eliminado', 'success');
            } else if (deleteModal.type === 'exam-result') {
                await dataService.deleteExamResult(deleteModal.id);
                showAlert('Archivo eliminado', 'success');
                loadPatientData(selectedPatient.id);
            }
            setDeleteModal({ open: false, type: null, id: null, item: null });
        } catch (error) {
            showAlert('Error al eliminar: ' + error.message, 'error');
        }
    };

    const handleUpdateExam = async (id, status) => {
        try {
            await dataService.updateExam(id, { status });
            setExams(prev => prev.map(e => e.id === id ? { ...e, status } : e));
            showAlert('Estado actualizado', 'success');
        } catch (error) {
            showAlert('Error actualizando examen', 'error');
        }
    };



    const handleEditRx = (rx) => {
        setEditingRxId(rx.id);
        setCurrentRx({
            medications: rx.medications,
            instructions: rx.instructions || ''
        });
        // Set date if available, otherwise default to registration date or today
        setPrescriptionDate(rx.prescriptionDate || rx.date || new Date().toISOString().split('T')[0]);
        setActiveTab('recetas');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEditRx = () => {
        setEditingRxId(null);
        setCurrentRx({ medications: [], instructions: '' });
    };

    const handlePrintRx = async (rx) => {
        try {
            const settings = await dataService.getSettings();
            const API_HOST = `http://${window.location.hostname}:5000`;
            const printWindow = window.open('', '', 'height=800,width=1200');

            const logoUrl = settings.logoUrl ? `${API_HOST}/${settings.logoUrl}` : '';

            const content = `
                <html>
                <head>
                    <title></title>
                    <style>
                        @page { 
                            size: 21.59cm 22.5cm;
                            margin: 0;
                        }
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        body { 
                            font-family: 'Calibri', sans-serif;
                            color: #2F5496;
                            font-size: 10pt;
                            line-height: 1.15;
                        }
                        
                        /* Two Column Layout - Each independent */
                        .page-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            min-height: 100vh;
                        }
                        
                        .half-page {
                            padding: 8mm 10mm 10mm 10mm;
                            border-right: 1px dashed #999;
                            display: flex;
                            flex-direction: column;
                        }
                        
                        .half-page:last-child {
                            border-right: none;
                        }
                        
                        /* Header (repeated on both sides) */
                        .header { 
                            text-align: center;
                            /* border-bottom removed */
                            margin-bottom: 2px;
                        }
                        
                        /* Double line separator */
                        .header-line {
                            height: 4px;
                            border-top: 2px solid #2F5496;
                            border-bottom: 1px solid #2F5496;
                            margin-bottom: 10px;
                        }
                        
                        .doctor-name {
                            font-family: 'Brush Script MT', cursive;
                            font-size: 26pt;
                            color: #2F5496;
                            margin-bottom: 2px;
                            line-height: 1.2;
                            font-weight: bold;
                        }
                        .specialty {
                            font-family: 'Calibri', sans-serif;
                            font-size: 11pt;
                            color: #2F5496;
                            margin-bottom: 1px;
                            font-weight: bold;
                        }
                        .registration {
                            font-family: 'Calibri', sans-serif;
                            font-size: 11pt;
                            color: #2F5496;
                            margin-bottom: 1px;
                            font-weight: bold;
                        }
                        .specialty-desc {
                            font-family: 'Arial', sans-serif;
                            font-weight: bold;
                            font-size: 11pt;
                            color: #2F5496;
                            margin-bottom: 8px;
                        }
                        .office-info {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 10px;
                            font-family: 'Calibri', sans-serif;
                            font-size: 9pt;
                            color: #2F5496;
                            align-items: start;
                            margin-top: 4px;
                            text-align: left;
                            font-weight: bold;
                        }
                        .office-column {
                            display: flex;
                            flex-direction: column;
                        }
                        .office-column.right {
                            text-align: right;
                        }
                        .office-label {
                            font-weight: bold;
                        }
                        
                        /* Patient Info - Transparent, bold, no border */
                        .patient-info { 
                            background: transparent;
                            padding: 0;
                            margin-bottom: 10px;
                            border: none;
                            font-size: 9pt;
                            color: #000;
                            font-weight: bold;
                            font-family: 'Calibri', sans-serif;
                        }
                        .patient-info strong { font-weight: bold; }
                        
                        /* Content Area - No border, more up */
                        .content-area {
                            border: none;
                            padding: 0 12px 12px 12px;
                            flex: 1;
                            position: relative;
                            overflow: hidden;
                            min-height: 200px;
                            max-height: 480px; /* Enforced limit based on page height */
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
                            margin-bottom: 5px;
                            padding-left: 0;
                        }
                        
                        .exam-content {
                            font-size: 9pt;
                            line-height: 1.4;
                            white-space: pre-line;
                            margin-top: 10px;
                        }
                        
                        /* Medications List - Compact */
                        .med-list {
                            list-style: none;
                            padding: 0;
                        }
                        .med-item {
                            margin-bottom: 6px;
                            padding-bottom: 4px;
                            border-bottom: 1px dotted #ccc;
                        }
                        .med-item:last-child {
                            border-bottom: none;
                        }
                        .med-name {
                            font-weight: bold;
                            font-size: 10pt;
                            display: block;
                            margin-bottom: 1px;
                        }
                        .med-details {
                            font-size: 8pt;
                            color: #333;
                            margin-left: 6px;
                        }

                        /* Instructions */
                        .instructions-content {
                            font-size: 9pt;
                            line-height: 1.4;
                            white-space: pre-line;
                            padding: 0 !important;
                            margin: 0 !important;
                            text-align: left !important;
                        }

                        /* Signature - Dynamic position, Black */
                        .signature-area {
                            margin-top: 40px;
                            text-align: right;
                            page-break-inside: avoid;
                        }
                        .signature-box {
                            display: inline-block;
                            border-top: 1px solid #000;
                            min-width: 200px;
                            text-align: center;
                            padding-top: 4px;
                            font-size: 8pt;
                            color: #000;
                        }
                        

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
                            body {
                                margin: 0;
                                padding: 0;
                            }
                        }
                    </style>
                </head>
                <body class="${usePrePrinted ? 'pre-printed' : ''}">
                    <div class="page-grid">
                        <!-- LEFT HALF: Rp. (Medications) -->
                        <div class="half-page">
                            <!-- Header -->
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

                            <!-- Patient Info -->
                            <div class="patient-info">
                                <strong><span class="print-label">Paciente:</span></strong> ${selectedPatient.fullName}<br>
                                <strong><span class="print-label">Fecha:</span></strong> ${(() => {
                    const dateStr = rx.prescriptionDate || new Date().toISOString().split('T')[0];
                    const [y, m, d] = dateStr.split('-');
                    return `${d}/${m}/${y}`;
                })()}
                            </div>

                            <!-- Content: Rp. -->
                            <div class="content-area">
                                <div class="content-title">Indicaciones</div> <!-- User asked for Indicaciones style generally, replacing Rp. title might be desired or keeping Rp but styled. Wait, user provided image with "Indicaciones:" at bottom. For prescription, usually it is Rp. I will keep Rp but style it like requested if apply. actually, user said "Indicaciones - Brush Script..." I'll use "Rp." for meds with that style, or should I change it to "Indicaciones"? In previous turn user said "Replace Rp. with Indicaciones" for exam orders. For Prescriptions it is usually Rp. I will use "Rp." here but styled. Wait, the prompt says "Indicaciones ... igual de recetas". I'll stick to "Rp." for prescriptions (Left side) and "Indicaciones" (Right side) but both styled. actually, let's use "Rp." for meds. -->
                                <div class="content-title" style="margin-top:0;">Rp.</div>
                                ${rx.medications && rx.medications.length > 0 ? `
                                    <ul class="med-list">
                                        ${rx.medications.map(m => `
                                            <li class="med-item">
                                                <span class="med-name">${m.name}${m.dose ? ' ' + m.dose : ''}</span>
                                                <div class="med-details">
                                                    ${m.freq ? `• ${m.freq}` : ''}
                                                    ${m.duration ? `<br>• Duración: ${m.duration}` : ''}
                                                </div>
                                            </li>
                                        `).join('')}
                                    </ul>
                                ` : ''}
                                
                                <!-- Signature inside box -->
                                <div class="signature-area">
                                    <div class="signature-box">
                                        <strong>Firma y Sello</strong><br>
                                        <small>Dra. Lucrecia Compén Kong</small><br>
                                        <small>C.M.P. 10837</small>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <!-- RIGHT HALF: Indicaciones (Instructions) -->
                        <div class="half-page">
                            <!-- Header (repeated) -->
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

                            <!-- Patient Info (repeated) -->
                            <div class="patient-info">
                                <strong><span class="print-label">Paciente:</span></strong> ${selectedPatient.fullName}<br>
                                <strong><span class="print-label">Fecha:</span></strong> ${(() => {
                    const dateStr = rx.prescriptionDate || new Date().toISOString().split('T')[0];
                    const [y, m, d] = dateStr.split('-');
                    return `${d}/${m}/${y}`;
                })()}
                            </div>

                            <!-- Content: Indicaciones -->
                            <div class="content-area">
                                <div class="content-title">Indicaciones:</div>
                                <div class="instructions-content">
                                    ${(rx.instructions || '').trim()}
                                </div>
                                
                                <!-- Signature inside box -->
                                <div class="signature-area">
                                    <div class="signature-box">
                                        <strong>Firma y Sello</strong><br>
                                        <small>Dra. Lucrecia Compén Kong</small><br>
                                        <small>C.M.P. 10837</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <script>
                        window.onload = function() { 
                            document.title = '';
                            window.print();
                        }
                    </script>
                </body>
                </html>
            `;

            printWindow.document.write(content);
            printWindow.document.close();
        } catch (error) {
            console.error(error);;
            showAlert('Error al imprimir receta', 'error');
        }
    };

    const handlePrintExam = async (exam) => {
        try {
            const settings = await dataService.getSettings();
            const API_HOST = `http://${window.location.hostname}:5000`;
            const printWindow = window.open('', '', 'height=800,width=1000');

            const logoUrl = settings.logoUrl ? `${API_HOST}/${settings.logoUrl}` : '';

            const content = `
                <html>
                <head>
                    <title>Orden de Examen</title>
                    <style>
                        @page { 
                            size: 21.59cm 22.5cm;
                            margin: 0;
                        }
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        body { 
                            font-family: 'Calibri', sans-serif;
                            color: #2F5496;
                            font-size: 10pt;
                            line-height: 1.15;
                        }
                        
                        /* Two Column Layout */
                        .page-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            min-height: 100vh;
                        }
                        
                        .half-page {
                            padding: 8mm 10mm 10mm 10mm;
                            border-right: 1px dashed #999;
                            display: flex;
                            flex-direction: column;
                        }
                        
                        .half-page:last-child {
                            border-right: none;
                        }
                        
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
                        
                        .doctor-name {
                            font-family: 'Brush Script MT', cursive;
                            font-size: 26pt;
                            color: #2F5496;
                            margin-bottom: 2px;
                            line-height: 1.2;
                            font-weight: bold;
                        }
                        .specialty {
                            font-family: 'Calibri', sans-serif;
                            font-size: 11pt;
                            color: #2F5496;
                            margin-bottom: 1px;
                            font-weight: bold;
                        }
                        .registration {
                            font-family: 'Calibri', sans-serif;
                            font-size: 11pt;
                            color: #2F5496;
                            margin-bottom: 1px;
                            font-weight: bold;
                        }
                        .specialty-desc {
                            font-family: 'Arial', sans-serif;
                            font-weight: bold;
                            font-size: 11pt;
                            color: #2F5496;
                            margin-bottom: 8px;
                        }
                        .office-info {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 10px;
                            font-family: 'Calibri', sans-serif;
                            font-size: 9pt;
                            color: #2F5496;
                            align-items: start;
                            margin-top: 4px;
                            text-align: left;
                            font-weight: bold;
                        }
                        .office-column {
                            display: flex;
                            flex-direction: column;
                        }
                        .office-column.right {
                            text-align: right;
                        }
                        .office-label {
                            font-weight: bold;
                        }
                        
                        /* Patient Info */
                        .patient-info { 
                            background: transparent;
                            padding: 0;
                            margin-bottom: 10px;
                            border: none;
                            font-size: 9pt;
                            color: #000;
                            font-weight: bold;
                            font-family: 'Calibri', sans-serif;
                        }
                        .patient-info strong { font-weight: bold; }
                        
                        /* Content Area */
                        .content-area {
                            border: none;
                            padding: 0 12px 12px 12px;
                            flex: 1;
                            position: relative;
                            overflow: hidden;
                            min-height: 200px;
                            max-height: 480px; /* Enforced limit based on page height */
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
                            margin-bottom: 5px;
                            padding-left: 0;
                        }
                        
                        .exam-content {
                            font-size: 9pt;
                            line-height: 1.4;
                            white-space: pre-line;
                            margin-top: 10px;
                        }
                        
                        /* Signature */
                        .signature-area {
                            margin-top: 40px;
                            text-align: right;
                            page-break-inside: avoid;
                        }
                        .signature-box {
                            display: inline-block;
                            border-top: 1px solid #000;
                            min-width: 200px;
                            text-align: center;
                            padding-top: 4px;
                            font-size: 8pt;
                            color: #000;
                        }
                        
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
                            body {
                                margin: 0;
                                padding: 0;
                            }
                        }
                    </style>
                </head>
                <body class="${usePrePrinted ? 'pre-printed' : ''}">
                    <div class="page-grid">
                        ${[1, 2].map(() => `
                            <div class="half-page">
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
                                    <strong><span class="print-label">Paciente:</span></strong> ${selectedPatient.fullName}<br>
                                    <strong><span class="print-label">Fecha:</span></strong> ${(() => {
                    const dateStr = exam.examDate || exam.date || new Date().toISOString().split('T')[0];
                    const [y, m, d] = dateStr.split('-');
                    return `${d}/${m}/${y}`;
                })()}
                                </div>

                                <div class="content-area">
                                    <div class="content-title">Indicaciones:</div>
                                    <div class="exam-content">
                                        <strong>${exam.type}</strong>
                                        ${exam.reason ? `<br><br>Motivo: ${exam.reason}` : ''}
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
                        `).join('')}
                    </div>
                    <script>
                        window.onload = function() { 
                            document.title = '';
                            window.print();
                        }
                    </script>
                </body>
                </html>
            `;

            printWindow.document.write(content);
            printWindow.document.close();
        } catch (error) {
            console.error(error);
            showAlert('Error al imprimir orden de examen', 'error');
        }
    };

    return (
        <div className="animate-fade-in">
            <h2 className="section-title">Área Clínica</h2>

            {/* Patient Search */}
            <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Seleccionar Paciente</label>
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o DNI..."
                        className="input-field"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setShowPatientList(true); }}
                        onFocus={() => setShowPatientList(true)}
                        style={{ paddingLeft: '2.5rem' }}
                    />
                    <Search size={18} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />

                    {showPatientList && searchTerm && (
                        <div className="card" style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                            marginTop: '5px', maxHeight: '300px', overflowY: 'auto', padding: 0,
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                            {filteredPatients.length > 0 ? (
                                filteredPatients.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => handleSelectPatient(p)}
                                        style={{ padding: '0.8rem', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                                        className="hover:bg-slate-50"
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                    >
                                        <div style={{ fontWeight: '600' }}>{p.fullName || `${p.firstName} ${p.lastName}`}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.documentType || 'Doc'}: {p.dni || 'Sin DNI'}</div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                    No se encontraron pacientes.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {selectedPatient ? (
                <div>
                    {/* Patient Context Header */}
                    <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f0f9ff)', borderLeft: '4px solid var(--primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ background: 'white', padding: '12px', borderRadius: '50%', color: 'var(--primary)', boxShadow: 'var(--shadow-sm)' }}>
                                <User size={28} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>
                                    {selectedPatient.fullName || (selectedPatient.firstName ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Sin Nombre')}
                                </h2>
                                <div style={{ display: 'flex', gap: '1.5rem', color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <strong>{selectedPatient.documentType || 'Doc'}:</strong> {selectedPatient.dni || 'N/A'}
                                    </span>
                                    {selectedPatient.birthDate && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <strong>Edad:</strong> {new Date().getFullYear() - new Date(selectedPatient.birthDate).getFullYear()} años
                                        </span>
                                    )}
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <strong>HC:</strong> {selectedPatient.clinicalHistoryNumber || 'S/N'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {/* Clear / Close selection */}
                        <button
                            onClick={() => { setSelectedPatient(null); setSearchTerm(''); }}
                            style={{
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                            className="hover:text-red-500"
                        >
                            <span style={{ fontSize: '0.8rem' }}>Cambiar Paciente</span> <Search size={16} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                        <button
                            onClick={() => setActiveTab('recetas')}
                            className={activeTab === 'recetas' ? 'btn-primary' : 'btn-secondary'}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <FileText size={20} /> Recetas Médicas
                        </button>
                        <button
                            onClick={() => setActiveTab('examenes')}
                            className={activeTab === 'examenes' ? 'btn-primary' : 'btn-secondary'}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Activity size={20} /> Solicitud de Exámenes
                        </button>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginLeft: 'auto', marginRight: '1rem', fontSize: '0.9rem', userSelect: 'none', color: '#475569' }}>
                            <input
                                type="checkbox"
                                checked={usePrePrinted}
                                onChange={e => setUsePrePrinted(e.target.checked)}
                                style={{ width: '16px', height: '16px', accentColor: '#2F5496' }}
                            />
                            <span>Papel Membretado</span>
                        </label>
                        <button
                            onClick={() => navigate(`/pacientes/${selectedPatient.id}`)}
                            className="btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            title="Ver Historial Completo"
                        >
                            <History size={20} /> Ver Historial
                        </button>
                    </div>

                    {activeTab === 'recetas' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            {/* Form */}
                            <div className="card">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    {editingRxId ? 'Editando Receta' : 'Nueva Receta'}
                                    {editingRxId && (
                                        <button onClick={cancelEditRx} style={{ fontSize: '0.8rem', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                            Cancelar Edición
                                        </button>
                                    )}
                                </h3>
                                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <input
                                            placeholder="Medicamento"
                                            className="input-field"
                                            value={newMed.name}
                                            onChange={e => setNewMed({ ...newMed, name: e.target.value })}
                                        />
                                        <input
                                            placeholder="Dosis (ej. 500mg)"
                                            className="input-field"
                                            value={newMed.dose}
                                            onChange={e => setNewMed({ ...newMed, dose: e.target.value })}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                        <input
                                            placeholder="Frecuencia (ej. c/8h)"
                                            className="input-field"
                                            value={newMed.freq}
                                            onChange={e => setNewMed({ ...newMed, freq: e.target.value })}
                                        />
                                        <input
                                            placeholder="Duración (ej. 7 días)"
                                            className="input-field"
                                            value={newMed.duration}
                                            onChange={e => setNewMed({ ...newMed, duration: e.target.value })}
                                        />
                                    </div>
                                    <button onClick={addMedication} className="btn-secondary" style={{ width: '100%' }}>+ Agregar a la lista</button>
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    {currentRx.medications.map((med, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                                            <span><strong>{med.name}</strong> {med.dose} - {med.freq} ({med.duration})</span>
                                            <button onClick={() => removeMedication(i)} style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                                        Fecha de la Receta
                                    </label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={prescriptionDate}
                                        onChange={(e) => setPrescriptionDate(e.target.value)}
                                    />
                                </div>

                                <textarea
                                    className="input-field"
                                    rows="3"
                                    placeholder="Instrucciones adicionales..."
                                    value={currentRx.instructions}
                                    onChange={e => setCurrentRx({ ...currentRx, instructions: e.target.value })}
                                    maxLength={1000}
                                    style={{ marginBottom: '0.5rem' }}
                                ></textarea>
                                <div style={{
                                    textAlign: 'right',
                                    fontSize: '0.85rem',
                                    color: (currentRx.instructions?.length || 0) > 950 ? '#dc2626' : 'var(--text-muted)',
                                    marginBottom: '1rem'
                                }}>
                                    {currentRx.instructions?.length || 0}/1000 caracteres
                                </div>

                                <button onClick={savePrescription} className="btn-primary" style={{ width: '100%' }}>
                                    {editingRxId ? 'Actualizar Receta' : 'Guardar Receta'}
                                </button>
                            </div>

                            {/* History */}
                            <div className="card">
                                <h3 style={{ marginBottom: '1.5rem' }}>Historial de Recetas</h3>
                                {prescriptions.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)' }}>No hay recetas previas.</p>
                                ) : (
                                    prescriptions.map(rx => (
                                        <div key={rx.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <div style={{ fontSize: '0.9rem' }}>
                                                        <strong>Registro:</strong> {(() => {
                                                            const [y, m, d] = rx.date.split('-');
                                                            return `${d}/${m}/${y}`;
                                                        })()}
                                                    </div>
                                                    {rx.prescriptionDate && (
                                                        <div style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>
                                                            <strong>Receta:</strong> {(() => {
                                                                const [y, m, d] = rx.prescriptionDate.split('-');
                                                                return `${d}/${m}/${y}`;
                                                            })()}
                                                        </div>
                                                    )}
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dr. {rx.doctorName}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={() => handlePrintRx(rx)} style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer' }} title="Imprimir Receta">
                                                        <Printer size={18} />
                                                    </button>
                                                    {hasPermission('edit_clinical') && (
                                                        <button onClick={() => handleEditRx(rx)} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }} title="Editar Receta">
                                                            <Edit size={18} />
                                                        </button>
                                                    )}
                                                    {hasPermission('delete_prescriptions') && (
                                                        <button onClick={() => handleDeleteInit('prescription', rx)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }} title="Eliminar Receta">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <ul style={{ paddingLeft: '1.2rem', marginBottom: '0.5rem' }}>
                                                {rx.medications.map((m, i) => (
                                                    <li key={i}>{m.name} {m.dose} - {m.freq}</li>
                                                ))}
                                            </ul>
                                            {rx.instructions && <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Nota: {rx.instructions}</p>}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'examenes' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div className="card">
                                <h3 style={{ marginBottom: '1.5rem' }}>Solicitar Examen</h3>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Tipo de examen (ej. Resonancia Magnética, Electroencefalograma...)"
                                    style={{ marginBottom: '1rem' }}
                                    value={newExam.type}
                                    onChange={e => setNewExam({ ...newExam, type: e.target.value })}
                                />
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                                        Fecha de la Orden
                                    </label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={examDate}
                                        onChange={(e) => setExamDate(e.target.value)}
                                    />
                                </div>
                                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                                    <textarea
                                        className="input-field"
                                        rows="3"
                                        maxLength={1000}
                                        placeholder="Indicación Clínica / Detalles del Examen..."
                                        value={newExam.reason}
                                        onChange={e => setNewExam({ ...newExam, reason: e.target.value })}
                                    ></textarea>
                                    <span style={{
                                        position: 'absolute',
                                        bottom: '8px',
                                        right: '8px',
                                        fontSize: '0.7rem',
                                        color: (newExam.reason?.length || 0) > 950 ? 'var(--danger)' : 'var(--text-muted)'
                                    }}>
                                        {newExam.reason?.length || 0}/1000
                                    </span>
                                </div>
                                <button onClick={saveExamRequest} className="btn-primary" style={{ width: '100%' }}>Generar Solicitud</button>
                            </div>

                            <div className="card">
                                <h3 style={{ marginBottom: '1.5rem' }}>Exámenes Solicitados</h3>
                                {exams.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)' }}>No hay exámenes registrados.</p>
                                ) : (
                                    exams.map(ex => (
                                        <div key={ex.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '8px' }}>
                                                        <strong style={{ fontSize: '0.9rem' }}>{ex.type}</strong>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                            Reg: {(() => {
                                                                const [y, m, d] = ex.date.split('-');
                                                                return `${d}/${m}/${y}`;
                                                            })()}
                                                        </span>
                                                        {ex.examDate && (
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>
                                                                Orden: {(() => {
                                                                    const [y, m, d] = ex.examDate.split('-');
                                                                    return `${d}/${m}/${y}`;
                                                                })()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem',
                                                        background: ex.status === 'Solicitado' ? '#fef3c7' : '#dcfce7',
                                                        color: ex.status === 'Solicitado' ? '#d97706' : '#166534'
                                                    }}>
                                                        {ex.status}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => handlePrintExam(ex)}
                                                        style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer' }}
                                                        title="Imprimir Orden de Examen"
                                                    >
                                                        <Printer size={18} />
                                                    </button>
                                                    {hasPermission('edit_clinical') && ex.status === 'Solicitado' && (
                                                        <>
                                                            <button
                                                                onClick={() => setEditExam(ex)}
                                                                style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                                                                title="Editar Solicitud"
                                                            >
                                                                <Edit size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateExam(ex.id, 'Resultados Listos')}
                                                                style={{ color: '#059669', background: 'none', border: 'none', cursor: 'pointer' }}
                                                                title="Marcar Resultados Listos"
                                                            >
                                                                <CheckCircle size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {hasPermission('delete_exams') && (
                                                        <button onClick={() => handleDeleteInit('exam', ex)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }} title="Eliminar Examen">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{ex.date} - Dr. {ex.doctorName}</p>

                                            {/* Results Section */}
                                            {ex.results && ex.results.length > 0 && (
                                                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)' }}>
                                                    {ex.results.map(r => (
                                                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                                                            <a
                                                                href={`/${r.filePath}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--primary)', fontSize: '0.9rem', textDecoration: 'none', marginRight: '10px' }}
                                                            >
                                                                <File size={14} /> Ver Resultado ({new Date(r.uploadDate).toLocaleDateString()})
                                                            </a>
                                                            {r.note && (
                                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '10px', fontStyle: 'italic' }}>
                                                                    - {r.note}
                                                                </span>
                                                            )}
                                                            {hasPermission('edit_clinical') && (
                                                                <button
                                                                    onClick={() => handleDeleteInit('exam-result', r)}
                                                                    style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}
                                                                    title="Eliminar archivo"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Always show Upload Button */}
                                            {/* Styled Upload Button */}
                                            <button
                                                onClick={() => setUploadExamId(ex.id)}
                                                style={{
                                                    fontSize: '0.85rem',
                                                    padding: '0.6rem 1rem',
                                                    marginTop: '0.8rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    color: 'var(--primary)',
                                                    background: '#f0f9ff',
                                                    border: '1px dashed var(--primary)',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    width: '100%',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#e0f2fe'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = '#f0f9ff'}
                                            >
                                                <Upload size={16} />
                                                <span style={{ fontWeight: '500' }}>
                                                    {ex.results && ex.results.length > 0 ? 'Adjuntar Otro Archivo' : 'Subir Resultados'}
                                                </span>
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4rem 2rem',
                    color: 'var(--text-muted)',
                    background: '#f8fafc',
                    borderRadius: '16px',
                    border: '2px dashed #e2e8f0',
                    marginTop: '2rem',
                    textAlign: 'center'
                }}>
                    <div style={{
                        background: 'white',
                        padding: '1.5rem',
                        borderRadius: '50%',
                        marginBottom: '1.5rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                        <Search size={48} strokeWidth={1.5} style={{ color: '#94a3b8' }} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>
                        Área Clínica en Espera
                    </h3>
                    <p style={{ maxWidth: '450px', lineHeight: '1.6', color: '#64748b' }}>
                        Para comenzar, busque y seleccione un paciente utilizando la barra de búsqueda superior.
                        Podrá gestionar recetas médicas y solicitudes de exámenes.
                    </p>
                </div>
            )
            }

            {/* Edit Exam Modal */}
            <Modal isOpen={!!editExam} onClose={() => setEditExam(null)} title="Editar Solicitud de Examen">
                <div style={{ padding: '1rem' }}>
                    <input
                        className="input-field"
                        placeholder="Tipo de examen (ej. Resonancia Magnética...)"
                        style={{ marginBottom: '1rem' }}
                        value={editExam?.type || ''}
                        onChange={e => setEditExam({ ...editExam, type: e.target.value })}
                    />

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Fecha de la Orden</label>
                        <input
                            type="date"
                            className="input-field"
                            value={editExam?.examDate || editExam?.date || ''}
                            onChange={(e) => setEditExam({ ...editExam, examDate: e.target.value })}
                        />
                    </div>

                    <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                        <textarea
                            className="input-field"
                            rows="3"
                            maxLength={550}
                            placeholder="Indicación Clínica / Detalles del Examen..."
                            value={editExam?.reason || ''}
                            onChange={e => setEditExam({ ...editExam, reason: e.target.value })}
                        ></textarea>
                        <span style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            fontSize: '0.7rem',
                            color: (editExam?.reason?.length || 0) > 500 ? 'var(--danger)' : 'var(--text-muted)'
                        }}>
                            {editExam?.reason?.length || 0}/550
                        </span>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Estado</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => setEditExam({ ...editExam, status: 'Solicitado' })}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: editExam?.status === 'Solicitado' ? '2px solid var(--primary)' : '1px solid var(--border)',
                                    background: editExam?.status === 'Solicitado' ? 'var(--primary-light)' : 'white'
                                }}
                            >
                                Solicitado
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditExam({ ...editExam, status: 'Resultados Listos' })}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: editExam?.status === 'Resultados Listos' ? '2px solid var(--success)' : '1px solid var(--border)',
                                    background: editExam?.status === 'Resultados Listos' ? '#dcfce7' : 'white'
                                }}
                            >
                                Resultados Listos
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditExam(null)} className="btn-secondary">Cancelar</button>
                        <button
                            onClick={async () => {
                                try {
                                    await dataService.updateExam(editExam.id, {
                                        type: editExam.type,
                                        reason: editExam.reason,
                                        examDate: editExam.examDate, // Include examDate in update
                                        status: editExam.status
                                    });
                                    setExams(prev => prev.map(e => e.id === editExam.id ? editExam : e));
                                    showAlert('Examen actualizado', 'success');
                                    setEditExam(null);
                                } catch (error) {
                                    showAlert('Error al actualizar', 'error');
                                }
                            }}
                            className="btn-primary"
                        >
                            Guardar Cambios
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Upload Modal with Better UI */}
            <Modal isOpen={!!uploadExamId} onClose={() => setUploadExamId(null)} title="Subir Resultados">
                <div style={{ padding: '1rem' }}>
                    <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Seleccione el archivo (PDF o Imagen) para adjuntar al exame.</p>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label
                            htmlFor="file-upload"
                            className="btn-secondary"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '1rem',
                                border: '2px dashed var(--border)',
                                cursor: 'pointer'
                            }}
                        >
                            <Upload size={24} color="var(--primary)" />
                            <span>{fileToUpload ? fileToUpload.name : 'Haga clic para seleccionar archivo'}</span>
                        </label>
                        <input
                            id="file-upload"
                            type="file"
                            onChange={e => {
                                const file = e.target.files[0];
                                if (file && file.size > 10 * 1024 * 1024) {
                                    showAlert('El archivo excede el límite de 10MB', 'error');
                                    e.target.value = null;
                                    return;
                                }
                                setFileToUpload(file);
                            }}
                            style={{ display: 'none' }}
                        />
                        <p style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: '0.5rem', textAlign: 'center', fontWeight: '500' }}>
                            Tamaño máximo de archivo: 10 MB
                        </p>
                    </div>

                    <textarea
                        className="input-field"
                        rows="2"
                        placeholder="Nota / Descripción del archivo..."
                        value={uploadNote}
                        onChange={e => setUploadNote(e.target.value)}
                        style={{ marginBottom: '1.5rem' }}
                    ></textarea>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => { setUploadExamId(null); setUploadNote(''); setFileToUpload(null); }} className="btn-secondary">Cancelar</button>
                        <button
                            onClick={handleFileUpload}
                            className="btn-primary"
                            disabled={!fileToUpload}
                            style={{ opacity: !fileToUpload ? 0.7 : 1 }}
                        >
                            Subir Archivo
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({ ...deleteModal, open: false })} title="Confirmar Eliminación">
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <AlertCircle size={48} style={{ color: 'var(--danger)', margin: '0 auto 1rem' }} />
                    <p style={{ marginBottom: '1.5rem' }}>
                        ¿Estás seguro que deseas eliminar este registro? <br />
                        <strong>Esta acción no se puede deshacer.</strong>
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button onClick={() => setDeleteModal({ ...deleteModal, open: false })} className="btn-secondary">Cancelar</button>
                        <button onClick={handleConfirmDelete} className="btn-primary" style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}>Eliminar</button>
                    </div>
                </div>
            </Modal>
        </div >
    );
};
export default Clinico;
