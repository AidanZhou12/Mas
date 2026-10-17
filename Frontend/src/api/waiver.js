const API_URL = import.meta.env.VITE_API_URL;

export async function getWaiverStatus() {
    const response = await fetch(`${API_URL}/teams/waivers/status`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch waiver status');
    return response.json();
}

export async function getPosition(teamName, position) {
    const response = await fetch(`${API_URL}/teams/${teamName}`);
    if (!response.ok) {
        throw new Error('Failed to fetch team');
    }
    const team = await response.json();
    let result = [];
    for (const player of team.players) {
        if (player.position === position) {
            result.push(player);
        }
    }
    return result;
}

export async function addPlayerToTeam(teamName, player1, player2) {
    const teamResponse = await fetch(`${API_URL}/teams/${encodeURIComponent(teamName)}`);
    if (!teamResponse.ok) {
        throw new Error('Failed to fetch team');
    }
    const team = await teamResponse.json();
    const params = new URLSearchParams({ player1_id: player1, player2_id: player2 });
    const response = await fetch(`${API_URL}/teams/${team.id}/swap?${params}`, {
        method: 'PATCH',
    });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Failed to swap players');
    }
    return response.json();
}
