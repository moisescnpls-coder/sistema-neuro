import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertCircle, X } from 'lucide-react';

const Toast = ({ message, type = 'success', duration = 3000, onClose }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            setIsVisible(false);
            onClose?.();
        }, 300);
    };

    if (!isVisible) return null;

    const config = {
        success: {
            icon: <CheckCircle size={20} />,
            bgColor: '#10b981',
            iconBg: '#dcfce7',
            iconColor: '#15803d'
        },
        error: {
            icon: <XCircle size={20} />,
            bgColor: '#ef4444',
            iconBg: '#fee2e2',
            iconColor: '#dc2626'
        },
        info: {
            icon: <Info size={20} />,
            bgColor: '#3b82f6',
            iconBg: '#dbeafe',
            iconColor: '#1d4ed8'
        },
        warning: {
            icon: <AlertCircle size={20} />,
            bgColor: '#f59e0b',
            iconBg: '#fef3c7',
            iconColor: '#d97706'
        }
    };

    const currentConfig = config[type] || config.success;

    return (
        <div
            style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 99999,
                minWidth: '320px',
                maxWidth: '500px',
                animation: isExiting ? 'slideOut 0.3s ease-out forwards' : 'slideIn 0.3s ease-out',
                pointerEvents: 'auto'
            }}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '16px',
                    borderLeft: `4px solid ${currentConfig.bgColor}`
                }}
            >
                <div
                    style={{
                        background: currentConfig.iconBg,
                        color: currentConfig.iconColor,
                        padding: '8px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}
                >
                    {currentConfig.icon}
                </div>
                <div style={{ flex: 1, paddingTop: '2px' }}>
                    <p style={{
                        margin: 0,
                        color: 'var(--text-main)',
                        fontSize: '0.95rem',
                        fontWeight: '500',
                        lineHeight: '1.5'
                    }}>
                        {message}
                    </p>
                </div>
                <button
                    onClick={handleClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        flexShrink: 0,
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-body)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                    <X size={16} />
                </button>
            </div>

            <style>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
};

export default Toast;
