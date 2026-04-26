import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';

export default function KEDBView() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [form, setForm] = useState({
    problem_id: '',
    status: '',
    workaround: '',
    trajni_fix: '',
  });

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const [kedbData, problemData] = await Promise.all([api.getKedb(), api.getProblems()]);
      setItems(kedbData);
      setProblems(problemData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const problemOptions = useMemo(() => {
    return problems.map((problem) => ({
      value: String(problem.id),
      label: `#${problem.id} · ${problem.prioritet} · ${problem.status}`,
    }));
  }, [problems]);

  const problemPriorityMap = useMemo(() => {
    const map = {};
    for (const problem of problems) {
      map[problem.id] = problem.prioritet;
    }
    return map;
  }, [problems]);

  const filteredItems = useMemo(() => {
    const list = items.filter((item) => (statusFilter === 'all' ? true : item.status === statusFilter));
    list.sort((a, b) => {
      if (sortBy === 'oldest') return a.id - b.id;
      return b.id - a.id;
    });
    return list;
  }, [items, statusFilter, sortBy]);

  const selectItem = (item) => {
    setSelectedId(String(item.id));
    setForm({
      problem_id: item.problem_id ? String(item.problem_id) : '',
      status: item.status || '',
      workaround: item.workaround || '',
      trajni_fix: item.trajni_fix || '',
    });
  };

  const resetForm = () => {
    setSelectedId('');
    setForm({
      problem_id: '',
      status: '',
      workaround: '',
      trajni_fix: '',
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (selectedId) {
        await api.updateKedb(selectedId, {
          problem_id: Number(form.problem_id),
          status: form.status,
          workaround: form.workaround,
          trajni_fix: form.trajni_fix,
        });
      } else {
        await api.createKedb({
          problem_id: Number(form.problem_id),
          status: form.status,
          workaround: form.workaround,
          trajni_fix: form.trajni_fix,
        });
      }

      await load();
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="stack">
      <section className="panel">
        <h3 className="section-title">KEDB Editor</h3>
        <form className="form-grid compact" onSubmit={submit}>
          <label>
            Linked Problem
            <select value={form.problem_id} onChange={(event) => setForm((prev) => ({ ...prev, problem_id: event.target.value }))} required>
              <option value="">Select problem</option>
              {problemOptions.map((problem) => (
                <option key={problem.value} value={problem.value}>{problem.label}</option>
              ))}
            </select>
          </label>
          <label>
            KEDB Status
            <input value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} placeholder="active" required />
          </label>
          <label>
            Workaround
            <textarea value={form.workaround} rows={3} onChange={(event) => setForm((prev) => ({ ...prev, workaround: event.target.value }))} required />
          </label>
          <label>
            Permanent Fix
            <textarea value={form.trajni_fix} rows={3} onChange={(event) => setForm((prev) => ({ ...prev, trajni_fix: event.target.value }))} required />
          </label>
          <div className="action-row">
            <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : selectedId ? 'Update KEDB Entry' : 'Create KEDB Entry'}</button>
            {selectedId ? <button className="btn-secondary" type="button" onClick={resetForm}>Cancel Edit</button> : null}
          </div>
        </form>
      </section>

      <section className="panel table-panel">
        <h3 className="section-title">Known Error Register</h3>
        {loading ? <p>Loading KEDB...</p> : null}
        {error ? <p className="error-line">{error}</p> : null}
        <div className="table-toolbar compact">
          <div className="toolbar-group">
            <span className="toolbar-label">Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="known_error">Known Error</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div className="toolbar-group">
            <span className="toolbar-label">Sort</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="latest">Latest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table className="kedb-table">
            <colgroup>
              <col className="col-id" />
              <col className="col-problem" />
              <col className="col-priority" />
              <col className="col-status" />
              <col className="col-workaround" />
              <col className="col-fix" />
              <col className="col-action" />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th>Problem</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Workaround</th>
                <th>Permanent Fix</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.problem_id}</td>
                  <td><span className={`badge ${problemPriorityMap[item.problem_id] === 'P1' ? 'priority-p1' : problemPriorityMap[item.problem_id] === 'P2' ? 'priority-p2' : problemPriorityMap[item.problem_id] === 'P3' ? 'priority-p3' : 'priority-p4'}`}>{problemPriorityMap[item.problem_id] || '-'}</span></td>
                  <td><span className={`badge ${item.status === 'resolved' ? 'status-success' : item.status === 'known_error' ? 'status-warning' : 'status-open'}`}>{item.status}</span></td>
                  <td>{item.workaround || '-'}</td>
                  <td>{item.trajni_fix || '-'}</td>
                  <td><button className="btn-secondary" type="button" onClick={() => selectItem(item)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
