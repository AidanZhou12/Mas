import { Link, useLocation } from 'react-router';
import './pages.css';

export default function AboutPage() {
    const { state } = useLocation();

    return (
        <main className="about-page">
            <Link
                to={state?.from ?? '/'}
                state={state?.previousState}
                replace
                className="back-button"
            >
                Back
            </Link>
            <section>
                <h1>About</h1>
                <p>SEC fantasy football app where six teams draft rosters from a pool of SEC players and compete in a seasonal competition that takes place towards the end of the season when stakes are high and games matter the most.</p>
            </section>
            <section>
                <h2>The Season</h2>
                <p>Six teams draft their rosters and compete in four regular-season weeks. The first week is week 9 of the college football season and the last week of the regular season is week 12. At the end of the regular season, the top two teams advance to the championship game which takes place during rivalry week.</p>
            </section>
            <section>
                <h2>Logistics</h2>
                <p>Teams are limited to one quarterback, two running backs, three wide receivers, and one tight end. There is no bench or injured reserve. Bye weeks and games against non-power conference teams are will not count towards a player's score. If a player is injured or does not play a power conference game, the player must be dropped and a new one must be added before waivers lock in order to get points from that position for the week. Statistics are gathered from the <a href="https://collegefootballdata.com/" target="_blank" rel="noopener noreferrer">College Football Data API</a>.</p>
            </section>
            <section>
                <h2>Draft</h2>
                <p>The draft is a snake draft with the order being determined by who joined the league first. Any player can start the draft once the league has six teams and there is no time limit each team has to make their pick. You must draft one quarterback, two running backs, three wide receivers, and one tight end.</p>
            </section>
            <section>
                <h2>Standings</h2>
                <p>Teams rank by winning percentage, with ties counting as half a win,
                    then points scored, then alphabetical team name. Records show wins, losses, and ties. A tied championship is decided by season points, then alphabetical team name. The champion and runner-up finish first and second.</p>
            </section>
            <section>
                <h2>Waivers</h2>
                <p>Waivers lock Friday at midnight and reopen Monday at midnight.
                    All league schedules use America/Chicago time.</p>
            </section>
            <section>
                <h2>Scoring</h2>
                <ul>
                    <li>Passing Touchdown: 4 points</li>
                    <li>Passing Yard: 0.04 points</li>
                    <li>Rushing Touchdown: 6 points</li>
                    <li>Rushing Yard: 0.1 points</li>
                    <li>Receiving Touchdown: 6 points</li>
                    <li>Receiving Yard: 0.1 points</li>
                    <li>Fumble Lost: -2 points</li>
                    <li>Interception Thrown: -2 points</li>
                </ul>
            </section>
            <section>
                <h2>Contact</h2>
                <p>If you have any concerns or issues please email aidan2006@tamu.edu and I will do my absolute best to get them fixed. Please note that if the issue is with the College Football Data API, there is not much I can do about it.</p>
            </section>
        </main>
    );
}
