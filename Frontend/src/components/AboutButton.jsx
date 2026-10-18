import { Link, useLocation } from 'react-router';
import '../pages/pages.css';

export default function AboutButton() {
    const location = useLocation();
    const returnState = location.pathname === '/about' ? location.state : {
        from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
        },
        previousState: location.state,
    };

    return <Link to="/about" state={returnState} className="about-button">About</Link>;
}
