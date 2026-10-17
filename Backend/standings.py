"""Regular-season rankings used to seed the championship."""

from decimal import Decimal
from fractions import Fraction


def rank_regular_season(teams, matchups):
    records = {
        team.id: {"wins": 0, "losses": 0, "ties": 0, "points": Decimal(0)}
        for team in teams
    }
    for matchup in matchups:
        if matchup.matchup_type != "regular":
            continue
        if matchup.home_score is None or matchup.away_score is None:
            continue
        home = records[matchup.home_team_id]
        away = records[matchup.away_team_id]
        home["points"] += Decimal(str(matchup.home_score))
        away["points"] += Decimal(str(matchup.away_score))
        if matchup.home_score > matchup.away_score:
            home["wins"] += 1
            away["losses"] += 1
        elif matchup.home_score < matchup.away_score:
            away["wins"] += 1
            home["losses"] += 1
        else:
            home["ties"] += 1
            away["ties"] += 1

    def ranking_key(team):
        record = records[team.id]
        games = record["wins"] + record["losses"] + record["ties"]
        percentage = Fraction(2 * record["wins"] + record["ties"], 2 * games) if games else Fraction(0)
        return (-percentage, -record["points"], team.name.lower(), team.name)

    return sorted(teams, key=ranking_key)
