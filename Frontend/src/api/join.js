const API_URL = import.meta.env.VITE_API_URL;

export async function createTeam(leagueName, teamName, password) {
    const league_response = await fetch(`${API_URL}/leagues/${leagueName}`);
    if (!league_response.ok) {
        const errorData = await league_response.json();
        throw new Error(errorData.detail || 'League not found');
    }
    const league = await league_response.json();

    const response = await fetch(`${API_URL}/teams`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: teamName, password, league_id: league.id }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.detail || 'Failed to create team');
        error.status = response.status;
        throw error;
    }

    return response.json();
}

export async function getCount(leagueName) {
    const response = await fetch(`${API_URL}/leagues/${leagueName}`);
    if (!response.ok) {
        throw new Error('Failed to fetch league');
    }
    const league = await response.json();
    return league.teams.length;
}

export async function getDraftStatus(leagueName) {
    const response = await fetch(`${API_URL}/leagues/${leagueName}`);
    if (!response.ok) {
        throw new Error('Failed to fetch league');
    }
    const league = await response.json();
    return league.draft.status;
}

export async function getLeagueID(leagueName) {
    const response = await fetch(`${API_URL}/leagues/${leagueName}`);
    if (!response.ok) {
        throw new Error('Failed to fetch league');
    }
    const league = await response.json();
    return league.id;
}