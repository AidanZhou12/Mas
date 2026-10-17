import { Link } from 'react-router';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { createLeague, createTeam, getLeagueID } from '../api/create';
import './pages.css';

function CreateLeague() {
    const [leagueName, setLeagueName] = useState('');
    const [teamName, setTeamName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    return (
        <main>
            <Link to="/" className="back-button">Back</Link>
            <Link to="/login" className="login-button">Login</Link>
            <h1>Create League</h1>
            <div className="create-page">
                <form className="create-form" onSubmit={async (e) => {
                    e.preventDefault();
                    setError('');
                    try {
                        await createLeague(leagueName);
                        await createTeam(leagueName, teamName, password);
                        const leagueID = await getLeagueID(leagueName);
                        navigate('/unready', { state: { teamName, leagueID } });
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
                    <button type="submit">Create</button>
                </form>
            </div>
        </main>
    );
}

export default CreateLeague;