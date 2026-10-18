from fastapi import Depends, APIRouter, status, HTTPException
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select
import models
from database import get_db
from scheduling import generate_regular_season_schedule
from season import require_draft_eligible
from typing import Annotated
from schemas import TeamBase, TeamCreate, TeamResponse, DraftRequest, DraftResponse, RosterPlayerResponse, LeagueResponse, MatchupResponse, PlayerResponse

router = APIRouter()

NUM_TEAMS = 6

MAX_ROSTER_SIZE = 7

TOTAL_PICKS = NUM_TEAMS * MAX_ROSTER_SIZE

ROSTER_LIMITS = {
    "QB": 1,
    "RB": 2,
    "WR": 3,
    "TE": 1,
}

def get_current_turn(pick: int) -> int:
    round_number = (pick - 1) // NUM_TEAMS
    position_in_round = (pick - 1) % NUM_TEAMS
    if (round_number % 2) == 0:
        return position_in_round + 1
    else:
        return NUM_TEAMS - position_in_round

@router.patch("/{league_id}/start", response_model=DraftResponse)
def start_draft(league_id: int, db: Annotated[Session, Depends(get_db)]):
    league = db.execute(select(models.League).where(models.League.id == league_id).options(selectinload(models.League.teams), selectinload(models.League.draft))).scalar_one_or_none()
    if not league:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="League not found")
    require_draft_eligible(league.draft.status if league.draft else None)
    if league.draft.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Draft has already started or completed")
    if len(league.teams) != NUM_TEAMS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"League needs {NUM_TEAMS} teams to start drafting")
    league.draft.status = "started"
    db.commit()
    db.refresh(league.draft)
    return league.draft

@router.get("/{league_id}/status", response_model=DraftResponse)
def get_draft_status(league_id: int, db: Annotated[Session, Depends(get_db)]):
    league = db.execute(select(models.League).where(models.League.id == league_id).options(selectinload(models.League.draft))).scalar_one_or_none()
    if not league:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="League not found")
    return league.draft

@router.patch("/{teamName}/{player_id}/pick", response_model=RosterPlayerResponse)
def draft_player(teamName: str, player_id: int, db: Annotated[Session, Depends(get_db)]):
    team = db.execute(select(models.Team).where(models.Team.name == teamName).options(selectinload(models.Team.league), selectinload(models.Team.players))).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    league = team.league
    draft = league.draft
    require_draft_eligible(draft.status if draft else None)
    if draft.status != "started":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Draft is not currently active")
    if draft.current_pick > TOTAL_PICKS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Draft has already completed")
    current_turn = get_current_turn(draft.current_pick)
    if team.draft_position != current_turn:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="It's not your turn to pick")
    player = db.execute(select(models.Player).where(models.Player.id == player_id).options(selectinload(models.Player.teams))).scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    if player in team.players:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Player has already been drafted by your team")
    opponents = db.execute(select(models.Team).where(models.Team.league_id == league.id, models.Team.id != team.id).options(selectinload(models.Team.players))).scalars().all()
    for opponent in opponents:
        if player in opponent.players:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Player has already been drafted by another team")
    position_count = sum(1 for p in team.players if p.position == player.position)
    if position_count >= ROSTER_LIMITS.get(player.position, 0):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot draft more players for position {player.position}")
    team.players.append(player)
    draft.current_pick += 1
    if draft.current_pick > TOTAL_PICKS:
        draft.status = "completed"
        generate_regular_season_schedule(db, league)
    db.commit()
    db.refresh(player)
    return player
