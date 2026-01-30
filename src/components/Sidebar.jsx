import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Stethoscope, FileText, Activity, LogOut, Shield, Settings, Scroll, FileBarChart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user, logout, hasPermission } = useAuth();
  const menuItems = [
    { name: 'Panel Principal', icon: <LayoutDashboard size={20} />, path: '/' },
    { name: 'Agenda', icon: <Calendar size={20} />, path: '/agenda' },
    { name: 'Pacientes', icon: <Users size={20} />, path: '/pacientes' },
    { name: 'Médicos', icon: <Stethoscope size={20} />, path: '/medicos' },
  ];

  if (hasPermission('view_clinical')) {
    menuItems.push({ name: 'Clínico', icon: <Activity size={20} />, path: '/clinico' });
  }

  if (hasPermission('manage_users')) {
    menuItems.push({ name: 'Usuarios', icon: <Users size={20} />, path: '/usuarios' });
  }

  if (hasPermission('manage_permissions')) {
    menuItems.push({ name: 'Permisos', icon: <Shield size={20} />, path: '/permisos' });
  }

  if (user?.role === 'admin') {
    menuItems.push({ name: 'Configuración', icon: <Settings size={20} />, path: '/configuracion' });
  }

  if (hasPermission('view_logs')) {
    menuItems.push({ name: 'Auditoría', icon: <Scroll size={20} />, path: '/logs' });
  }

  if (hasPermission('view_reports')) {
    menuItems.push({ name: 'Reportes', icon: <FileBarChart size={20} />, path: '/relatorios' });
    menuItems.push({ name: 'Visual Analytics', icon: <FileBarChart size={20} className="rotate-90" />, path: '/analytics' });
  }

  return (
    <div className="sidebar">
      <div style={{ marginBottom: '2rem', padding: '0.5rem', textAlign: 'center' }}>
        <img
          src="/logo.svg"
          alt="Logo"
          style={{
            maxWidth: '100%',
            height: 'auto',
            maxHeight: '60px',
            display: 'inline-block',
            marginBottom: '10px'
          }}
        />
        <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-dark)', margin: 0 }}>
          Neurocenter Bolivar
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          Gestión Neurológica
        </p>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Conectado como:</p>
        <p style={{ margin: 0, fontWeight: '600', color: '#334155' }}>{user?.name || user?.username}</p>
        <span style={{
          display: 'inline-block',
          marginTop: '4px',
          padding: '2px 8px',
          background: '#e0f2fe',
          color: '#0369a1',
          borderRadius: '12px',
          fontSize: '0.7rem',
          fontWeight: 'bold',
          textTransform: 'uppercase'
        }}>
          {user?.role}
        </span>
      </div>

      <button
        onClick={() => {
          logout();
          window.location.href = '/login';
        }}
        style={{
          padding: '1rem',
          background: '#fee2e2',
          borderRadius: 'var(--radius-md)',
          border: '1px solid #fecaca',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          width: '100%',
          fontWeight: '600'
        }}
        onMouseEnter={(e) => e.target.style.background = '#fecaca'}
        onMouseLeave={(e) => e.target.style.background = '#fee2e2'}
      >
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <LogOut size={16} />
        </div>
        <div>
          <p style={{ fontSize: '0.9rem', margin: 0 }}>Cerrar Sesión</p>
        </div>
      </button>
    </div>
  );
};

export default Sidebar;
