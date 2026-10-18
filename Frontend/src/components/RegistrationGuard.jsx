import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';

const API_URL = import.meta.env.VITE_API_URL;

export default function RegistrationGuard({ children, checkDraft = false }) {
    const { state } = useLocation();
    const leagueID = state?.leagueID;
    const [closed, setClosed] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        let timer;
        let checking = false;
        async function checkRegistration() {
            if (checkDraft && !leagueID) return;
            if (checking) return;
            checking = true;
            window.clearTimeout(timer);
            let delay = 60_000;
            try {
                const path = checkDraft ? `/leagues/id/${leagueID}/eligibility` : '/leagues/registration/status';
                const response = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
                if (!response.ok) throw new Error('Unable to check registration availability. Please try again.');
                const status = await response.json();
                if (cancelled) return;
                setClosed(status.closed);
                setError('');
                if (!status.closed) {
                    const remaining = Date.parse(status.deadline) - Date.parse(status.server_time);
                    if (remaining > 0) delay = Math.max(100, Math.min(delay, remaining));
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
    }, [checkDraft, leagueID]);

    if (checkDraft && !leagueID) return <Navigate to="/login" replace />;
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
