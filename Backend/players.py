import requests
import os
from dotenv import load_dotenv
from database import SessionLocal
import models
from sqlalchemy import select

load_dotenv()

API_KEY = os.getenv("CFBD_API_KEY")
if API_KEY is None:
    raise RuntimeError("CFBD_API_KEY environment variable is not set")

url = "https://api.collegefootballdata.com/"
headers = {"Authorization": f"Bearer {API_KEY}"}

schools = []
response = requests.get(url + "teams", headers=headers, params={"conference": "SEC", "year": 2026})
if response.status_code == 200:
    data = response.json()
    for team in data:
        schools.append(team["school"])
else:
    raise Exception(f"Error fetching teams: {response.status_code} - {response.text}")

positions = {"QB", "RB", "WR", "TE"}
players = []
for school in schools:
    r = requests.get(url + "roster", headers=headers, params={"team": school, "year": 2026})
    if r.status_code != 200:
        raise Exception(f"Error fetching roster for {school}: {r.status_code} - {r.text}")
    roster_data = r.json()
    for player in roster_data:
        if player["position"] in positions:
            players.append({
                "cfbd_id": int(player["id"]),
                "name": player["firstName"] + " " + player["lastName"],
                "school": school,
                "position": player["position"]
            })

added = 0
updated = 0

with SessionLocal() as session:
    for guy in players:
        statement = select(models.Player).where(models.Player.cfbd_id == guy["cfbd_id"])
        existing_player = session.execute(statement).scalar_one_or_none()
        if existing_player is None:
            new_player = models.Player(
                cfbd_id=guy["cfbd_id"],
                name=guy["name"],
                school=guy["school"],
                position=guy["position"]
            )
            session.add(new_player)
            added += 1
        else:
            changed = False
            if existing_player.name != guy["name"]:
                existing_player.name = guy["name"]
                changed = True
            if existing_player.school != guy["school"]:
                existing_player.school = guy["school"]
                changed = True
            if existing_player.position != guy["position"]:
                existing_player.position = guy["position"]
                changed = True
            if changed:
                updated += 1
    session.commit()

