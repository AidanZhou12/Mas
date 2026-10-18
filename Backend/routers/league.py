from fastapi import Depends, APIRouter, status, HTTPException
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select
from database import get_db
from typing import Annotated
from schemas import LeagueCreate, LeagueBase, LeagueResponse, PlayerResponse
import models
from season import require_registration_open, registration_status, draft_eligibility

router = APIRouter()

@router.post("", response_model=LeagueResponse, status_code=status.HTTP_201_CREATED)
def create_league(league: LeagueCreate, db: Annotated[Session, Depends(get_db)]):
    require_registration_open()
    statement = select(models.League).where(models.League.name == league.name)
    existing_league = db.execute(statement).scalar_one_or_none()
    if existing_league:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="League with this name already exists")
    new_league = models.League(name=league.name)
    new_draft = models.Draft(league=new_league)
    db.add(new_league)
    db.add(new_draft)
    db.commit()
    db.refresh(new_league)
    return new_league

@router.get("", response_model=list[LeagueResponse])
def get_leagues(db: Annotated[Session, Depends(get_db)]):
    leagues = db.execute(select(models.League)).scalars().all()
    return leagues

@router.get("/registration/status")
def get_registration_status():
    return registration_status()


@router.get("/id/{id}/eligibility")
def get_league_eligibility(id: int, db: Annotated[Session, Depends(get_db)]):
    league = db.execute(select(models.League).where(models.League.id == id).options(selectinload(models.League.draft))).scalar_one_or_none()
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    return draft_eligibility(league.draft.status if league.draft else None)


@router.get("/{name}", response_model=LeagueResponse)
def get_league(name: str, db: Annotated[Session, Depends(get_db)]):
    league = db.execute(select(models.League).where(models.League.name == name).options(selectinload(models.League.teams), selectinload(models.League.draft))).scalar_one_or_none()
    if not league:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="League not found")
    return league

@router.get("/id/{id}", response_model=LeagueResponse)
def get_league_by_id(id: int, db: Annotated[Session, Depends(get_db)]):
    league = db.execute(select(models.League).where(models.League.id == id).options(selectinload(models.League.teams), selectinload(models.League.draft))).scalar_one_or_none()
    if not league:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="League not found")
    return league

@router.get("/{id}/available", response_model = list[PlayerResponse])
def get_available_players(id: int, db: Annotated[Session, Depends(get_db)]):
    league = db.execute(select(models.League).where(models.League.id == id).options(selectinload(models.League.teams).selectinload(models.Team.players))).scalar_one_or_none()
    if not league:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="League not found")
    players = db.execute(select(models.Player).options(selectinload(models.Player.teams))).scalars().all()
    available_players = []
    teams = league.teams
    for player in players:
        if not any(player in team.players for team in teams):
            available_players.append(player)
    return available_players
