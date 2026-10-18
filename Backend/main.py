from fastapi import FastAPI
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select
from routers import teams, league, draft
import models
from database import SessionLocal, engine
from cfbd import fetch_box_scores
import os
import logging
from dotenv import load_dotenv
from timezones import APP_TIMEZONE
from standings import rank_regular_season
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

load_dotenv()

API_KEY = os.getenv("CFBD_API_KEY")
if API_KEY is None:
    raise RuntimeError("CFBD_API_KEY environment variable is not set")

url = "https://api.collegefootballdata.com/"
headers = {"Authorization": f"Bearer {API_KEY}"}

FINAL_FANTASY_WEEK = 6
SEASON_JOBS_START = datetime(2026, 10, 27, tzinfo=APP_TIMEZONE)
SEASON_JOBS_END = datetime(2026, 11, 29, tzinfo=APP_TIMEZONE)
logger = logging.getLogger("uvicorn.error")

def get_scores():
    schools = ["Alabama", "Arkansas", "Auburn", "Florida", "Georgia", "Kentucky", "LSU", "Mississippi State", "Missouri", "Ole Miss", "South Carolina", "Tennessee", "Texas A&M", "Vanderbilt","Texas", "Oklahoma"]
    conferences = ["SEC", "Big 12", "ACC", "Big Ten"]
    # Fantasy week 1 corresponds to college football week 9.
    week_offset = 8
    failed_schools = 0
    # All leagues share the same week; fetch each school only once per run.
    with SessionLocal() as session:
        week = session.execute(
            select(models.League.current_week).order_by(models.League.id).limit(1)
        ).scalar_one_or_none()
    if week is None:
        logger.info("get_scores finished: no leagues to update.")
        return
    college_week = week + week_offset
    for school in schools:
        data = fetch_box_scores(
            url + "games/players", headers,
            {"year": 2026, "week": college_week, "team": school},
        )
        if data is None:
            failed_schools += 1
            continue
        if data == []:
            continue
        home_conference = data[0]["teams"][1]["conference"]
        away_conference = data[0]["teams"][0]["conference"]
        if home_conference not in conferences or away_conference not in conferences:
            continue
        with SessionLocal() as session:
            statement = select(models.Game).where(models.Game.cfbd_id == data[0]["id"])
            existing_game = session.execute(statement).scalar_one_or_none()
            if existing_game is None:
                new_game = models.Game(
                    cfbd_id=data[0]["id"],
                    week=college_week,
                    home_team=data[0]["teams"][1]["team"],
                    away_team=data[0]["teams"][0]["team"],
                    boxscore=data[0]["teams"]
                )
                session.add(new_game)
            else:
                existing_game.week = college_week
                existing_game.home_team = data[0]["teams"][1]["team"]
                existing_game.away_team = data[0]["teams"][0]["team"]
                existing_game.boxscore = data[0]["teams"]
            session.commit()
    with SessionLocal() as session:
        command = select(models.League).where(
            models.League.draft.has(models.Draft.status == "completed")
        ).options(
            selectinload(models.League.matchups)
                .selectinload(models.Matchup.home_team)
                .selectinload(models.Team.players),
            selectinload(models.League.matchups)
                .selectinload(models.Matchup.away_team)
                .selectinload(models.Team.players),
        )
        leagues = session.execute(command).scalars().all()
        for league in leagues:
            for matchup in league.matchups:
                if matchup.week == week:
                    home_total = 0.0
                    away_total = 0.0
                    for player in matchup.home_team.players:
                        score = 0.0
                        id_string = str(player.cfbd_id)
                        query = select(models.Game).where(
                            (models.Game.week == college_week) &
                            ((models.Game.home_team == player.school) | (models.Game.away_team == player.school))
                        )
                        game = session.execute(query).scalar_one_or_none()
                        if game:
                            boxscore = game.boxscore
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
                            home_total += score
                    for player in matchup.away_team.players:
                        score = 0.0
                        id_string = str(player.cfbd_id)
                        query = select(models.Game).where(
                            (models.Game.week == college_week) &
                            ((models.Game.home_team == player.school) | (models.Game.away_team == player.school))
                        )
                        game = session.execute(query).scalar_one_or_none()
                        if game:
                            boxscore = game.boxscore
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
                            away_total += score
                    matchup.home_score = round(home_total, 2)
                    matchup.away_score = round(away_total, 2)
        session.commit()
    logger.info(
        "get_scores finished: week=%s, matchup scores committed, failed schools=%s.",
        week, failed_schools,
    )

def advance_week():
    with SessionLocal() as session:
        leagues = session.execute(select(models.League)).scalars().all()
        for league in leagues:
            if league.current_week < FINAL_FANTASY_WEEK:
                league.current_week += 1
        session.commit()


def set_championships():
    """Create each league's championship from its final regular-season standings."""
    with SessionLocal() as session:
        leagues = session.scalars(select(models.League).options(
            selectinload(models.League.teams),
            selectinload(models.League.matchups),
        )).all()
        for league in leagues:
            if len(league.teams) < 2 or any(
                matchup.matchup_type == "championship" for matchup in league.matchups
            ):
                continue

            regular_matchups = [
                matchup for matchup in league.matchups
                if matchup.matchup_type == "regular"
            ]
            if not regular_matchups:
                continue

            ranked_teams = rank_regular_season(league.teams, regular_matchups)
            session.add(models.Matchup(
                league_id=league.id,
                week=max(matchup.week for matchup in regular_matchups) + 1,
                home_team_id=ranked_teams[0].id,
                away_team_id=ranked_teams[1].id,
                matchup_type="championship",
                home_score=0.0,
                away_score=0.0,
            ))
        session.commit()






@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run one application worker so only one scheduler executes these jobs.
    scheduler = BackgroundScheduler(timezone=APP_TIMEZONE)
    scheduler.add_job(
        get_scores,
        CronTrigger(
            day_of_week="fri,sat", minute="0,30",
            timezone=APP_TIMEZONE, start_date=SEASON_JOBS_START, end_date=SEASON_JOBS_END,
        ),
        id="get_scores",
        max_instances=1,
        coalesce=True,
    )
    scheduler.add_job(
        advance_week,
        CronTrigger(
            day_of_week="mon", hour=0, minute=0,
            timezone=APP_TIMEZONE, start_date=SEASON_JOBS_START, end_date=SEASON_JOBS_END,
        ),
        id="advance_week",
        max_instances=1,
        coalesce=True,
    )
    scheduler.add_job(
        set_championships,
        CronTrigger(
            year=2026, month=11, day=23, hour=0, minute=0,
            timezone=APP_TIMEZONE, start_date=SEASON_JOBS_START,
        ),
        id="set_championships",
        max_instances=1,
        coalesce=True,
    )
    app.state.scheduler = scheduler
    scheduler.start()
    try:
        yield
    finally:
        scheduler.shutdown(wait=True)


app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:5173",
    "https://mas-frontend-j4w6.onrender.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(teams.router, prefix="/teams", tags=["teams"])
app.include_router(league.router, prefix="/leagues", tags=["leagues"])
app.include_router(draft.router, prefix="/drafts", tags=["drafts"])
