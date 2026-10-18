const API_URL = import.meta.env.VITE_API_URL;

export async function getTeam(teamName) {
    const response = await fetch(`${API_URL}/teams/${teamName}`);
    if (!response.ok) {
        throw new Error('Failed to fetch team');
    }
    const team = await response.json();
    return team.players;
}

export async function getRoster(teamID) {
    const team = await getTeamByID(teamID);
    return team.players;
}

export async function getTeamByID(teamID) {
    const response = await fetch(`${API_URL}/teams/id/${teamID}`);
    if (!response.ok) {
        throw new Error('Failed to fetch roster');
    }
    return response.json();
}

export async function getMatchup(teamName) {
    const response = await fetch(`${API_URL}/teams/${teamName}/matchup`);
    if (response.status === 404) {
        const error = await response.json();
        if (error.detail === 'Matchup not found for the current week') return null;
    }
    if (!response.ok) {
        throw new Error('Failed to fetch matchup');
    }
    const matchup = await response.json();
    return matchup;
}

export async function getAvailablePlayers(leagueID) {
    const response = await fetch(`${API_URL}/leagues/${leagueID}/available`);
    if (!response.ok) {
        throw new Error('Failed to fetch available players');
    }
    const data = await response.json();
    return data;
}

export async function getLeague(leagueID) {
    const response = await fetch(`${API_URL}/leagues/id/${leagueID}`);
    if (!response.ok) {
        throw new Error('Failed to fetch teams');
    }
    const data = await response.json();
    return data;
}

export async function getAllTeams(leagueID) {
    const league = await getLeague(leagueID);
    return league.teams;
}

export async function getStandings(leagueID, leagueData) {
    const league = leagueData ?? await getLeague(leagueID);
    return buildStandings(league.teams, league.current_week);
}

function compareNames(a, b) {
    const first = a.toLowerCase();
    const second = b.toLowerCase();
    return first < second ? -1 : first > second ? 1 : a < b ? -1 : a > b ? 1 : 0;
}

function winPercentage(team) {
    const games = team.wins + team.losses + team.ties;
    return games ? (team.wins + team.ties * 0.5) / games : 0;
}

export function buildStandings(teams, currentWeek = Infinity) {
    return teams.map(team => {
        const record = { id: team.id, name: team.name, wins: 0, losses: 0, ties: 0, points: 0 };
        const games = [
            ...team.home_matchups.map(game => ({ game, scored: game.home_score, allowed: game.away_score })),
            ...team.away_matchups.map(game => ({ game, scored: game.away_score, allowed: game.home_score })),
        ];
        for (const { game, scored, allowed } of games) {
            // Only completed weeks count; future 0-0 games are not ties.
            if (game.matchup_type !== 'regular' || game.week >= currentWeek ||
                scored == null || allowed == null) continue;
            record.points += scored;
            if (scored > allowed) record.wins++;
            else if (scored < allowed) record.losses++;
            else record.ties++;
        }
        record.points = Math.round(record.points * 100) / 100;
        record.winPercentage = winPercentage(record);
        return record;
    }).sort((a, b) =>
        b.winPercentage - a.winPercentage ||
        b.points - a.points || compareNames(a.name, b.name)
    );
}

export function getFinalResults(league) {
    const standings = buildStandings(league.teams, league.current_week);
    const championship = league.matchups.find(game => game.matchup_type === 'championship');
    if (!championship) return { winner: null, standings };
    const home = standings.find(team => team.id === championship.home_team_id);
    const away = standings.find(team => team.id === championship.away_team_id);
    if (!home || !away) return { winner: null, standings };
    if (championship.home_score == null || championship.away_score == null) {
        const finalists = standings.filter(team => team.id === home.id || team.id === away.id);
        return {
            winner: null,
            standings: [...finalists, ...standings.filter(team => team.id !== home.id && team.id !== away.id)],
        };
    }
    // Equal championship scores also add equal season points, so regular-season
    // totals give the same season-points tiebreaker before adding this game.
    const homeWon = championship.home_score > championship.away_score || (
        championship.home_score === championship.away_score && (
            home.points > away.points ||
            (home.points === away.points && compareNames(home.name, away.name) < 0)
        )
    );
    const winner = homeWon ? home : away;
    const runnerUp = homeWon ? away : home;
    winner.wins += 1;
    runnerUp.losses += 1;
    home.points += championship.home_score;
    away.points += championship.away_score;
    winner.winPercentage = winPercentage(winner);
    runnerUp.winPercentage = winPercentage(runnerUp);
    return {
        winner: winner.name,
        standings: [winner, runnerUp, ...standings.filter(team => team.id !== home.id && team.id !== away.id)],
    };
}

export async function getPoints(leagueID, playerID) {
    const response = await fetch(`${API_URL}/leagues/id/${leagueID}`);
    const league = await response.json();
    let week = league.current_week;
    week += 8;
    const points = await fetch(`${API_URL}/teams/${week}/${playerID}/score`);
    const score = await points.json();
    return score;
}
