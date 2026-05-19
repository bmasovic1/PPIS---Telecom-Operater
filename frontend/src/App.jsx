import { useEffect, useMemo, useState } from 'react';
import ReleaseDashboard from './modules/release/ReleaseDashboard';
import ProblemDashboard from './modules/problem/ProblemDashboard';
import { api, authStorage } from './api/client';

const releaseRoles = ['admin', 'release_manager', 'change_manager', 'devops', 'cab_clan', 'qa_inzenjer'];
const problemRoles = ['admin', 'problem_manager', 'noc_operater', 'it_inzenjer'];

const translations = {
  bs: {
    settingsTitle: 'Settings',
    settingsLabel: 'Postavke',
    languageLabel: 'Jezik',
    themeLabel: 'Tema',
    secureAccess: 'Siguran pristup',
    signIn: 'Prijava',
    signingIn: 'Prijavljivanje...',
    email: 'Email',
    password: 'Lozinka',
    loadingSession: 'Učitavanje sesije...',
    platformName: 'Telecom Operations Platform',
    dashboardName: 'ITSM nadzorna ploča',
    dashboardText: 'Release i Problem tokovi na jednom mjestu.',
    releaseModule: 'Release operacije',
    problemModule: 'Problem management',
    logout: 'Odjava',
    noAccessTitle: 'Nema pristupa modulima',
    noAccessText: 'Vaša uloga nema pristup konfiguriranim modulima.',
    themeLight: 'Svijetla',
    themeDark: 'Tamna',
    languageBosnian: 'Bosanski',
    languageEnglish: 'Engleski',
  },
  en: {
    settingsTitle: 'Settings',
    settingsLabel: 'Preferences',
    languageLabel: 'Language',
    themeLabel: 'Theme',
    secureAccess: 'Secure Access',
    signIn: 'Sign In',
    signingIn: 'Signing in...',
    email: 'Email',
    password: 'Password',
    loadingSession: 'Loading session...',
    platformName: 'Telecom Operations Platform',
    dashboardName: 'ITSM Dashboard',
    dashboardText: 'Release and Problem workflows in one place.',
    releaseModule: 'Release Operations',
    problemModule: 'Problem Management',
    logout: 'Logout',
    noAccessTitle: 'No Module Access',
    noAccessText: 'Your role does not have access to the configured modules.',
    themeLight: 'Light',
    themeDark: 'Dark',
    languageBosnian: 'Bosnian',
    languageEnglish: 'English',
  },
};

const languageOptions = [
  { value: 'bs', labelKey: 'languageBosnian' },
  { value: 'en', labelKey: 'languageEnglish' },
];

const themeOptions = [
  { value: 'light', labelKey: 'themeLight' },
  { value: 'dark', labelKey: 'themeDark' },
];

const getInitialLanguage = () => {
  const savedLanguage = localStorage.getItem('telecom_itsm_language');
  if (savedLanguage === 'bs' || savedLanguage === 'en') {
    return savedLanguage;
  }

  const browserLanguage = navigator.language?.toLowerCase() || '';
  return browserLanguage.startsWith('bs') || browserLanguage.startsWith('hr') || browserLanguage.startsWith('sr') ? 'bs' : 'en';
};

const getInitialTheme = () => {
  const savedTheme = localStorage.getItem('telecom_itsm_theme');
  return savedTheme === 'dark' ? 'dark' : 'light';
};

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

function SettingsPanel({ copy, language, theme, onLanguageChange, onThemeChange, compact = false }) {
  return (
    <section className={compact ? 'settings-panel settings-panel-compact' : 'settings-panel'}>
      <div>
        <p className="eyebrow">{copy.settingsTitle}</p>
        <h3 className="section-title">{copy.settingsLabel}</h3>
      </div>
      <div className="settings-grid">
        <label>
          {copy.languageLabel}
          <select value={language} onChange={(event) => onLanguageChange(event.target.value)}>
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>{copy[option.labelKey]}</option>
            ))}
          </select>
        </label>
        <label>
          {copy.themeLabel}
          <select value={theme} onChange={(event) => onThemeChange(event.target.value)}>
            {themeOptions.map((option) => (
              <option key={option.value} value={option.value}>{copy[option.labelKey]}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function LoginPanel({ onLogin, copy, language, theme, onLanguageChange, onThemeChange }) {
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
        <SettingsPanel
          copy={copy}
          language={language}
          theme={theme}
          onLanguageChange={onLanguageChange}
          onThemeChange={onThemeChange}
          compact
        />
        <p className="eyebrow">{copy.secureAccess}</p>
        <h2 className="section-title">{copy.signIn}</h2>
        <form className="form-grid" onSubmit={submit}>
          <label>
            {copy.email}
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            {copy.password}
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <button type="submit" disabled={submitting}>{submitting ? copy.signingIn : copy.signIn}</button>
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
  const [language, setLanguage] = useState(getInitialLanguage);
  const [theme, setTheme] = useState(getInitialTheme);

  const copy = translations[language];

  useEffect(() => {
    localStorage.setItem('telecom_itsm_language', language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem('telecom_itsm_theme', theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

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
          <SettingsPanel
            copy={copy}
            language={language}
            theme={theme}
            onLanguageChange={setLanguage}
            onThemeChange={setTheme}
            compact
          />
          <h2 className="section-title">{copy.loadingSession}</h2>
        </section>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPanel
        onLogin={setUser}
        copy={copy}
        language={language}
        theme={theme}
        onLanguageChange={setLanguage}
        onThemeChange={setTheme}
      />
    );
  }

  return (
    <div className="app-shell app-layout-shell">
      <div className="app-layout">
        <aside className="sidebar panel">
          <div>
            <p className="eyebrow">{copy.platformName}</p>
            <h2 className="sidebar-title">{copy.dashboardName}</h2>
            <p className="sidebar-text">{copy.dashboardText}</p>
          </div>

          <SettingsPanel
            copy={copy}
            language={language}
            theme={theme}
            onLanguageChange={setLanguage}
            onThemeChange={setTheme}
          />

          <nav className="sidebar-nav">
            {permissions.canRelease ? (
              <button
                className={activeModule === 'release' ? 'tab active' : 'tab'}
                onClick={() => setActiveModule('release')}
              >
                {copy.releaseModule}
              </button>
            ) : null}
            {permissions.canProblem ? (
              <button
                className={activeModule === 'problem' ? 'tab active' : 'tab'}
                onClick={() => setActiveModule('problem')}
              >
                {copy.problemModule}
              </button>
            ) : null}
          </nav>

          <div className="sidebar-user">
            <span>{user.ime} {user.prezime}</span>
            <span className="sidebar-role">{formatRole(user.uloga)}</span>
            <button className="ghost-button" onClick={logout}>{copy.logout}</button>
          </div>
        </aside>

        <main className="content-area">
          {!permissions.canRelease && !permissions.canProblem ? (
            <section className="panel">
              <h3 className="section-title">{copy.noAccessTitle}</h3>
              <p>{copy.noAccessText}</p>
            </section>
          ) : null}

          {activeModule === 'release' && permissions.canRelease ? <ReleaseDashboard language={language} /> : null}
          {activeModule === 'problem' && permissions.canProblem ? <ProblemDashboard language={language} /> : null}
        </main>
      </div>
    </div>
  );
}
