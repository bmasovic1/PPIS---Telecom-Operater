import { useEffect, useMemo, useState } from 'react';
import ReleaseDashboard from './modules/release/ReleaseDashboard';
import ProblemDashboard from './modules/problem/ProblemDashboard';
import { api, authStorage } from './api/client';

const releaseRoles = ['admin', 'release_manager', 'change_manager', 'devops', 'cab_clan', 'qa_inzenjer'];
const problemRoles = ['admin', 'problem_manager', 'noc_operater', 'it_inzenjer'];

function LoginPanel({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await api.login({ email, password });
      authStorage.setToken(result.token);
      onLogin(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-shell">
      <section className="panel auth-panel">
        <p className="eyebrow">Secure Access</p>
        <h2>Sign In</h2>
        <form className="form-grid" onSubmit={submit}>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <button type="submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign In'}</button>
        </form>
        {error ? <p className="error-line">{error}</p> : null}
      </section>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeModule, setActiveModule] = useState('release');

  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) {
      setAuthLoading(false);
      return;
    }

    api.me()
      .then((result) => {
        setUser(result.user);
      })
      .catch(() => {
        authStorage.clearToken();
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const permissions = useMemo(() => {
    const role = user?.uloga;
    return {
      canRelease: releaseRoles.includes(role),
      canProblem: problemRoles.includes(role),
    };
  }, [user]);

  useEffect(() => {
    if (permissions.canRelease) {
      setActiveModule('release');
      return;
    }

    if (permissions.canProblem) {
      setActiveModule('problem');
    }
  }, [permissions.canRelease, permissions.canProblem]);

  const logout = () => {
    authStorage.clearToken();
    setUser(null);
  };

  if (authLoading) {
    return (
      <div className="app-shell">
        <section className="panel auth-panel">
          <h2>Loading session...</h2>
        </section>
      </div>
    );
  }

  if (!user) {
    return <LoginPanel onLogin={setUser} />;
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="eyebrow">Telecom Operations Platform</p>
        <h1>ITSM Control Center</h1>
        <p className="hero-text">
          Unified workspace for release operations and root-cause driven problem management.
        </p>
        <div className="user-strip">
          <span>{user.ime} {user.prezime} ({user.uloga})</span>
          <button className="ghost-button" onClick={logout}>Logout</button>
        </div>
      </header>

      <nav className="module-nav">
        {permissions.canRelease ? (
          <button
            className={activeModule === 'release' ? 'tab active' : 'tab'}
            onClick={() => setActiveModule('release')}
          >
            Release & Deployment
          </button>
        ) : null}
        {permissions.canProblem ? (
          <button
            className={activeModule === 'problem' ? 'tab active' : 'tab'}
            onClick={() => setActiveModule('problem')}
          >
            Problem Management
          </button>
        ) : null}
      </nav>

      <main className="content-grid">
        {activeModule === 'release' && permissions.canRelease ? <ReleaseDashboard /> : null}
        {activeModule === 'problem' && permissions.canProblem ? <ProblemDashboard /> : null}
        {!permissions.canRelease && !permissions.canProblem ? (
          <section className="panel">
            <h3>No Module Access</h3>
            <p>Your role does not have access to configured modules.</p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
