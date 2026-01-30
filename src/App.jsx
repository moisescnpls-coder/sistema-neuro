import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Pacientes from './pages/Pacientes';
import PacienteDetalles from './pages/PacienteDetalles';
import Medicos from './pages/Medicos';
import Clinico from './pages/Clinico';
import Login from './pages/Login';
import ToastContainer from './components/ToastContainer';

import { AuthProvider, useAuth } from './context/AuthContext';
import Usuarios from './pages/Usuarios';
import Permisos from './pages/Permisos';
import Configuracion from './pages/Configuracion';
import Logs from './pages/Logs';
import Relatorios from './pages/Relatorios';
import DashboardAnalitico from './pages/DashboardAnalitico';
import Atencion from './pages/Atencion';

// Componente para proteger rutas por autenticación y permisos
const ProtectedRoute = ({ children, permissionKey }) => {
  const { user, hasPermission } = useAuth();

  if (!user) return <Navigate to="/login" />;

  if (permissionKey && !hasPermission(permissionKey)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Layout padrão com Sidebar
const MainLayout = ({ children }) => (
  <div className="app-container">
    <ToastContainer />
    <Sidebar />
    <main className="main-content">
      {children}
    </main>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Rota de Login (Pública) */}
          <Route path="/login" element={<><ToastContainer /><Login /></>} />

          {/* Rotas Protegidas */}
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout><Dashboard /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/agenda" element={
            <ProtectedRoute>
              <MainLayout><Agenda /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/pacientes" element={
            <ProtectedRoute>
              <MainLayout><Pacientes /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/pacientes/:id" element={
            <ProtectedRoute>
              <MainLayout><PacienteDetalles /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/medicos" element={
            <ProtectedRoute>
              <MainLayout><Medicos /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/clinico" element={
            <ProtectedRoute permissionKey="view_clinical">
              <MainLayout><Clinico /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/usuarios" element={
            <ProtectedRoute permissionKey="manage_users">
              <MainLayout><Usuarios /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/permisos" element={
            <ProtectedRoute permissionKey="manage_permissions">
              <MainLayout><Permisos /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/configuracion" element={
            <ProtectedRoute>
              <MainLayout><Configuracion /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/logs" element={
            <ProtectedRoute permissionKey="view_logs">
              <MainLayout><Logs /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/relatorios" element={
            <ProtectedRoute permissionKey="view_reports">
              <MainLayout><Relatorios /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute permissionKey="view_reports">
              <MainLayout><DashboardAnalitico /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/atencion/paciente/:patientId" element={
            <ProtectedRoute permissionKey="access_attention">
              <MainLayout><Atencion /></MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/atencion/:id" element={
            <ProtectedRoute permissionKey="access_attention">
              <MainLayout><Atencion /></MainLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
