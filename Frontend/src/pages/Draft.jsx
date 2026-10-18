import { Link, useLocation, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { getDraftStatus, draftPlayer, getRoster, getAvailablePlayers, getTeams, whosTurn, pickingTeam as findPickingTeam } from '../api/draft';
import './pages.css';

const ROSTER_LIMITS = { QB: 1, RB: 2, WR: 3, TE: 1 };

function DraftPage() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [pickError, setPickError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [positionFilter, setPositionFilter] = useState('All');
    const [availablePlayers, setAvailablePlayers] = useState([]);
    const [draftStatus, setDraftStatus] = useState('');
    const [pickingTeam, setPickingTeam] = useState(null);

    const [roster, setRoster] = useState([]);
    const leagueID = state?.leagueID;
    const teamName = state?.teamName;
    const rosterSlots = Object.entries(ROSTER_LIMITS).flatMap(([position, limit]) => {
        const players = roster.filter(player => player.position === position);
        return Array.from({ length: limit }, (_, index) => ({
            label: limit === 1 ? position : `${position} ${index + 1}`,
            player: players[index],
        }));
    });
    const filteredPlayers = availablePlayers.filter((player) =>
        player.name.toLowerCase().includes(searchText.trim().toLowerCase()) &&
        (positionFilter === 'All' || player.position === positionFilter)
    );

    useEffect(() => {
        if (!leagueID || !teamName) return;

        let cancelled = false;
        let timer;
        let completed = false;

        async function loadDraft() {
            try {
                const [draft, teams, players, roster] = await Promise.all([
                    getDraftStatus(leagueID),
                    getTeams(leagueID),
                    getAvailablePlayers(leagueID),
                    getRoster(teamName),
                ]);

                if (cancelled) return;

                const turn = whosTurn(draft.current_pick);
                completed = draft.status === 'completed';

                setDraftStatus(draft.status);
                setPickingTeam(findPickingTeam(teams, turn));
                setAvailablePlayers(players);
                setRoster(roster);
                setError('');
            } catch (err) {
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                    if (!completed) timer = setTimeout(loadDraft, 2000);
                }
            }
        }

        loadDraft();

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [leagueID, teamName, refreshVersion]);

    async function handleDraft(playerID) {
        setSubmitting(true);
        setPickError('');

        try {
            await draftPlayer(teamName, playerID);
        } catch (err) {
            if (err.status === 403) {
                navigate('/season-started', { replace: true });
                return;
            }
            setPickError(err.message);
        } finally {
            setSubmitting(false);
            setRefreshVersion(version => version + 1);
        }
    }

    if (!leagueID || !teamName) {
        return <Link to="/login">Log in to enter the draft</Link>;
    }

    if (draftStatus === 'completed') {
        return (
            <main>
                <h1>Draft Completed</h1>
                <p>The draft has been completed. You may now enter the league page.</p>
                <Link to="/league" state={{ teamName: state.teamName, leagueID: state.leagueID }}>Enter League</Link>
            </main>
        );
    }

    else {
        return (
            <main className="draft-page">
                <h1>Draft Page</h1>
                <h2>Picking: {pickingTeam}</h2>
                <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}>
                    <option value="All">All</option>
                    <option value="QB">QB</option>
                    <option value="RB">RB</option>
                    <option value="WR">WR</option>
                    <option value="TE">TE</option>
                </select>
                <input
                    type="text"
                    placeholder="Search by name"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                />
                <h2>Available Players</h2>
                {loading && <p>Loading...</p>}
                {(pickError || error) && <p>{pickError || error}</p>}
                <div className="draft-players-scroll" role="region" aria-label="Available players" tabIndex={0}>
                <table><tbody>
                {filteredPlayers.map((player) => <tr key={player.id}>
                    <td>{player.name}</td>
                    <td>{player.position}</td>
                    <td>{player.school}</td>
                    <td><button disabled={submitting || loading || draftStatus !== 'started'} onClick={() => handleDraft(player.id)}>Draft</button></td>
                </tr>)}
                </tbody></table>
                </div>
                <h2>Your Team</h2>
                {loading && <p>Loading...</p>}
                {error && <p>{error}</p>}
                <div className="draft-roster">
                <table><tbody>
                {rosterSlots.map((slot) => <tr key={slot.label}>
                    <td>{slot.label}</td>
                    <td>{slot.player?.name ?? 'Empty'}</td>
                    <td>{slot.player?.school ?? '—'}</td>
                </tr>)}
                </tbody></table>
                </div>
            </main>
        )
    }
}

export default DraftPage;
