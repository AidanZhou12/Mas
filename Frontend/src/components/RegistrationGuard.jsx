import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';

const API_URL = import.meta.env.VITE_API_URL;

export default function RegistrationGuard({ children }) {
    const [closed, setClosed] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        let timer;
        let checking = false;
        async function checkRegistration() {
            if (checking) return;
            checking = true;
            window.clearTimeout(timer);
            let delay = 60_000;
            try {
                const response = await fetch(`${API_URL}/leagues/registration/status`, { cache: 'no-store' });
                if (!response.ok) throw new Error('Unable to check registration availability. Please try again.');
                const status = await response.json();
                if (cancelled) return;
                setClosed(status.closed);
                setError('');
                if (!status.closed) {
                    delay = Math.max(100, Math.min(delay,
                        Date.parse(status.deadline) - Date.parse(status.server_time)));
                }
            } catch (err) {
                if (!cancelled) {
                    setClosed(null);
                    setError(err.message);
                }
            } finally {
                checking = false;
            }
            if (!cancelled) timer = window.setTimeout(checkRegistration, delay);
        }
        checkRegistration();
        window.addEventListener('focus', checkRegistration);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
            window.removeEventListener('focus', checkRegistration);
        };
    }, []);

    if (closed === true) return <Navigate to="/season-started" replace />;
    if (closed === false) return children;
    return (
        <main>
            <Link to="/" className="back-button">Back</Link>
            <Link to="/login" className="login-button">Login</Link>
            <p role={error ? 'alert' : 'status'}>{error || 'Checking registration availability...'}</p>
        </main>
    );
}
