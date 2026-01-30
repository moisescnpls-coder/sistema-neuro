export const showAlert = (message, type = 'info') => {
    // Dispatch custom event for ToastContainer to catch
    const event = new CustomEvent('toast-notification', {
        detail: { message, type }
    });
    window.dispatchEvent(event);

    // Log for debugging
    if (type === 'error') {
        console.error(message);
    }
};
