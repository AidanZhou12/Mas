from fastapi import Depends, APIRouter, status, HTTPException
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select
from database import get_db
import models
from typing import Annotated
from schemas import TeamCreate, TeamLogin, TeamResponse, MatchupResponse

from security import hash_password, verify_password
from waivers import waiver_status
from season import require_registration_open

router = APIRouter()

@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(team: TeamCreate, db: Annotated[Session, Depends(get_db)]):
    require_registration_open()
    league = db.execute(select(models.League).where(models.League.id == team.league_id)).scalar_one_or_none()
    if not league:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="League not found")
    if len(league.teams) >= 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="League already has 6 teams")
    draft_position = len(league.teams) + 1
    statement = select(models.Team).where(models.Team.name == team.name)
    existing_team = db.execute(statement).scalar_one_or_none()
    if existing_team:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Team with this name already exists")
    new_team = models.Team(
        name=team.name,
        password_hash=hash_password(team.password),
        league_id=team.league_id,
        draft_position=draft_position
    )
    db.add(new_team)
    db.commit()
    db.refresh(new_team)
    return new_team

@router.post("/login", response_model=TeamResponse)
def login_team(credentials: TeamLogin, db: Annotated[Session, Depends(get_db)]):
    team = db.execute(select(models.Team).where(models.Team.name == credentials.name)).scalar_one_or_none()
    if team is None or not verify_password(credentials.password, team.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid team name or password")
    return team

@router.get("/waivers/status")
def get_waiver_status():
    return waiver_status()


@router.get("/{name}", response_model=TeamResponse)
def get_team(name: str, db: Annotated[Session, Depends(get_db)]):
    team = db.execute(select(models.Team).where(models.Team.name == name).options(selectinload(models.Team.players), selectinload(models.Team.home_matchups), selectinload(models.Team.away_matchups))).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return team

@router.get("/id/{team_id}", response_model=TeamResponse)
def get_team_by_id(team_id: int, db: Annotated[Session, Depends(get_db)]):
    team = db.execute(select(models.Team).where(models.Team.id == team_id).options(selectinload(models.Team.players), selectinload(models.Team.home_matchups), selectinload(models.Team.away_matchups))).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return team

@router.get("/{name}/matchup", response_model=MatchupResponse)
def get_current_matchup(name: str, db: Annotated[Session, Depends(get_db)]):
    team = db.execute(select(models.Team).where(models.Team.name == name).options(selectinload(models.Team.league))).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    current_week = team.league.current_week
    matchup = db.execute(select(models.Matchup).where(
        ((models.Matchup.home_team_id == team.id) | (models.Matchup.away_team_id == team.id)) &
        (models.Matchup.week == current_week)
    )).scalar_one_or_none()
    if not matchup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Matchup not found for the current week")
    return matchup

@router.patch("/{team_id}/swap", response_model=TeamResponse)
def swap_players(team_id: int, player1_id: int, player2_id: int, db: Annotated[Session, Depends(get_db)]):
    if waiver_status()["locked"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Waivers are locked until Monday at 12:00 AM Central.",
        )
    team = db.execute(select(models.Team).where(models.Team.id == team_id).options(selectinload(models.Team.players))).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    player1 = db.execute(select(models.Player).where(models.Player.id == player1_id)).scalar_one_or_none()
    player2 = db.execute(select(models.Player).where(models.Player.id == player2_id)).scalar_one_or_none()
    if not player1 or not player2:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or both players not found")
    if player1 not in team.players:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Player to drop is not on the team")
    if player2 in team.players:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Player to add is already on the team")
    other_owner = db.execute(select(models.Team).where(
        models.Team.league_id == team.league_id,
        models.Team.id != team.id,
        models.Team.players.any(models.Player.id == player2_id),
    )).scalars().first()
    if other_owner:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Player to add is already on another team in the league")
    if player1.position != player2.position:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Players must be of the same position to swap")
    team.players.remove(player1)
    team.players.append(player2)
    db.commit()
    db.refresh(team)
    return team

@router.get("/{week}/{player_cfbd_id}/score", response_model=float)
def get_player_score(week: int, player_cfbd_id: int, db: Annotated[Session, Depends(get_db)]):
    player = db.execute(select(models.Player).where(models.Player.cfbd_id == player_cfbd_id)).scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    game = db.execute(select(models.Game).where(
        (models.Game.week == week) &
        ((models.Game.home_team == player.school) | (models.Game.away_team == player.school))
    )).scalar_one_or_none()
    if not game:
        return 0.0
    boxscore = game.boxscore
    score = 0.0
    id_string = str(player.cfbd_id)
    index = 0 if boxscore[0]["team"] == player.school else 1
    passing_yards = boxscore[index]["categories"][0]["types"][1]["athletes"]
    for passer in passing_yards:
        if passer["id"] == id_string:
            score += int(passer["stat"]) * 0.04
    passing_tds = boxscore[index]["categories"][0]["types"][3]["athletes"]
    for thrower in passing_tds:
        if thrower["id"] == id_string:
            score += int(thrower["stat"]) * 4
    interceptions = boxscore[index]["categories"][0]["types"][4]["athletes"]
    for tosser in interceptions:
        if tosser["id"] == id_string:
            score -= int(tosser["stat"]) * 2
    rushing_yards = boxscore[index]["categories"][1]["types"][1]["athletes"]
    for rusher in rushing_yards:
        if rusher["id"] == id_string:
            score += int(rusher["stat"]) * 0.1
    rushing_tds = boxscore[index]["categories"][1]["types"][3]["athletes"]
    for runner in rushing_tds:
        if runner["id"] == id_string:
            score += int(runner["stat"]) * 6
    receptions = boxscore[index]["categories"][2]["types"][0]["athletes"]
    for receiver in receptions:
        if receiver["id"] == id_string:
            score += int(receiver["stat"])
    receiving_yards = boxscore[index]["categories"][2]["types"][1]["athletes"]
    for receiver in receiving_yards:
        if receiver["id"] == id_string:
            score += int(receiver["stat"]) * 0.1
    receiving_tds = boxscore[index]["categories"][2]["types"][3]["athletes"]
    for receiver in receiving_tds:
        if receiver["id"] == id_string:
            score += int(receiver["stat"]) * 6
    fumblers = boxscore[index]["categories"][3]["types"][1]["athletes"]
    for fum in fumblers:
        if fum["id"] == id_string:
            score -= int(fum["stat"]) * 2
    return score



    


    
