import { Link } from 'react-router';
import { useState } from 'react';
import { loginTeam } from '../api/login';
import { getLeague } from '../api/league';
import { useNavigate } from 'react-router';
import './pages.css';

function LoginPage() {
    const [teamName, setTeamName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    return (
        <main>
            <Link to="/" className="back-button">Back</Link>
            <Link to="/login" className="login-button">Login</Link>
            <h1>Login</h1>
            <div className="login-page">
                <form className="login-form" onSubmit={async (e) => {
                    e.preventDefault();
                    setError('');
                    try {
                        const team = await loginTeam(teamName, password);
                        const league = await getLeague(team.league_id);
                        const teamCount = league.teams.length;
                        const draftStatus = league.draft?.status;
                        if (league.current_week >= 6 || draftStatus === 'completed') {
                            navigate('/league', { state: { teamName, leagueID: team.league_id } });
                        }
                        else if (draftStatus === 'started') {
                            navigate('/enter', { state: { teamName, leagueID: team.league_id } });
                        }
                        else if (teamCount === 6) {
                            navigate('/ready', { state: { teamName, leagueID: team.league_id } });
                        }
                        else {
                            navigate('/unready', { state: { teamName, leagueID: team.league_id } });
                        }
                    }
                    catch (err) {
                        setError(err.message);
                    }
                }}>
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
                    <button type="submit">Login</button>
                </form>
            </div>
        </main>
    );
}

export default LoginPage;