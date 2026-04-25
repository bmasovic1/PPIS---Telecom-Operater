import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import RCAWorkspace from './RCAWorkspace';
import KEDBView from './KEDBView';

const initialForm = {
  incident_ids: '',
  dodijeljen_id: '',
  prioritet: 'P3',
};

export default function ProblemDashboard() {
  const [activeProblems, setActiveProblems] = useState([]);
  const [trend, setTrend] = useState([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(initialForm);
  const [activeView, setActiveView] = useState('overview');

  const load = async () => {
    try {
      const [activeData, trendData] = await Promise.all([api.getActiveProblems(), api.getTrend()]);
      setActiveProblems(activeData);
      setTrend(trendData);
    } catch (error) {
      setMessage(error.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitProblem = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      const incidentIds = form.incident_ids
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item > 0);

      await api.createProblem({
        incident_ids: incidentIds,
        dodijeljen_id: form.dodijeljen_id ? Number(form.dodijeljen_id) : undefined,
        prioritet: form.prioritet,
      });

      setForm(initialForm);
      setMessage('Problem created successfully.');
      load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="stack single-column">
      <section className="panel view-switch">
        <button className={activeView === 'overview' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('overview')}>Overview</button>
        <button className={activeView === 'create' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('create')}>Create Problem</button>
        <button className={activeView === 'rca' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('rca')}>RCA Workspace</button>
        <button className={activeView === 'kedb' ? 'chip-btn active' : 'chip-btn'} onClick={() => setActiveView('kedb')}>KEDB</button>
      </section>

      {activeView === 'create' ? (
        <section className="panel">
          <h3>Create Problem Record</h3>
          <form className="form-grid" onSubmit={submitProblem}>
            <label>
              Incident IDs (comma separated)
              <input
                value={form.incident_ids}
                onChange={(event) => setForm((prev) => ({ ...prev, incident_ids: event.target.value }))}
                placeholder="1,2,3"
                required
              />
            </label>
            <label>
              Assigned User ID
              <input
                value={form.dodijeljen_id}
                onChange={(event) => setForm((prev) => ({ ...prev, dodijeljen_id: event.target.value }))}
              />
            </label>
            <label>
              Priority
              <select
                value={form.prioritet}
                onChange={(event) => setForm((prev) => ({ ...prev, prioritet: event.target.value }))}
              >
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
                <option value="P4">P4</option>
              </select>
            </label>
            <button className="btn-primary form-action" type="submit">Create Record</button>
          </form>
          {message ? <p className="status-line">{message}</p> : null}
        </section>
      ) : null}

      {activeView === 'rca' ? <RCAWorkspace onUpdated={load} /> : null}

      {activeView === 'overview' ? (
        <div className="split-panels">
          <section className="panel table-panel">
            <h3>Active Problems</h3>
            <div className="table-wrap">
              <table>
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
                  {activeProblems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.status}</td>
                      <td>{item.prioritet}</td>
                      <td>{item.rca_metoda || '-'}</td>
                      <td>{new Date(item.kreiran_u).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel table-panel">
            <h3>Incident Trend (30 days)</h3>
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
