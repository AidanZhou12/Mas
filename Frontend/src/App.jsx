import { Routes, Route } from "react-router";

import LandingPage from "./pages/Landing";
import LoginPage from "./pages/Login";
import CreateLeague from "./pages/Create";
import JoinLeague from "./pages/Join";
import UnreadyPage from "./pages/Unready";
import ReadyPage from "./pages/Ready";
import EnterPage from "./pages/Enter";
import DraftPage from "./pages/Draft";
import LeaguePage from "./pages/League";
import WaiverPage from "./pages/Waiver";
import SeasonStarted from "./pages/SeasonStarted";
import RegistrationGuard from "./components/RegistrationGuard";
import AboutButton from "./components/AboutButton";
import AboutPage from "./pages/About";

function App() {
  return (
    <>
    <Routes>
      <Route path="/about" element={<AboutPage />} />
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/create" element={<RegistrationGuard><CreateLeague /></RegistrationGuard>} />
      <Route path="/join" element={<RegistrationGuard><JoinLeague /></RegistrationGuard>} />
      <Route path="/season-started" element={<SeasonStarted />} />
      <Route path="/unready" element={<RegistrationGuard checkDraft><UnreadyPage /></RegistrationGuard>} />
      <Route path="/ready" element={<RegistrationGuard checkDraft><ReadyPage /></RegistrationGuard>} />
      <Route path="/enter" element={<RegistrationGuard checkDraft><EnterPage /></RegistrationGuard>} />
      <Route path="/draft" element={<RegistrationGuard checkDraft><DraftPage /></RegistrationGuard>} />
      <Route path="/league" element={<RegistrationGuard checkDraft><LeaguePage /></RegistrationGuard>} />
      <Route path="/waiver" element={<RegistrationGuard checkDraft><WaiverPage /></RegistrationGuard>} />
    </Routes>
    <AboutButton />
    </>
  )
}

export default App;
