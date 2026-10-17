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

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/create" element={<RegistrationGuard><CreateLeague /></RegistrationGuard>} />
      <Route path="/join" element={<RegistrationGuard><JoinLeague /></RegistrationGuard>} />
      <Route path="/season-started" element={<SeasonStarted />} />
      <Route path="/unready" element={<UnreadyPage />} />
      <Route path="/ready" element={<ReadyPage />} />
      <Route path="/enter" element={<EnterPage />} />
      <Route path="/draft" element={<DraftPage />} />
      <Route path="/league" element={<LeaguePage />} />
      <Route path="/waiver" element={<WaiverPage />} />
    </Routes>
  )
}

export default App;
