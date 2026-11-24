import { Route, Routes, Link } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Elections from "./pages/Elections";
import ElectionDetail from "./pages/ElectionDetail";
import Results from "./pages/Results";
import Verify from "./pages/Verify";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/elections" element={<Elections />} />
          <Route path="/elections/:id" element={<ElectionDetail />} />
          <Route path="/results/:id" element={<Results />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/verify/:hash" element={<Verify />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<p className="py-20">Page not found. <Link className="font-semibold text-indelible underline" to="/">Go home</Link></p>} />
        </Routes>
      </main>
      <footer className="border-t border-rule py-6 text-center text-xs text-mute">
        Academic prototype running on a local test blockchain. Not for real elections.
      </footer>
    </>
  );
}
