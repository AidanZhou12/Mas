import { useRef, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { getTeam, getMatchup, getTeamByID, getAvailablePlayers, getStandings, getPoints, getLeague, getFinalResults } from '../api/league';
import './pages.css';
import { getWaiverStatus } from '../api/waiver';

const TABS = ['Team', 'Matchup', 'Waivers', 'Standings'];
const POSITION_ORDER = { QB: 0, RB: 1, WR: 2, TE: 3 };

function LeaguePage() {
    const [activeTab, setActiveTab] = useState(0);
    const [roster, setRoster] = useState([]);
    const [availablePlayers, setAvailablePlayers] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [positionFilter, setPositionFilter] = useState('All');
    const [matchup, setMatchup] = useState(null);
    const [homeRoster, setHomeRoster] = useState([]);
    const [awayRoster, setAwayRoster] = useState([]);
    const [homeTeamName, setHomeTeamName] = useState('');
    const [awayTeamName, setAwayTeamName] = useState('');
    const [matchupLoading, setMatchupLoading] = useState(true);
    const [matchupError, setMatchupError] = useState('');
    const [allTeams, setAllTeams] = useState([]);
    const [winner, setWinner] = useState(null);
    const [currentWeek, setCurrentWeek] = useState(null);
    const [waiversLocked, setWaiversLocked] = useState(null);
    const tabRefs = useRef([]);
    const { state } = useLocation();
    const navigate = useNavigate();
    const teamName = state?.teamName;
    const leagueID = state?.leagueID;
    const finishingPlace = allTeams.findIndex(team => team.name === teamName) + 1;
    const missedChampionship = currentWeek === 5 && !matchup && finishingPlace > 2;
    const filteredPlayers = availablePlayers.filter(player =>
        player.name.toLowerCase().includes(searchText.trim().toLowerCase()) &&
        (positionFilter === 'All' || player.position === positionFilter)
    );
    const sortedRoster = [...roster].sort((a, b) =>
        (POSITION_ORDER[a.position] ?? 4) - (POSITION_ORDER[b.position] ?? 4)
    );

    function handleTabKeyDown(event, index) {
        let nextTab;
        if (event.key === 'ArrowRight') nextTab = (index + 1) % TABS.length;
        else if (event.key === 'ArrowLeft') nextTab = (index - 1 + TABS.length) % TABS.length;
        else if (event.key === 'Home') nextTab = 0;
        else if (event.key === 'End') nextTab = TABS.length - 1;
        else return;

        event.preventDefault();
        setActiveTab(nextTab);
        tabRefs.current[nextTab].focus();
    }

    useEffect(() => {
        let cancelled = false;
        let timer;
        async function refreshWaivers() {
            window.clearTimeout(timer);
            let delay = 60_000;
            try {
                const status = await getWaiverStatus();
                if (cancelled) return;
                setWaiversLocked(status.locked);
                delay = Math.max(100, Math.min(delay,
                    Date.parse(status.next_change) - Date.parse(status.server_time)));
            } catch {
                if (!cancelled) setWaiversLocked(null);
            }
            if (!cancelled) timer = window.setTimeout(refreshWaivers, delay);
        }
        refreshWaivers();
        window.addEventListener('focus', refreshWaivers);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
            window.removeEventListener('focus', refreshWaivers);
        };
    }, []);

    useEffect(() => {
        if (!teamName || !leagueID) return;
        let cancelled = false;
        async function loadLeagueData() {
            setMatchupLoading(true);
            setMatchupError('');
            try {
                const leagueData = await getLeague(leagueID);
                if (cancelled) return;
                setCurrentWeek(leagueData.current_week);
                if (leagueData.current_week >= 6) {
                    const results = getFinalResults(leagueData);
                    setAllTeams(results.standings);
                    setWinner(results.winner);
                    return;
                }
                const [teamRoster, availablePlayersData, matchupData, allTeamsData] = await Promise.all([
                    getTeam(teamName),
                    getAvailablePlayers(leagueID),
                    getMatchup(teamName),
                    getStandings(leagueID, leagueData),
                ]);
                if (cancelled) return;
                setRoster(teamRoster);
                setAvailablePlayers(availablePlayersData);
                setMatchup(matchupData);
                setAllTeams(allTeamsData);
                setCurrentWeek(leagueData.current_week);
                if (!matchupData) {
                    setHomeRoster([]);
                    setAwayRoster([]);
                    return;
                }
                const [homeRosterData, awayRosterData] = await Promise.all([
                    getTeamByID(matchupData.home_team_id),
                    getTeamByID(matchupData.away_team_id),
                ]);
                if (cancelled) return;
                for (const player of homeRosterData.players) {
                    const points = await getPoints(leagueID, player.cfbd_id);
                    player.points = points;
                }
                for (const player of awayRosterData.players) {
                    const points = await getPoints(leagueID, player.cfbd_id);
                    player.points = points;
                }
                if (cancelled) return;
                setHomeRoster(homeRosterData.players);
                setAwayRoster(awayRosterData.players);
                setHomeTeamName(homeRosterData.name);
                setAwayTeamName(awayRosterData.name);
            } catch (error) {
                console.error('Error loading league data:', error);
                if (!cancelled) setMatchupError(error.message);
            } finally {
                if (!cancelled) setMatchupLoading(false);
            }
        }

        loadLeagueData();
        return () => { cancelled = true; };
    }, [teamName, leagueID]);

    if (!teamName || !leagueID) {
        return (
            <main>
                <p>Error: Missing team name or league ID.</p>
                <Link to="/login">Go back to login</Link>
            </main>
        );
    }

    if (currentWeek >= 6) {
        return (
            <main className="league-page has-page-navigation">
                <Link to="/" replace state={null} className="back-button">Logout</Link>
                {matchupLoading ? <p>Loading final standings...</p> :
                    matchupError ? <p role="alert">{matchupError}</p> : <>
                        <h1>{winner ? `${winner} Won` : 'Championship Result Pending'}</h1>
                        <h2>League Standings</h2>
                        <div className="league-roster">
                            {allTeams.map((team, index) => (
                                <div className="league-roster-row" key={team.id}>
                                    <span>{index + 1}: {team.name}</span>
                                    <span className="league-roster-school">{team.wins}-{team.losses}-{team.ties}</span>
                                </div>
                            ))}
                        </div>
                    </>}
            </main>
        );
    }

    return (
        <main className="league-page has-page-navigation">
            <Link to="/" replace state={null} className="back-button">Logout</Link>
            <div className="league-tabs" role="tablist" aria-label="League sections">
                {TABS.map((label, index) => (
                    <button
                        key={label}
                        ref={element => { tabRefs.current[index] = element; }}
                        type="button"
                        role="tab"
                        id={`league-tab-${index}`}
                        aria-controls={`league-panel-${index}`}
                        aria-selected={activeTab === index}
                        tabIndex={activeTab === index ? 0 : -1}
                        onClick={() => setActiveTab(index)}
                        onKeyDown={event => handleTabKeyDown(event, index)}
                    >
                        {label}
                    </button>
                ))}
            </div>
            {TABS.map((label, index) => (
                <section
                    key={label}
                    role="tabpanel"
                    id={`league-panel-${index}`}
                    aria-labelledby={`league-tab-${index}`}
                    hidden={activeTab !== index}
                    tabIndex={0}
                >
                    <h1>{label}</h1>
                    {label === 'Team' && (
                        <div className="league-roster">
                            {sortedRoster.map(player => (
                                <div className="league-roster-row" key={player.id}>
                                    <span>{player.position}: {player.name}</span>
                                    <span className="league-roster-school">{player.school}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {label === 'Matchup' && (
                        matchupLoading ? <p>Loading matchup...</p> :
                        matchupError ? <p role="alert">{matchupError}</p> :
                        missedChampionship ? <div>
                            <h1>You Did Not Make the Championship</h1>
                            <h2>You Finished In {finishingPlace}{finishingPlace === 3 ? 'rd' : 'th'} Place</h2>
                        </div> :
                        matchup ? <div className="league-matchup">
                            {[
                                { side: 'Home', name: homeTeamName, score: homeRoster.reduce((total, player) => total + player.points, 0), players: homeRoster },
                                { side: 'Away', name: awayTeamName, score: awayRoster.reduce((total, player) => total + player.points, 0), players: awayRoster },
                            ].map(team => (
                                <section className="league-matchup-team" key={team.side} aria-label={`${team.side} team`}>
                                    <div className="league-matchup-header">
                                        <div>
                                            <p>{team.side}</p>
                                            <h2>{team.name}</h2>
                                        </div>
                                        <p className="league-matchup-score">{team.score.toFixed(2)} <span>pts</span></p>
                                    </div>
                                    <div className="league-roster">
                                        {[...team.players].sort((a, b) =>
                                            (POSITION_ORDER[a.position] ?? 4) - (POSITION_ORDER[b.position] ?? 4)
                                        ).map(player => (
                                            <div className="league-roster-row" key={player.id}>
                                                <span>{player.position}: {player.name}</span>
                                                <span className="league-roster-school">{player.points.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div> : <p>No matchup available.</p>
                    )}
                    {label === 'Waivers' && (
                        <div className="league-waivers">
                            <div className="league-waivers-filters">
                                <select
                                    aria-label="Filter by position"
                                    value={positionFilter}
                                    onChange={event => setPositionFilter(event.target.value)}
                                >
                                    {['All', 'QB', 'RB', 'WR', 'TE'].map(position => (
                                        <option key={position} value={position}>{position}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    aria-label="Search players by name"
                                    placeholder="Search by name"
                                    value={searchText}
                                    onChange={event => setSearchText(event.target.value)}
                                />
                            </div>
                            <h2>Available Players</h2>
                            {waiversLocked === true && (
                                <p>Waivers are locked until Monday at 12:00 AM Central.</p>
                            )}
                            <div className="league-waivers-table">
                                <table aria-label="Available players">
                                    <tbody>
                                        {filteredPlayers.map(player => (
                                            <tr key={player.id}>
                                                <td>{player.name}</td>
                                                <td>{player.position}</td>
                                                <td>{player.school}</td>
                                                {waiversLocked === false && <td>
                                                    <button
                                                        type="button"
                                                        aria-label={`Add ${player.name}`}
                                                        onClick={() => navigate('/waiver', {
                                                            state: { teamName, leagueID, player },
                                                        })}
                                                    >
                                                        Add
                                                    </button>
                                                </td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {label === 'Standings' && (
                        <div className="league-roster">
                            {allTeams.map((team, index) => (
                                <div className="league-roster-row" key={team.name}>
                                    <span>{index + 1}: {team.name}</span>
                                    <span className="league-roster-school" aria-label={`Record: ${team.wins} wins, ${team.losses} losses, ${team.ties} ties`}>
                                        {team.wins}-{team.losses}-{team.ties}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            ))}
        </main>
    );
}

export default LeaguePage;
