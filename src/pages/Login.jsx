import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Activity, Eye, EyeOff } from 'lucide-react';
import { dataService } from '../services/data';
import { useAuth } from '../context/AuthContext';
import { showAlert } from '../utils/alerts';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [credentials, setCredentials] = useState({ username: '', password: '', name: '', role: 'recepcion' });
    const [loading, setLoading] = useState(false);
    const [companyName, setCompanyName] = useState('Neurocenter Bolivar');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        dataService.getSettings()
            .then(settings => {
                if (settings && (settings.nombreComercial || settings.razonSocial)) {
                    setCompanyName(settings.nombreComercial || settings.razonSocial);
                }
            })
            .catch(console.error);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { user, token } = await dataService.login(credentials);
            login(user, token);
            showAlert(`Bienvenido a ${companyName}`, 'success');
            navigate('/');
        } catch (error) {
            showAlert(error.message || 'Error al iniciar sesión', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
        }}>
            <div className="animate-fade-in" style={{
                background: 'rgba(255, 255, 255, 0.95)',
                padding: '3rem',
                borderRadius: '24px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center'
            }}>
                <img
                    src="/logo.svg"
                    alt="Logo Clínica"
                    style={{
                        height: 'auto',
                        maxWidth: '150px',
                        maxHeight: '100px',
                        margin: '0 auto 1.5rem',
                        display: 'block',
                        filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'
                    }}
                />

                <h1 style={{
                    marginBottom: '0.5rem',
                    background: 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontSize: '2rem',
                    fontWeight: '800',
                    letterSpacing: '-0.5px'
                }}>
                    {companyName}
                </h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Ingrese sus credenciales</p>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <User size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                        <input
                            type="text"
                            placeholder="Usuario"
                            required
                            className="input-field"
                            style={{ paddingLeft: '3rem' }}
                            value={credentials.username}
                            onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                        />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Lock size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Contraseña"
                            required
                            className="input-field"
                            style={{ paddingLeft: '3rem', paddingRight: '2.5rem' }}
                            value={credentials.password}
                            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '0.75rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-light)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}
                    >
                        {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                    v1.3.1
                </div>
            </div>
        </div>
    );
};

export default Login;
