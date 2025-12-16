// toast.ts - Simple toast/notification system

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) {
  let toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '32px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: type === 'error' ? '#d32f2f' : type === 'success' ? '#388e3c' : '#333',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '6px',
    zIndex: 9999,
    fontSize: '1rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    opacity: '0',
    transition: 'opacity 0.3s',
    pointerEvents: 'none',
  });
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '1'; }, 10);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
