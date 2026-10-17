import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useModel } from "./hooks";
import { ElementChip, Loading, Markdown } from "./components";
import { artifactById, impactSet, relationsFor } from "./lib/model";
import { ask, impact } from "./lib/ai";
import { login } from "./lib/auth";
import { useAuth } from "./auth-context";

const GH = "https://github.com/jdlongmire/ea-repository-template/blob/main/";

export function Landing() {
  const { model } = useModel();
  return (
    <div>
      <section className="hero">
        <h1>ThinxEA</h1>
        <p className="tagline">Enterprise Architecture as Code.</p>
        <p>
          Strategy, Architecture, Roadmaps, and Standards, held in a Git repository as typed
          artifacts, a catalog of elements and relations, registered views, and compiled
          policies. ThinxEA is the hosted, AI-enabled face of that record: it renders the
          record, runs the gates, answers questions with citations, and lets agents propose
          change while humans ratify.
        </p>
        {model && (
          <p className="counts">
            Live demo record: {model.counts.artifacts} artifacts, {model.counts.elements}{" "}
            catalog elements, {model.counts.relations} relations, {model.counts.views}{" "}
            generated views.
          </p>
        )}
        <p className="cta">
          <Link className="btn" to="/login">Sign in to the demo</Link>{" "}
          <Link className="btn ghost" to="/request-access">Request demo access</Link>
        </p>
      </section>
      <section className="cards">
        <div className="card">
          <h3>Git is the record</h3>
          <p>The web app reads and proposes. Every change lands as a pull request and is ratified by reviewers. Delete the app and the record still stands.</p>
        </div>
        <div className="card">
          <h3>Views are projections</h3>
          <p>Every diagram is generated from the catalog and registered in the view register. If it is not in the catalog, it is not in the picture.</p>
        </div>
        <div className="card">
          <h3>AI with citations</h3>
          <p>Ask a question, get an answer grounded in the record, with the artifact ids it rests on. AI drafts pass the same verifier and policy gates as human work.</p>
        </div>
      </section>
      <section>
        <h2>Sample AI output (from the fictional claims demo record)</h2>
        <div className="card">
          <p><strong>Q:</strong> What binds the claims processing platform?</p>
          <p>
            <strong>A:</strong> SYS-014 is bound by two standards: STD-DATA-002 (Data
            Classification and Handling, policy-enforced) and STD-SEC-001 (Identity and Access
            for Systems, review-enforced). <span className="muted">[SYS-014] [STD-DATA-002] [STD-SEC-001]</span>
          </p>
        </div>
      </section>
    </div>
  );
}

const LEVELS = ["enterprise", "systems", "solutions", "cross-cutting"];
const FOCI = ["strategy", "architecture", "roadmaps", "standards"];

export function Dashboard() {
  const { model, error } = useModel();
  if (error) return <p className="error">{error}</p>;
  if (!model) return <Loading />;
  return (
    <div>
      <h1>The record at a glance</h1>
      <p className="muted">
        Source: {model.provenance.repository} ({model.provenance.example}). Generated{" "}
        {new Date(model.provenance.generatedAt).toLocaleString()}.
      </p>
      <div className="cards">
        <div className="card big"><span>{model.counts.artifacts}</span> artifacts</div>
        <div className="card big"><span>{model.counts.elements}</span> catalog elements</div>
        <div className="card big"><span>{model.counts.relations}</span> relations</div>
        <div className="card big"><span>{model.counts.views}</span> registered views</div>
      </div>
      <h2>SARS grid</h2>
      <table className="grid">
        <thead>
          <tr><th>Level</th>{FOCI.map((f) => <th key={f}>{f}</th>)}</tr>
        </thead>
        <tbody>
          {LEVELS.map((lvl) => (
            <tr key={lvl}>
              <th>{lvl}</th>
              {FOCI.map((f) => (
                <td key={f}>
                  {(model.sarsGrid[lvl]?.[f] ?? []).map((id) => (
                    <ElementChip key={id} id={id} />
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">
        Focus areas are derived by the exporter from artifact type. Cross-level traceability
        lives in the <Link to="/views">Requirements Realization view</Link>.
      </p>
    </div>
  );
}

export function Catalog() {
  const { model, error } = useModel();
  if (error) return <p className="error">{error}</p>;
  if (!model) return <Loading />;
  return (
    <div>
      <h1>Catalog</h1>
      <p className="muted">The model of record: elements and typed relations, generated from the repository catalog.</p>
      <table>
        <thead><tr><th>Element</th><th>Type</th><th>Name</th><th>Level</th></tr></thead>
        <tbody>
          {model.catalog.element.map((e) => (
            <tr key={e.id}>
              <td><ElementChip id={e.id} /></td><td>{e.type}</td><td>{e.name}</td><td>{e.level}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Relations</h2>
      <table>
        <thead><tr><th>Source</th><th>Relation</th><th>Target</th></tr></thead>
        <tbody>
          {model.catalog.relation.map((r, i) => (
            <tr key={i}>
              <td><ElementChip id={r.source} /></td><td>{r.relation}</td><td><ElementChip id={r.target} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ArtifactPage() {
  const { id } = useParams();
  const { model, error } = useModel();
  if (error) return <p className="error">{error}</p>;
  if (!model) return <Loading />;
  const a = id ? artifactById(model, id) : undefined;
  if (!a) return <p className="error">No artifact {id} in the record.</p>;
  const rel = relationsFor(model, a.id);
  const extras = Object.entries(a).filter(
    ([k]) => !["id", "type", "name", "level", "owner", "status", "path", "body"].includes(k),
  );
  return (
    <div>
      <h1>{a.id}: {a.name}</h1>
      <table className="meta">
        <tbody>
          <tr><th>Type</th><td>{a.type}</td><th>Level</th><td>{a.level}</td></tr>
          <tr><th>Owner</th><td>{a.owner}</td><th>Status</th><td>{a.status}</td></tr>
          {extras.map(([k, v]) => (
            <tr key={k}><th>{k}</th><td colSpan={3}>{Array.isArray(v) ? v.join(", ") : String(v)}</td></tr>
          ))}
          <tr><th>Source</th><td colSpan={3}><a href={GH + a.path} target="_blank" rel="noreferrer">{a.path}</a></td></tr>
        </tbody>
      </table>
      <Markdown text={a.body} />
      <h2>Relations</h2>
      {rel.out.length === 0 && rel.into.length === 0 && <p className="muted">No catalogued relations.</p>}
      <ul>
        {rel.out.map((r, i) => (
          <li key={`o${i}`}>{a.id} <em>{r.relation}</em> <ElementChip id={r.target} /></li>
        ))}
        {rel.into.map((r, i) => (
          <li key={`i${i}`}><ElementChip id={r.source} /> <em>{r.relation}</em> {a.id}</li>
        ))}
      </ul>
      <p><Link to={`/impact/${encodeURIComponent(a.id)}`}>Run impact analysis for {a.id}</Link></p>
    </div>
  );
}

export function Views() {
  const { model, error } = useModel();
  if (error) return <p className="error">{error}</p>;
  if (!model) return <Loading />;
  return (
    <div>
      <h1>Registered views</h1>
      <p className="muted">Each view is a registered projection of the catalog, drawn by the renderer, never by hand.</p>
      <div className="cards">
        {model.views.map((v) => (
          <div className="card" key={v.id}>
            <h3><Link to={`/views/${v.id}`}>{v.id}: {v.title}</Link></h3>
            <p>{v.concern}</p>
            <p className="muted">
              {v.level} / {v.focus} · {v.elements.length} elements · membership{" "}
              {v.membership_complete ? "complete" : "partial"} · relations{" "}
              {v.relation_complete ? "complete" : "subset"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ViewDetail() {
  const { id } = useParams();
  const { model, error } = useModel();
  const [mmd, setMmd] = useState("");
  const v = model?.views.find((x) => x.id === id);
  useEffect(() => {
    if (v) fetch(v.mmd).then((r) => r.text()).then(setMmd).catch(() => {});
  }, [v]);
  if (error) return <p className="error">{error}</p>;
  if (!model) return <Loading />;
  if (!v) return <p className="error">No view {id} in the register.</p>;
  const edges = model.catalog.relation.filter(
    (r) => v.elements.includes(r.source) && v.elements.includes(r.target),
  );
  return (
    <div>
      <h1>{v.id}: {v.title}</h1>
      <p className="muted">
        Viewpoint: {v.viewpoint}. Level: {v.level}. Focus: {v.focus}. Membership{" "}
        {v.membership_complete ? "complete" : "partial"}; relations{" "}
        {v.relation_complete ? "complete" : "subset"}.
      </p>
      <p>{v.concern}</p>
      <img className="viewimg" src={v.svg} alt={`${v.id} ${v.title}`} />
      <h2>Elements</h2>
      <p>{v.elements.map((e) => <ElementChip key={e} id={e} />)}</p>
      <h2>Relations drawn</h2>
      <ul>
        {edges.map((r, i) => (
          <li key={i}><ElementChip id={r.source} /> <em>{r.relation}</em> <ElementChip id={r.target} /></li>
        ))}
      </ul>
      <details>
        <summary>Mermaid source</summary>
        <pre>{mmd}</pre>
      </details>
    </div>
  );
}

export function Standards() {
  const { model, error } = useModel();
  if (error) return <p className="error">{error}</p>;
  if (!model) return <Loading />;
  return (
    <div>
      <h1>Standards register</h1>
      <p className="muted">
        Policy-enforced standards are compiled to OPA and checked in CI. Review-enforced
        standards are ratified through CODEOWNERS review.
      </p>
      <table>
        <thead><tr><th>Standard</th><th>Name</th><th>Enforcement</th><th>Policy</th><th>Bound elements</th></tr></thead>
        <tbody>
          {model.standards.map((s) => (
            <tr key={s.id}>
              <td><ElementChip id={s.id} /></td>
              <td>{s.name}</td>
              <td>{s.enforcement}</td>
              <td>{s.policyFile ?? "n/a"}</td>
              <td>{s.boundElements.map((b) => <ElementChip key={b} id={b} />)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Roadmap() {
  const { model, error } = useModel();
  if (error) return <p className="error">{error}</p>;
  if (!model) return <Loading />;
  const items = model.artifacts.filter((a) => a.type === "roadmap" || a.type === "work-package");
  return (
    <div>
      <h1>Roadmaps and delivery</h1>
      {items.map((a) => (
        <div className="card" key={a.id}>
          <h3><ElementChip id={a.id} /> {a.name}</h3>
          <p className="muted">{a.type} · {a.level} · {a.status}</p>
          <Markdown text={a.body} />
        </div>
      ))}
    </div>
  );
}

export function Evidence() {
  const { model, error } = useModel();
  if (error) return <p className="error">{error}</p>;
  if (!model) return <Loading />;
  return (
    <div>
      <h1>Evidence</h1>
      <h2>Observed-state snapshots</h2>
      <ul>{model.evidence.snapshots.map((s) => <li key={s}>{s}</li>)}</ul>
      <h2>Drift register</h2>
      <Markdown text={model.evidence.driftRegister} />
    </div>
  );
}

const SAMPLE_Q = [
  "What binds SYS-014?",
  "Which standards are policy-enforced?",
  "What realizes CAP-001?",
  "Which requirements are allocated to SYS-014?",
];

export function Ask() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<{ answer: string; citations: string[]; provider: string } | null>(null);
  async function submit(question: string) {
    setBusy(true); setErr(null); setRes(null);
    try {
      setRes(await ask(question));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <h1>Ask ThinxEA</h1>
      <p className="muted">
        Answers are grounded in the record and cite the artifacts they rest on. AI features
        require an issued demo account and are quota-limited.
      </p>
      <div className="askrow">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about the architecture record..." />
        <button className="btn" disabled={busy || !q.trim()} onClick={() => submit(q)}>Ask</button>
      </div>
      <p className="samples">
        {SAMPLE_Q.map((s) => (
          <button key={s} className="btn ghost small" onClick={() => { setQ(s); submit(s); }}>{s}</button>
        ))}
      </p>
      {busy && <p className="muted">Working...</p>}
      {err && <p className="error">{err}</p>}
      {res && (
        <div className="card">
          <Markdown text={res.answer} />
          <p className="muted">
            Citations: {res.citations.map((c) => <ElementChip key={c} id={c} />)} · via {res.provider}
          </p>
        </div>
      )}
    </div>
  );
}

export function Impact() {
  const { id } = useParams();
  const { model, error } = useModel();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  if (error) return <p className="error">{error}</p>;
  if (!model) return <Loading />;
  const el = model.catalog.element.find((e) => e.id === id);
  if (!el) return <p className="error">No element {id} in the catalog.</p>;
  const affected = impactSet(model, el.id);
  async function narrate() {
    setBusy(true); setErr(null);
    try {
      const r = await impact(el!.id);
      setNarrative(r.narrative);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <h1>Impact: {el.id}</h1>
      <p className="muted">
        The affected set is computed by graph traversal over the catalog (deterministic, no
        model involved). The narrative is AI-written and requires a demo account.
      </p>
      <h2>Affected elements ({affected.length})</h2>
      <p>{affected.map((a) => <ElementChip key={a} id={a} />)}</p>
      <button className="btn" disabled={busy} onClick={narrate}>Write the impact narrative</button>
      {err && <p className="error">{err}</p>}
      {narrative && <div className="card"><Markdown text={narrative} /></div>}
    </div>
  );
}

interface RunRecord {
  id: number;
  username: string;
  feature: string;
  provider: string;
  created_at: string;
  citations: string[];
}

export function Agents() {
  const [runs, setRuns] = useState<RunRecord[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/runs", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 401 ? "Sign in to see agent activity." : `runs unavailable (${r.status})`);
        setRuns((await r.json()) as RunRecord[]);
      })
      .catch((e: Error) => setErr(e.message));
  }, []);
  return (
    <div>
      <h1>Agent console</h1>
      <p>
        Agent lanes work this record under governed execution: they draft artifacts,
        regenerate views, reconcile observed state, and file drift. Every output is a cited
        answer or a pull request awaiting human ratification. Verification lanes review
        proposals they did not author.
      </p>
      <h2>Recent AI runs</h2>
      {err && <p className="muted">{err}</p>}
      {runs && runs.length === 0 && <p className="muted">No runs recorded yet.</p>}
      {runs && runs.length > 0 && (
        <table>
          <thead><tr><th>When</th><th>User</th><th>Feature</th><th>Provider</th><th>Citations</th></tr></thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                <td>{r.username}</td><td>{r.feature}</td><td>{r.provider}</td>
                <td>{r.citations.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function Login() {
  const nav = useNavigate();
  const { refresh } = useAuth();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await login(u, p);
      await refresh();
      nav("/dashboard");
    } catch (ex) {
      setErr((ex as Error).message);
    }
  }
  return (
    <div className="narrow">
      <h1>Sign in</h1>
      <p className="muted">
        Demo accounts are issued individually. No account?{" "}
        <Link to="/request-access">Request access</Link>.
      </p>
      <form onSubmit={submit} className="form">
        <label>Username<input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" /></label>
        <label>Password<input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" /></label>
        {err && <p className="error">{err}</p>}
        <button className="btn" type="submit">Sign in</button>
      </form>
    </div>
  );
}

export function RequestAccess() {
  const [form, setForm] = useState({ name: "", email: "", org: "", purpose: "" });
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const r = await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error(`request failed (${r.status})`);
      setDone(true);
    } catch {
      setErr("The request service is unavailable right now. Please try again later.");
    }
  }
  if (done)
    return (
      <div className="narrow">
        <h1>Request received</h1>
        <p>Requests are reviewed individually. If approved, your username and password are issued for a 14-day demo window.</p>
      </div>
    );
  return (
    <div className="narrow">
      <h1>Request demo access</h1>
      <p className="muted">
        The live demo runs a frontier model under the hood, so accounts are issued by request
        and quota-limited. Tell us who you are and what you want to evaluate.
      </p>
      <form onSubmit={submit} className="form">
        <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Organization<input value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} /></label>
        <label>Purpose<textarea required value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></label>
        {err && <p className="error">{err}</p>}
        <button className="btn" type="submit">Submit request</button>
      </form>
    </div>
  );
}
