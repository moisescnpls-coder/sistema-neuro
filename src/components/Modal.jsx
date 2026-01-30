import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, footer }) => {
    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999, // Super high z-index
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
        }} onClick={(e) => e.stopPropagation()}>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)',
                }}
            />

            {/* Modal Card */}
            <div className="animate-fade-in" style={{
                position: 'relative',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '90vh',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 10000,
                border: '1px solid var(--border)',
                overflow: 'hidden'
            }}>
                {/* Header - Fixed */}
                <div style={{
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'white',
                    flexShrink: 0
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-main)' }}>{title}</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '6px',
                            borderRadius: '50%',
                            display: 'flex',
                            transition: 'background 0.2s',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'var(--bg-body)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div style={{
                    padding: '1.5rem',
                    overflowY: 'auto',
                    flex: '1 1 auto',
                    overscrollBehavior: 'contain' // Prevent scroll chaining
                }}>
                    {children}
                </div>

                {/* Footer - Fixed */}
                {footer && (
                    <div style={{
                        padding: '1rem 1.5rem',
                        borderTop: '1px solid var(--border)',
                        background: '#f9fafb',
                        flexShrink: 0,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '1rem'
                    }}>
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default Modal;
