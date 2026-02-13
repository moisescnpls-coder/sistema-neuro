import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContainer = () => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const handleToast = (event) => {
            const { message, type } = event.detail;
            const id = Date.now();
            setToasts(prev => [...prev, { id, message, type }]);

            // Auto remove after 3 seconds
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 3000);
        };

        window.addEventListener('toast-notification', handleToast);
        return () => window.removeEventListener('toast-notification', handleToast);
    }, []);

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    if (toasts.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 20000,
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
        }}>
            {toasts.map(toast => (
                <div key={toast.id} className="animate-fade-in" style={{
                    minWidth: '320px',
                    padding: '1rem 1.2rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    borderLeft: `6px solid ${getColor(toast.type)}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transform: 'translateY(0)',
                    transition: 'all 0.3s ease'
                }}>
                    {getIcon(toast.type)}
                    <span style={{ color: '#1e293b', fontSize: '0.95rem', fontWeight: '600', flex: 1, fontFamily: 'sans-serif' }}>
                        {toast.message}
                    </span>
                    <button
                        onClick={() => removeToast(toast.id)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>
            ))}
        </div>
    );
};

const getColor = (type) => {
    switch (type) {
        case 'success': return '#10b981'; // Emerald 500
        case 'error': return '#ef4444';   // Red 500
        default: return '#3b82f6';        // Blue 500
    }
};

const getIcon = (type) => {
    switch (type) {
        case 'success': return <CheckCircle color="#10b981" size={24} />;
        case 'error': return <AlertCircle color="#ef4444" size={24} />;
        default: return <Info color="#3b82f6" size={24} />;
    }
};

export default ToastContainer;
