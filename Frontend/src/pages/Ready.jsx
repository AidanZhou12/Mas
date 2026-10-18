import { Link, useLocation, useNavigate } from 'react-router';
import { useState } from 'react';
import { getLeagueID, startDraft } from '../api/ready';
import './pages.css';

function ReadyPage() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    return (
        <main>
            <Link to="/" className="back-button">Back</Link>
            <h1>League Ready</h1>
            <div className="ready-page">
                <p>All teams have joined the league. The draft can now be started.</p>
                <button onClick={async () => {
                    setError('');
                    try {
                        const leagueID = await getLeagueID(state.teamName);
                        await startDraft(leagueID);
                        navigate('/draft', { state: { teamName: state.teamName, leagueID } });
                    }
                    catch (err) {
                        if (err.status === 403) {
                            navigate('/season-started', { replace: true });
                            return;
                        }
                        setError(err.message);
                    }
                }}>Start Draft</button>
                {error && <p className="error">{error}</p>}
            </div>
        </main>
    );
}

export default ReadyPage;
