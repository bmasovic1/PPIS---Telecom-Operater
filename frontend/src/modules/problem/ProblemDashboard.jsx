import { useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '../../api/client';
import RCAWorkspace from './RCAWorkspace';
import KEDBView from './KEDBView';

const initialForm = {
  incident_ids: [],
  dodijeljen_id: '',
  prioritet: 'P3',
  naziv: '',
};



const closedStatuses = new Set(['riješen', 'zatvoren']);

const formatIncidentLabel = (incident) => {
  const summary = incident.naziv || incident.opis || incident.summary || incident.title || incident.description;
  return summary ? `#${incident.id} · ${summary}` : `#${incident.id}`;
};

const priorityClassMap = {
  P1: 'priority-p1',
  P2: 'priority-p2',
  P3: 'priority-p3',
  P4: 'priority-p4',
};

const getStatusClass = (status) => {
  if (status === 'riješen' || status === 'zatvoren') return 'status-closed';
  if (status === 'novo' || status === 'istrazivanje') return 'status-open';
  if (status === 'fix_u_toku') return 'status-warning';
  if (status === 'rca_zavrsen' || status === 'workaround_aktivan') return 'status-success';
  return 'status-open';
};

export default function ProblemDashboard({ language = 'en' }) {
  const translations = {
    bs: {
      selectIncident: 'Odaberite barem jedan incident.',
      titleRequired: 'Naslov problema je obavezan.',
      created: 'Problem je uspješno kreiran.',
      priorityLabels: {
        P1: 'P1 - Kritično',
        P2: 'P2 - Visoko',
        P3: 'P3 - Srednje',
        P4: 'P4 - Nisko',
      },
      statusLabels: {
        novo: 'Novo',
        istrazivanje: 'Istraživanje',
        workaround_aktivan: 'Privremeno rješenje',
        rca_zavrsen: 'RCA završen',
        fix_u_toku: 'U toku',
        riješen: 'Riješen',
        zatvoren: 'Zatvoren',
      },
      rcaMethodLabels: {
        '5_whys': '5 zašto',
        ishikawa: 'Ishikawa',
        fault_tree: 'Fault tree',
        kepner_tregoe: 'Kepner-Tregoe',
      },
      phasesTitle: 'ITIL upravljanje problemima - tri faze',
      flowTitle: 'Tok problema',
      problemSteps: [
        'Zabilježi ponavljajuće incidente i dodijeli vlasništvo',
        'Istraži uzrok uz RCA radni prostor',
        'Kreiraj ili ažuriraj KEDB unos',
        'Prati workaround i trajni fix',
        'Zatvori tek nakon verifikacije i oporavka',
      ],
      phases: [
        { name: 'Identifikacija problema', description: 'Otkrivanje, kategorizacija i prioritet' },
        { name: 'Kontrola problema', description: 'Istraživanje, dijagnostika i analiza uzroka' },
        { name: 'Kontrola grešaka', description: 'Implementacija workaround-a, deploy i zatvaranje' },
      ],
      open: 'Otvoreno',
      closed: 'Zatvoreno',
      titleLabel: 'Naslov',
      noTitle: 'Bez naslova',
    },
    en: {
      selectIncident: 'Select at least one incident.',
      titleRequired: 'Problem Title is required.',
      created: 'Problem created successfully.',
      priorityLabels: {
        P1: 'P1 - Critical',
        P2: 'P2 - High',
        P3: 'P3 - Medium',
        P4: 'P4 - Low',
      },
      statusLabels: {
        novo: 'New',
        istrazivanje: 'Investigating',
        workaround_aktivan: 'Workaround',
        rca_zavrsen: 'RCA Done',
        fix_u_toku: 'In Progress',
        riješen: 'Resolved',
        zatvoren: 'Closed',
      },
      rcaMethodLabels: {
        '5_whys': '5 Whys',
        ishikawa: 'Ishikawa',
        fault_tree: 'Fault tree',
        kepner_tregoe: 'Kepner-Tregoe',
      },
      phasesTitle: 'ITIL Problem Management — Three Phases',
      flowTitle: 'Problem Flow',
      problemSteps: [
        'Capture repeated incidents and assign ownership',
        'Investigate root cause with RCA workspace',
        'Create or update KEDB knowledge entry',
        'Track workaround and permanent fix',
        'Close only after verification and recovery',
      ],
      phases: [
        { name: 'Problem Identification', description: 'Discovery, categorization, and prioritization of problems' },
        { name: 'Problem Control', description: 'Investigation, diagnostics, and root cause analysis' },
        { name: 'Error Control', description: 'Workaround implementation, fix deployment, and closure' },
      ],
      open: 'Open',
      closed: 'Closed',
      titleLabel: 'Title',
      noTitle: 'Untitled',
    },
  };

  const t = translations[language] || translations.en;
  const priorityLabels = t.priorityLabels || {};
  const statusLabels = t.statusLabels || {};
  const rcaMethodLabels = t.rcaMethodLabels || {};
  const [activeProblems, setActiveProblems] = useState([]);
  const [trend, setTrend] = useState([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(initialForm);
  const [activeView, setActiveView] = useState('overview');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [incidents, setIncidents] = useState([]);
  const [allProblems, setAllProblems] = useState([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [metricsApi, setMetricsApi] = useState(null);
  const [incidentSearch, setIncidentSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_desc');

  const loadOverview = async () => {
    try {
      const [allData, activeData, trendData, metricsData] = await Promise.all([
        api.getProblems(),
        api.getActiveProblems(),
        api.getTrend(),
        api.getProblemMetrics(),
      ]);
      setAllProblems(allData);
      setActiveProblems(activeData);
      setTrend(trendData);
      setMetricsApi(metricsData);
    } catch (error) {
      setMessage(error.message);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  // Determine user role/client id from token for UI-level hiding (defensive)
  const getRoleFromToken = () => {
    try {
      const token = localStorage.getItem('telecom_itsm_token');
      if (!token) return null;
      const payload = token.split('.')[1];
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      const decoded = JSON.parse(atob(padded));
      return { role: decoded?.uloga || decoded?.role || null, id: decoded?.id || decoded?.userId || null };
    } catch (e) {
      return { role: null, id: null };
    }
  };

  const currentUser = getRoleFromToken();
  const isRestrictedViewer = currentUser.role === 'noc_operater' || currentUser.role === 'it_inzenjer';

  const role = currentUser.role;
  const canViewOverview = ['admin', 'problem_manager', 'noc_operater', 'it_inzenjer'].includes(role);
  const canViewNew = ['problem_manager', 'noc_operater', 'admin'].includes(role);
  const canViewRca = ['problem_manager', 'it_inzenjer', 'admin'].includes(role);
  const canViewKedb = ['admin', 'problem_manager', 'noc_operater', 'it_inzenjer'].includes(role);

  useEffect(() => {
    if (activeView === 'create' && !canViewNew) setActiveView('overview');
    if (activeView === 'rca' && !canViewRca) setActiveView('overview');
    if (activeView === 'kedb' && !canViewKedb) setActiveView('overview');
  }, [activeView, canViewNew, canViewRca, canViewKedb]);

  useEffect(() => {
    let alive = true;

    const loadUsers = async () => {
      try {
        const data = await api.getUsers();
        if (alive) {
          setUsers(data.filter((user) => user.status === 'aktivan'));
        }
      } catch (error) {
        if (alive) {
          setMessage(error.message);
        }
      } finally {
        if (alive) {
          setUsersLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    const loadLookups = async () => {
      try {
        const [incidentData, problemData] = await Promise.all([api.getIncidents(100), api.getProblems()]);
        if (alive) {
          setIncidents(incidentData);
          setAllProblems(problemData);
        }
      } catch (error) {
        if (alive) {
          setMessage(error.message);
        }
      } finally {
        if (alive) {
          setLookupsLoading(false);
        }
      }
    };

    loadLookups();

    return () => {
      alive = false;
    };
  }, []);

  const assignedUserOptions = useMemo(() => {
    return users.map((user) => ({
      value: String(user.id),
      label: `${user.ime} ${user.prezime} · ${user.email}`,
    }));
  }, [users]);

  const incidentOptions = useMemo(() => {
    return incidents.map((incident) => ({
      value: String(incident.id),
      label: formatIncidentLabel(incident),
    }));
  }, [incidents]);

  const incidentLookup = useMemo(() => {
    return new Map(incidents.map((incident) => [String(incident.id), incident]));
  }, [incidents]);

  const filteredIncidentOptions = useMemo(() => {
    const query = incidentSearch.trim().toLowerCase();
    if (!query) return incidentOptions;
    return incidentOptions.filter((item) => item.label.toLowerCase().includes(query));
  }, [incidentOptions, incidentSearch]);

  const problemSteps = t.problemSteps || [];

  const metrics = useMemo(() => {
    const counts = { P1: 0, P2: 0, P3: 0, P4: 0 };

    for (const problem of allProblems) {
      if (counts[problem.prioritet] !== undefined) {
        counts[problem.prioritet] += 1;
      }
    }

    const openCount = allProblems.filter((problem) => !closedStatuses.has(problem.status)).length;
    const closedCount = allProblems.length - openCount;

    return [
      { label: t.open || (language === 'bs' ? 'Otvoreno' : 'Open'), value: openCount, tone: 'accent' },
      { label: t.closed || (language === 'bs' ? 'Zatvoreno' : 'Closed'), value: closedCount, tone: 'muted' },
      { label: 'P1', value: counts.P1, tone: 'critical' },
      { label: 'P2', value: counts.P2, tone: 'high' },
      { label: 'P3', value: counts.P3, tone: 'medium' },
      { label: 'P4', value: counts.P4, tone: 'low' },
    ];
  }, [allProblems]);

  const filteredProblems = useMemo(() => {
    const list = [...activeProblems]
      .filter((item) => (priorityFilter === 'all' ? true : item.prioritet === priorityFilter))
      .filter((item) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'open') return !closedStatuses.has(item.status);
        if (statusFilter === 'closed') return closedStatuses.has(item.status);
        return item.status === statusFilter;
      });

    list.sort((a, b) => {
      if (sortBy === 'created_asc') return new Date(a.kreiran_u).getTime() - new Date(b.kreiran_u).getTime();
      if (sortBy === 'priority') {
        const weight = { P1: 1, P2: 2, P3: 3, P4: 4 };
        return (weight[a.prioritet] || 99) - (weight[b.prioritet] || 99);
      }
      return new Date(b.kreiran_u).getTime() - new Date(a.kreiran_u).getTime();
    });

    return list;
  }, [activeProblems, priorityFilter, statusFilter, sortBy]);

  const trendChartData = useMemo(() => {
    const sorted = [...trend].sort((a, b) => new Date(a.dan) - new Date(b.dan));
    const lastItems = sorted.slice(-8);
    const maxValue = Math.max(...lastItems.map((item) => Number(item.broj || 0)), 1);
    return lastItems.map((item) => ({
      day: new Date(item.dan).toLocaleDateString(),
      value: Number(item.broj || 0),
      width: Math.round((Number(item.broj || 0) / maxValue) * 100),
    }));
  }, [trend]);

  const submitProblem = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      const uniqueIncidents = [...new Set(form.incident_ids)];

      if (!uniqueIncidents.length) {
        setMessage(t.selectIncident);
        return;
      }

      if (!form.naziv || !form.naziv.trim()) {
        setMessage(t.titleRequired);
        return;
      }

      if (uniqueIncidents.length !== form.incident_ids.length) {
        setForm((prev) => ({ ...prev, incident_ids: uniqueIncidents }));
      }

      await api.createProblem({
        incident_ids: uniqueIncidents.map((item) => Number(item)),
        dodijeljen_id: form.dodijeljen_id ? Number(form.dodijeljen_id) : undefined,
        prioritet: form.prioritet,
        naziv: form.naziv,
      });

      setForm(initialForm);
      setIncidentSearch('');
      setMessage(t.created);
      loadOverview();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const toggleIncident = (incidentId) => {
    setForm((prev) => {
      const exists = prev.incident_ids.includes(incidentId);
      return {
        ...prev,
        incident_ids: exists
          ? prev.incident_ids.filter((id) => id !== incidentId)
          : [...prev.incident_ids, incidentId],
      };
    });
  };

  const calculatePhases = () => {
    const phase1 = allProblems.filter((p) => ['novo', 'istrazivanje'].includes(p.status)).length;
    const phase2 = allProblems.filter((p) => ['istrazivanje', 'rca_zavrsen'].includes(p.status)).length;
    const phase3 = allProblems.filter((p) => ['workaround_aktivan', 'fix_u_toku', 'riješen', 'zatvoren'].includes(p.status)).length;
    const phaseTemplates = (t.phases && t.phases.length === 3)
      ? t.phases
      : [
        { name: 'Problem Identification', description: 'Discovery, categorization, and prioritization of problems' },
        { name: 'Problem Control', description: 'Investigation, diagnostics, and root cause analysis' },
        { name: 'Error Control', description: 'Workaround implementation, fix deployment, and closure' },
      ];

    return phaseTemplates.map((tpl, idx) => {
      const count = idx === 0 ? phase1 : idx === 1 ? phase2 : phase3;
      const tone = idx === 0 ? 'accent' : idx === 1 ? 'high' : 'success';
      const bgClass = idx === 0 ? 'phase-identification' : idx === 1 ? 'phase-control' : 'phase-error-control';
      return {
        name: tpl.name,
        description: tpl.description,
        count,
        tone,
        bgClass,
      };
    });
  };

  return (
    <div className="stack single-column">
      <section className="panel phases-panel">
        <h3 className="section-title">{t.phasesTitle || (language === 'bs' ? 'ITIL upravljanje problemima - tri faze' : 'ITIL Problem Management — Three Phases')}</h3>
        <div className="phases-grid">
          {calculatePhases().map((phase) => (
            <article key={phase.name} className={`phase-card ${phase.bgClass}`}>
              <div className="phase-header">
                <h4 className="phase-name">{phase.name}</h4>
                <span className={`phase-count metric-${phase.tone}`}>{phase.count}</span>
              </div>
              <p className="phase-description">{phase.description}</p>
              <div className="phase-progress">
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{width: `${phase.count > 0 ? Math.min((phase.count / Math.max(...calculatePhases().map(ph => ph.count), 1)) * 100, 100) : 0}%`}}></div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel process-panel">
        <h3 className="section-title">{t.flowTitle || (language === 'bs' ? 'Tok problema' : 'Problem Flow')}</h3>
        <div className="process-steps">
          {problemSteps.map((step, index) => (
            <div className="process-step" key={step}>
              <span className="process-step-index">0{index + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
        <div className="status-legend">
          <span className="legend-item"><span className="legend-swatch priority-p1" />{priorityLabels.P1 || 'P1'}</span>
          <span className="legend-item"><span className="legend-swatch priority-p2" />{priorityLabels.P2 || 'P2'}</span>
          <span className="legend-item"><span className="legend-swatch priority-p3" />{priorityLabels.P3 || 'P3'}</span>
          <span className="legend-item"><span className="legend-swatch priority-p4" />{priorityLabels.P4 || 'P4'}</span>
        </div>
      </section>

      <section className="problem-metrics">
        {(metricsApi
            ? [
              { label: language === 'bs' ? 'Otvoreno' : 'Open', value: metricsApi.open, tone: 'accent' },
              { label: language === 'bs' ? 'Zatvoreno' : 'Closed', value: metricsApi.closed, tone: 'muted' },
              { label: 'P1', value: metricsApi.p1, tone: 'critical' },
              { label: 'P2', value: metricsApi.p2, tone: 'high' },
              { label: 'P3', value: metricsApi.p3, tone: 'medium' },
              { label: 'P4', value: metricsApi.p4, tone: 'low' },
            ]
          : metrics).map((metric) => (
          <article key={metric.label} className={`metric-card metric-${metric.tone}`}>
            <span className="metric-label">{metric.label}</span>
            <strong className="metric-value">{metric.value}</strong>
          </article>
        ))}
      </section>

      <section className="panel view-switch">
        {canViewOverview ? (
          <button className={activeView === 'overview' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('overview')}>{language === 'bs' ? 'Pregled' : 'Overview'}</button>
        ) : null}
        {canViewNew ? (
          <button className={activeView === 'create' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('create')}>{language === 'bs' ? 'Novi problem' : 'New Problem'}</button>
        ) : null}
        {canViewRca ? (
          <button className={activeView === 'rca' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('rca')}>{language === 'bs' ? 'RCA radni prostor' : 'RCA Workspace'}</button>
        ) : null}
        {canViewKedb ? (
          <button className={activeView === 'kedb' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('kedb')}>{language === 'bs' ? 'Poznate greške' : 'Known Errors'}</button>
        ) : null}
      </section>

      {activeView === 'create' ? (
        <section className="panel">
          <h3 className="section-title">{language === 'bs' ? 'Kreiraj zapis problema' : 'Create Problem Record'}</h3>
          <form className="form-grid" onSubmit={submitProblem}>
            <label>
              {language === 'bs' ? 'Pretraga incidenata' : 'Incident Lookup'}
              <input
                placeholder={language === 'bs' ? 'Pretraži incidente...' : 'Search incidents...'}
                value={incidentSearch}
                onChange={(event) => setIncidentSearch(event.target.value)}
                disabled={lookupsLoading}
              />
              <div className="lookup-list" role="listbox" aria-label="Incident lookup">
                {filteredIncidentOptions.map((incident) => {
                  const checked = form.incident_ids.includes(incident.value);
                  return (
                    <label className={checked ? 'lookup-item checked' : 'lookup-item'} key={incident.value}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleIncident(incident.value)}
                        disabled={lookupsLoading}
                      />
                      <span>{incident.label}</span>
                    </label>
                  );
                })}
              </div>
              <span className="helper-line">
                {lookupsLoading ? (language === 'bs' ? 'Učitavanje incidenata...' : 'Loading incidents...') : `${form.incident_ids.length} ${language === 'bs' ? 'incident(a) odabrano' : 'incident(s) selected'}`}
              </span>
            </label>
            <label>
              {language === 'bs' ? 'Naziv problema' : 'Problem Title'}
              <input
                placeholder={language === 'bs' ? 'Obavezno: kratak opisni naziv' : 'Required: short descriptive title'}
                value={form.naziv}
                onChange={(e) => setForm((prev) => ({ ...prev, naziv: e.target.value }))}
                required
              />
            </label>
            <label>
              {language === 'bs' ? 'Dodijeljeni korisnik' : 'Assigned User'}
              <select
                value={form.dodijeljen_id}
                onChange={(event) => setForm((prev) => ({ ...prev, dodijeljen_id: event.target.value }))}
                disabled={usersLoading}
              >
                <option value="">{usersLoading ? (language === 'bs' ? 'Učitavanje korisnika...' : 'Loading users...') : (language === 'bs' ? 'Opcionalno: odaberi izvršioca' : 'Optional: select assignee')}</option>
                {assignedUserOptions.map((user) => (
                  <option key={user.value} value={user.value}>{user.label}</option>
                ))}
              </select>
            </label>
            <label>
              {language === 'bs' ? 'Prioritet' : 'Priority'}
              <select
                value={form.prioritet}
                onChange={(event) => setForm((prev) => ({ ...prev, prioritet: event.target.value }))}
              >
                <option value="P1">{priorityLabels.P1}</option>
                <option value="P2">{priorityLabels.P2}</option>
                <option value="P3">{priorityLabels.P3}</option>
                <option value="P4">{priorityLabels.P4}</option>
              </select>
            </label>
            <button className="btn-primary form-action" type="submit">{language === 'bs' ? 'Kreiraj problem' : 'Create Problem'}</button>
          </form>
          {message ? <p className="status-line">{message}</p> : null}
        </section>
      ) : null}

      {activeView === 'rca' ? <RCAWorkspace language={language} onUpdated={loadOverview} /> : null}

      {activeView === 'overview' ? (
        <div className="split-panels">
          <section className="panel table-panel">
            <h3 className="section-title">{language === 'bs' ? 'Aktivni problemi' : 'Active Problems'}</h3>
            <div className="table-toolbar">
              <div className="toolbar-group">
                <span className="toolbar-label">{language === 'bs' ? 'Prioritet' : 'Priority'}</span>
                <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                  <option value="all">{language === 'bs' ? 'Svi prioriteti' : 'All priorities'}</option>
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                  <option value="P4">P4</option>
                </select>
              </div>
              <div className="toolbar-group">
                <span className="toolbar-label">{language === 'bs' ? 'Status' : 'Status'}</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">{language === 'bs' ? 'Svi statusi' : 'All statuses'}</option>
                  <option value="open">{language === 'bs' ? 'Otvoreno' : 'Open'}</option>
                  <option value="closed">{language === 'bs' ? 'Zatvoreno' : 'Closed'}</option>
                  <option value="novo">{language === 'bs' ? 'Novo' : 'New'}</option>
                  <option value="istrazivanje">{language === 'bs' ? 'Istraživanje' : 'Investigating'}</option>
                  <option value="fix_u_toku">{language === 'bs' ? 'Fix u toku' : 'Fix In Progress'}</option>
                </select>
              </div>
              <div className="toolbar-group">
                <span className="toolbar-label">{language === 'bs' ? 'Sortiranje' : 'Sort'}</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="created_desc">{language === 'bs' ? 'Najnoviji prvo' : 'Newest first'}</option>
                  <option value="created_asc">Oldest first</option>
                  <option value="priority">By priority (P1-P4)</option>
                </select>
              </div>
            </div>
            <div className="table-wrap">
              <table className="active-problems-table">
                <colgroup>
                  <col className="col-id" />
                  <col className="col-title" />
                  <col className="col-status" />
                  <col className="col-priority" />
                  <col className="col-assigned" />
                  <col className="col-rca" />
                  <col className="col-created" />
                </colgroup>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>{t.titleLabel || (language === 'bs' ? 'Naslov' : 'Title')}</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Assigned</th>
                    <th>RCA Method</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProblems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>
                        {(() => {
                          const incident = incidentLookup.get(String(item.incident_id));
                          return incident ? formatIncidentLabel(incident) : (t.noTitle || (language === 'bs' ? 'Bez naslova' : 'Untitled'));
                        })()}
                      </td>
                      <td><span className={`badge active-badge ${getStatusClass(item.status)}`}>{statusLabels[item.status] || item.status}</span></td>
                      <td><span className={`badge active-badge ${priorityClassMap[item.prioritet] || 'priority-p4'}`}>{priorityLabels[item.prioritet] || item.prioritet}</span></td>
                      <td className="assigned-cell">{item.ime || item.dodijeljen_id ? `${item.ime || ''} ${item.prezime || ''}`.trim() : '-'}</td>
                      <td>{rcaMethodLabels[item.rca_metoda] || item.rca_metoda || '-'}</td>
                      <td>{new Date(item.kreiran_u).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!filteredProblems.length ? (
                    <tr>
                      <td colSpan={7}>No problems match the selected filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel table-panel">
            <h3 className="section-title">Incident Trend (30 Days)</h3>
            <div className="trend-chart">
                  {trendChartData.length ? trendChartData.map((item) => (
                    <div className="trend-row" key={item.day}>
                      <span className="trend-day">{item.day}</span>
                      <div className="trend-bar-track">
                        <div className="trend-bar-fill" style={{ width: `${item.width}%` }} />
                      </div>
                      <span className="trend-value">{item.value}</span>
                    </div>
                  )) : (
                    <div className="empty-state compact">
                      <strong>{language === 'bs' ? 'Nema trend podataka' : 'No trend data available'}</strong>
                      <span>{language === 'bs' ? 'Trend se puni iz incidenata iz posljednjih 30 dana.' : 'The chart is based on incidents created in the last 30 days.'}</span>
                    </div>
                  )}
            </div>
          </section>
        </div>
      ) : null}

      {activeView === 'kedb' ? <KEDBView /> : null}
    </div>
  );
}
