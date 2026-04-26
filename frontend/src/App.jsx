import { useEffect, useMemo, useState } from 'react';
import ReleaseDashboard from './modules/release/ReleaseDashboard';
import ProblemDashboard from './modules/problem/ProblemDashboard';
import { api, authStorage } from './api/client';

const releaseRoles = ['admin', 'release_manager', 'change_manager', 'devops', 'cab_clan', 'qa_inzenjer'];
const problemRoles = ['admin', 'problem_manager', 'noc_operater', 'it_inzenjer'];

const roleLabels = {
  admin: 'Administrator',
  release_manager: 'Release Manager',
  change_manager: 'Change Manager',
  devops: 'DevOps',
  cab_clan: 'CAB Team',
  qa_inzenjer: 'QA Engineer',
  problem_manager: 'Problem Manager',
  noc_operater: 'NOC Operator',
  it_inzenjer: 'IT Engineer',
};

const formatRole = (role) => roleLabels[role] || role;

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
        <h2 className="section-title">Sign In</h2>
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
      <div className="app-shell app-shell-auth">
        <section className="panel auth-panel">
          <h2 className="section-title">Loading session...</h2>
        </section>
      </div>
    );
  }

  if (!user) {
    return <LoginPanel onLogin={setUser} />;
  }

  return (
    <div className="app-shell app-layout-shell">
      <div className="app-layout">
        <aside className="sidebar panel">
          <div>
            <p className="eyebrow">Telecom Operations Platform</p>
            <h2 className="sidebar-title">ITSM Dashboard</h2>
            <p className="sidebar-text">Release and Problem workflows in one place.</p>
          </div>

          <nav className="sidebar-nav">
            {permissions.canRelease ? (
              <button
                className={activeModule === 'release' ? 'tab active' : 'tab'}
                onClick={() => setActiveModule('release')}
              >
                Release Operations
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

          <div className="sidebar-user">
            <span>{user.ime} {user.prezime}</span>
            <span className="sidebar-role">{formatRole(user.uloga)}</span>
            <button className="ghost-button" onClick={logout}>Logout</button>
          </div>
        </aside>

        <main className="content-area">
          {!permissions.canRelease && !permissions.canProblem ? (
            <section className="panel">
              <h3 className="section-title">No Module Access</h3>
              <p>Your role does not have access to the configured modules.</p>
            </section>
          ) : null}

          {activeModule === 'release' && permissions.canRelease ? <ReleaseDashboard /> : null}
          {activeModule === 'problem' && permissions.canProblem ? <ProblemDashboard /> : null}
        </main>
      </div>
    </div>
  );
}
