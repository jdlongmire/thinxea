import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./auth-context";
import { logout } from "./lib/auth";
import {
  Agents, ArtifactPage, Ask, Catalog, Dashboard, Evidence, Impact, Landing,
  Login, RequestAccess, Roadmap, Standards, ViewDetail, Views,
} from "./routes";

function Protected({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="muted">Checking session...</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Nav() {
  const { user, clear } = useAuth();
  const nav = useNavigate();
  async function signOut() {
    await logout();
    clear();
    nav("/");
  }
  return (
    <header className="topbar">
      <Link className="brand" to="/">ThinxEA</Link>
      <nav>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/catalog">Catalog</Link>
        <Link to="/views">Views</Link>
        <Link to="/standards">Standards</Link>
        <Link to="/roadmap">Roadmaps</Link>
        <Link to="/evidence">Evidence</Link>
        <Link to="/ask">Ask</Link>
        <Link to="/agents">Agents</Link>
      </nav>
      <div className="session">
        {user ? (
          <>
            <span className="muted">{user.username}</span>
            <button className="btn ghost small" onClick={signOut}>Sign out</button>
          </>
        ) : (
          <>
            <Link to="/login">Sign in</Link>
            <Link className="btn small" to="/request-access">Request access</Link>
          </>
        )}
      </div>
    </header>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />
        <main>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/request-access" element={<RequestAccess />} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/catalog" element={<Protected><Catalog /></Protected>} />
            <Route path="/artifact/:id" element={<Protected><ArtifactPage /></Protected>} />
            <Route path="/views" element={<Protected><Views /></Protected>} />
            <Route path="/views/:id" element={<Protected><ViewDetail /></Protected>} />
            <Route path="/standards" element={<Protected><Standards /></Protected>} />
            <Route path="/roadmap" element={<Protected><Roadmap /></Protected>} />
            <Route path="/evidence" element={<Protected><Evidence /></Protected>} />
            <Route path="/ask" element={<Protected><Ask /></Protected>} />
            <Route path="/impact/:id" element={<Protected><Impact /></Protected>} />
            <Route path="/agents" element={<Protected><Agents /></Protected>} />
          </Routes>
        </main>
        <footer>
          ThinxEA: Enterprise Architecture as Code. The record lives in Git at{" "}
          <a href="https://github.com/jdlongmire/ea-repository-template" target="_blank" rel="noreferrer">
            jdlongmire/ea-repository-template
          </a>
          . Human-Curated, AI-Enabled (HCAE).
        </footer>
      </BrowserRouter>
    </AuthProvider>
  );
}
