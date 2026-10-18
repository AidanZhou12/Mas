const API_URL = import.meta.env.VITE_API_URL;

export async function getDraftStatus(leagueID) {
    const response = await fetch(`${API_URL}/drafts/${leagueID}/status`);
    if (!response.ok) {
        throw new Error('Failed to fetch draft status');
    }
    const data = await response.json();
    return data;
}

export async function draftPlayer(teamName, playerID) {
    const response = await fetch(`${API_URL}/drafts/${teamName}/${playerID}/pick`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ team_name: teamName, player_id: playerID }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.detail || 'Failed to draft player');
        error.status = response.status;
        throw error;
    }

    return response.json();
}

export async function getRoster(teamName) {
    const response = await fetch(`${API_URL}/teams/${teamName}`);
    if (!response.ok) {
        throw new Error('Failed to fetch team roster');
    }
    const team = await response.json();
    return team.players;
}

export async function getAvailablePlayers(leagueID) {
    const response = await fetch(`${API_URL}/leagues/${leagueID}/available`);
    if (!response.ok) {
        throw new Error('Failed to fetch available players');
    }
    const data = await response.json();
    return data;
}

// export async function playerRow(name, position, school, onDraft) {
//     return (
//         <tr key={player.id}>
//             <td>{name}</td>
//             <td>{position}</td>
//             <td>{school}</td>
//             <td><button onClick={onDraft}>Draft</button></td>
//         </tr>
//     );
// }

export async function getTeams(leagueID) {
    const response = await fetch(`${API_URL}/leagues/id/${leagueID}`);
    if (!response.ok) {
        throw new Error('Failed to fetch teams');
    }
    const data = await response.json();
    return data.teams;
}

export function whosTurn(pick) {
    const round = Math.floor((pick - 1) / 6);
    const position = (pick - 1) % 6;

    return round % 2 === 0 ? position + 1 : 6 - position;
}

export function pickingTeam(teams, currentTurn) {
    for (const team of teams) {
        if (team.draft_position === currentTurn) {
            return team.name;
        }
    }
    return null;
}