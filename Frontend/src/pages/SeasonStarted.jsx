import { Link } from 'react-router';
import './pages.css';

export default function SeasonStarted() {
    return (
        <main>
            <Link to="/" className="back-button">Back</Link>
            <Link to="/login" className="login-button">Login</Link>
            <h1>The Fantasy Season Has Started</h1>
            <h2>Please Log In If You Already Have a Team</h2>
        </main>
    );
}
