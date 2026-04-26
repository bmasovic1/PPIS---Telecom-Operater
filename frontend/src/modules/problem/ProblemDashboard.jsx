import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import RCAWorkspace from './RCAWorkspace';
import KEDBView from './KEDBView';

const initialForm = {
  incident_ids: [],
  dodijeljen_id: '',
  prioritet: 'P3',
};

const priorityLabels = {
  P1: 'P1 - Critical',
  P2: 'P2 - High',
  P3: 'P3 - Medium',
  P4: 'P4 - Low',
};

const statusLabels = {
  novo: 'New',
  istrazivanje: 'Investigating',
  workaround_aktivan: 'Workaround',
  rca_zavrsen: 'RCA Done',
  fix_u_toku: 'In Progress',
  riješen: 'Resolved',
  zatvoren: 'Closed',
};

const rcaMethodLabels = {
  '5_whys': '5 Whys',
  ishikawa: 'Ishikawa',
  fault_tree: 'Fault Tree',
  kepner_tregoe: 'Kepner-Tregoe',
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

export default function ProblemDashboard() {
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

  const filteredIncidentOptions = useMemo(() => {
    const query = incidentSearch.trim().toLowerCase();
    if (!query) return incidentOptions;
    return incidentOptions.filter((item) => item.label.toLowerCase().includes(query));
  }, [incidentOptions, incidentSearch]);

  const problemSteps = [
    'Capture repeated incidents and assign ownership',
    'Investigate root cause with RCA workspace',
    'Create or update KEDB knowledge entry',
    'Track workaround and permanent fix',
    'Close only after verification and recovery',
  ];

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
      { label: 'Open', value: openCount, tone: 'accent' },
      { label: 'Closed', value: closedCount, tone: 'muted' },
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
        setMessage('Select at least one incident.');
        return;
      }

      if (uniqueIncidents.length !== form.incident_ids.length) {
        setForm((prev) => ({ ...prev, incident_ids: uniqueIncidents }));
      }

      await api.createProblem({
        incident_ids: uniqueIncidents.map((item) => Number(item)),
        dodijeljen_id: form.dodijeljen_id ? Number(form.dodijeljen_id) : undefined,
        prioritet: form.prioritet,
      });

      setForm(initialForm);
      setIncidentSearch('');
      setMessage('Problem created successfully.');
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

  return (
    <div className="stack single-column">
      <section className="panel process-panel">
        <h3 className="section-title">Problem Flow</h3>
        <div className="process-steps">
          {problemSteps.map((step, index) => (
            <div className="process-step" key={step}>
              <span className="process-step-index">0{index + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
        <div className="status-legend">
          <span className="legend-item"><span className="legend-swatch priority-p1" />P1 Critical</span>
          <span className="legend-item"><span className="legend-swatch priority-p2" />P2 High</span>
          <span className="legend-item"><span className="legend-swatch priority-p3" />P3 Medium</span>
          <span className="legend-item"><span className="legend-swatch priority-p4" />P4 Low</span>
        </div>
      </section>

      <section className="problem-metrics">
        {(metricsApi
          ? [
              { label: 'Open', value: metricsApi.open, tone: 'accent' },
              { label: 'Closed', value: metricsApi.closed, tone: 'muted' },
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
        <button className={activeView === 'overview' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('overview')}>Overview</button>
        <button className={activeView === 'create' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('create')}>New Problem</button>
        <button className={activeView === 'rca' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('rca')}>RCA Workspace</button>
        <button className={activeView === 'kedb' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('kedb')}>Known Errors</button>
      </section>

      {activeView === 'create' ? (
        <section className="panel">
          <h3 className="section-title">Create Problem Record</h3>
          <form className="form-grid" onSubmit={submitProblem}>
            <label>
              Incident Lookup
              <input
                placeholder="Search incidents..."
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
                {lookupsLoading ? 'Loading incidents...' : `${form.incident_ids.length} incident(s) selected`}
              </span>
            </label>
            <label>
              Assigned User
              <select
                value={form.dodijeljen_id}
                onChange={(event) => setForm((prev) => ({ ...prev, dodijeljen_id: event.target.value }))}
                disabled={usersLoading}
              >
                <option value="">{usersLoading ? 'Loading users...' : 'Optional: select assignee'}</option>
                {assignedUserOptions.map((user) => (
                  <option key={user.value} value={user.value}>{user.label}</option>
                ))}
              </select>
            </label>
            <label>
              Priority
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
            <button className="btn-primary form-action" type="submit">Create Problem</button>
          </form>
          {message ? <p className="status-line">{message}</p> : null}
        </section>
      ) : null}

      {activeView === 'rca' ? <RCAWorkspace onUpdated={loadOverview} /> : null}

      {activeView === 'overview' ? (
        <div className="split-panels">
          <section className="panel table-panel">
            <h3 className="section-title">Active Problems</h3>
            <div className="table-toolbar">
              <div className="toolbar-group">
                <span className="toolbar-label">Priority</span>
                <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                  <option value="all">All priorities</option>
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                  <option value="P4">P4</option>
                </select>
              </div>
              <div className="toolbar-group">
                <span className="toolbar-label">Status</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="novo">New</option>
                  <option value="istrazivanje">Investigating</option>
                  <option value="fix_u_toku">Fix In Progress</option>
                </select>
              </div>
              <div className="toolbar-group">
                <span className="toolbar-label">Sort</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="created_desc">Newest first</option>
                  <option value="created_asc">Oldest first</option>
                  <option value="priority">By priority (P1-P4)</option>
                </select>
              </div>
            </div>
            <div className="table-wrap">
              <table className="active-problems-table">
                <colgroup>
                  <col className="col-id" />
                  <col className="col-status" />
                  <col className="col-priority" />
                  <col className="col-rca" />
                  <col className="col-created" />
                </colgroup>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>RCA Method</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProblems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td><span className={`badge active-badge ${getStatusClass(item.status)}`}>{statusLabels[item.status] || item.status}</span></td>
                      <td><span className={`badge active-badge ${priorityClassMap[item.prioritet] || 'priority-p4'}`}>{priorityLabels[item.prioritet] || item.prioritet}</span></td>
                      <td>{rcaMethodLabels[item.rca_metoda] || item.rca_metoda || '-'}</td>
                      <td>{new Date(item.kreiran_u).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!filteredProblems.length ? (
                    <tr>
                      <td colSpan={5}>No problems match the selected filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel table-panel">
            <h3 className="section-title">Incident Trend (30 Days)</h3>
            <div className="trend-chart">
              {trendChartData.map((item) => (
                <div className="trend-row" key={item.day}>
                  <span className="trend-day">{item.day}</span>
                  <div className="trend-bar-track">
                    <div className="trend-bar-fill" style={{ width: `${item.width}%` }} />
                  </div>
                  <span className="trend-value">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Incidents</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map((item) => (
                    <tr key={item.dan}>
                      <td>{new Date(item.dan).toLocaleDateString()}</td>
                      <td>{item.broj}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {activeView === 'kedb' ? <KEDBView /> : null}
    </div>
  );
}
