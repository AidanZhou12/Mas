import { Link } from 'react-router';
import { useNavigate } from 'react-router';
import './pages.css';
import { createTeam, getCount, getDraftStatus, getLeagueID } from '../api/join';
import { useState } from 'react';

function JoinLeague() {
    const [leagueName, setLeagueName] = useState('');
    const [teamName, setTeamName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    return (
        <main>
            <Link to="/" className="back-button">Back</Link>
            <Link to="/login" className="login-button">Login</Link>
            <h1>Join League</h1>
            <div className="join-page">
                <form className="join-form" onSubmit={async (e) => {
                    e.preventDefault();
                    setError('');
                    try {
                        await createTeam(leagueName, teamName, password);
                        const teamCount = await getCount(leagueName);
                        const draftStatus = await getDraftStatus(leagueName);
                        const leagueID = await getLeagueID(leagueName);
                        if (draftStatus === 'started') {
                            navigate('/enter', { state: { teamName, leagueID } });
                        }
                        else if (teamCount === 6) {
                            navigate('/ready', { state: { teamName, leagueID } });
                        }
                        else {
                            navigate('/unready', { state: { teamName, leagueID } });
                        }
                    }
                    catch (err) {
                        if (err.status === 403) {
                            navigate('/season-started', { replace: true });
                            return;
                        }
                        setError(err.message);
                    }
                }}>
                    <div className="form-field">
                        <label>
                            League Name:
                            <input type="text" value={leagueName} onChange={(e) => setLeagueName(e.target.value)} required />
                        </label>
                    </div>
                    <div className="form-field">
                        <label>
                            Team Name:
                            <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
                        </label>
                    </div>
                    <div className="form-field">
                        <label>
                            Password:
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </label>
                    </div>
                    {error && <p className="error">{error}</p>}
                    <button type="submit">Join</button>
                </form>
            </div>
        </main>
    );
}

export default JoinLeague;