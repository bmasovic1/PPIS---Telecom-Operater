import { useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '../../api/client';

const translations = {
  bs: {
    title: 'Uređivač KEDB-a',
    linkedProblem: 'Povezani problem',
    errorDescription: 'Opis greške',
    selectProblem: 'Odaberi problem',
    status: 'Status KEDB-a',
    workaround: 'Zaobilazno rješenje',
    permanentFix: 'Trajni fix',
    saving: 'Spremanje...',
    saved: 'KEDB unos uspješno kreiran.',
    update: 'Ažuriraj KEDB unos',
    create: 'Kreiraj KEDB unos',
    cancel: 'Otkaži uređivanje',
    readonly: 'Imate samo pravo čitanja nad listom poznatih grešaka.',
    register: 'Registar poznatih grešaka',
    loading: 'Učitavanje KEDB-a...',
    allStatuses: 'Svi statusi',
    active: 'Aktivno',
    knownError: 'Poznata greška',
    resolved: 'Riješeno',
    sort: 'Sortiranje',
    latest: 'Najnovije prvo',
    oldest: 'Najstarije prvo',
    problem: 'Problem',
    priority: 'Prioritet',
    action: 'Akcija',
  },
  en: {
    title: 'KEDB Editor',
    linkedProblem: 'Linked Problem',
    errorDescription: 'Error Description',
    selectProblem: 'Select problem',
    status: 'KEDB Status',
    workaround: 'Workaround',
    permanentFix: 'Permanent Fix',
    saving: 'Saving...',
    saved: 'KEDB entry created successfully.',
    update: 'Update KEDB Entry',
    create: 'Create KEDB Entry',
    cancel: 'Cancel Edit',
    readonly: 'You have read-only access to the Known Errors list.',
    register: 'Known Error Register',
    loading: 'Loading KEDB...',
    allStatuses: 'All statuses',
    active: 'Active',
    knownError: 'Known Error',
    resolved: 'Resolved',
    sort: 'Sort',
    latest: 'Latest first',
    oldest: 'Oldest first',
    problem: 'Problem',
    priority: 'Priority',
    action: 'Action',
  },
};

export default function KEDBView({ language = 'en' }) {
  const t = translations[language] || translations.en;
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [form, setForm] = useState({
    problem_id: '',
    opis_greske: '',
    status: 'workaround_aktivan',
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
      label: problem.root_cause && problem.root_cause.trim()
        ? problem.root_cause
        : `Problem #${problem.id} · P${problem.prioritet}`,
    }));
  }, [problems]);

  const getRoleFromToken = () => {
    try {
      const token = localStorage.getItem('telecom_itsm_token');
      if (!token) return { role: null, id: null };
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
  const role = currentUser.role;
  const canEditKedb = ['problem_manager', 'admin'].includes(role);
  const isRestrictedViewer = currentUser.role === 'noc_operater' || currentUser.role === 'it_inzenjer';
  const filteredProblemOptions = isRestrictedViewer ? problemOptions.filter((p) => {
    const problem = problems.find((x) => String(x.id) === p.value);
    return problem && Number(problem.dodijeljen_id) === Number(currentUser.id);
  }) : problemOptions;

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
      opis_greske: item.opis_greske || '',
      status: item.status || '',
      workaround: item.workaround || '',
      trajni_fix: item.trajni_fix || '',
    });
  };

  const resetForm = () => {
    setSelectedId('');
    setForm({
      problem_id: '',
      opis_greske: '',
      status: 'workaround_aktivan',
      workaround: '',
      trajni_fix: '',
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (selectedId) {
        await api.updateKedb(selectedId, {
          problem_id: Number(form.problem_id),
          opis_greske: form.opis_greske,
          status: form.status,
          workaround: form.workaround,
          trajni_fix: form.trajni_fix,
        });
      } else {
        await api.createKedb({
          problem_id: Number(form.problem_id),
          opis_greske: form.opis_greske,
          status: form.status,
          workaround: form.workaround,
          trajni_fix: form.trajni_fix,
        });
      }

      await load();
      resetForm();
      setSuccess(t.saved);
    } catch (err) {
      setSuccess('');
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="stack">
      <section className="panel kedb-editor-panel">
        <h3 className="section-title">{t.title}</h3>
        <form className="form-grid compact kedb-form" onSubmit={submit}>
          <div className="kedb-row">
            <label>
              {t.linkedProblem}
              <select value={form.problem_id} onChange={(event) => setForm((prev) => ({ ...prev, problem_id: event.target.value }))} required>
                <option value="">{t.selectProblem}</option>
                {filteredProblemOptions.map((problem) => (
                  <option key={problem.value} value={problem.value}>{problem.label}</option>
                ))}
              </select>
            </label>
            <label>
              {t.status}
              <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} required>
                <option value="workaround_aktivan">workaround_aktivan</option>
                <option value="fix_u_razvoju">fix_u_razvoju</option>
                <option value="fix_implementiran">fix_implementiran</option>
              </select>
            </label>
          </div>
          <div className="kedb-row">
            <label>
              {t.errorDescription}
              <textarea
                value={form.opis_greske}
                rows={3}
                onChange={(event) => setForm((prev) => ({ ...prev, opis_greske: event.target.value }))}
                required
              />
            </label>
            <label>
              {t.workaround}
              <textarea value={form.workaround} rows={3} onChange={(event) => setForm((prev) => ({ ...prev, workaround: event.target.value }))} required />
            </label>
          </div>
          <label className="kedb-wide-field">
            {t.permanentFix}
            <textarea value={form.trajni_fix} rows={3} onChange={(event) => setForm((prev) => ({ ...prev, trajni_fix: event.target.value }))} required />
          </label>
          <div className="action-row kedb-form-actions">
            {canEditKedb ? (
              <>
                <button className="btn-primary" type="submit" disabled={saving}>{saving ? t.saving : selectedId ? t.update : t.create}</button>
                {selectedId ? <button className="btn-secondary" type="button" onClick={resetForm}>{t.cancel}</button> : null}
              </>
            ) : (
              <p className="helper-line">{t.readonly}</p>
            )}
          </div>
        </form>
      </section>

      <section className="panel table-panel">
        <h3 className="section-title">{t.register}</h3>
        {success ? <p className="status-line status-line-success">{success}</p> : null}
        {loading ? <p>{t.loading}</p> : null}
        {error ? <p className="error-line">{error}</p> : null}
        <div className="table-toolbar compact">
          <div className="toolbar-group">
            <span className="toolbar-label">{t.status}</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">{t.allStatuses}</option>
              <option value="active">{t.active}</option>
              <option value="known_error">{t.knownError}</option>
              <option value="resolved">{t.resolved}</option>
            </select>
          </div>
          <div className="toolbar-group">
            <span className="toolbar-label">{t.sort}</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="latest">{t.latest}</option>
              <option value="oldest">{t.oldest}</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table className="kedb-table">
            <colgroup>
              <col className="col-id" />
              <col className="col-problem" />
              <col className="col-error" />
              <col className="col-priority" />
              <col className="col-status" />
              <col className="col-workaround" />
              <col className="col-fix" />
              <col className="col-action" />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th>{t.problem}</th>
                <th>{t.errorDescription}</th>
                <th>{t.priority}</th>
                <th>{t.status}</th>
                <th>{t.workaround}</th>
                <th>{t.permanentFix}</th>
                <th>{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.problem_id}</td>
                  <td>{item.opis_greske || '-'}</td>
                  <td><span className={`badge ${problemPriorityMap[item.problem_id] === 'P1' ? 'priority-p1' : problemPriorityMap[item.problem_id] === 'P2' ? 'priority-p2' : problemPriorityMap[item.problem_id] === 'P3' ? 'priority-p3' : 'priority-p4'}`}>{problemPriorityMap[item.problem_id] || '-'}</span></td>
                  <td><span className={`badge ${item.status === 'resolved' ? 'status-success' : item.status === 'known_error' ? 'status-warning' : 'status-open'}`}>{item.status}</span></td>
                  <td>{item.workaround || '-'}</td>
                  <td>{item.trajni_fix || '-'}</td>
                  <td>{canEditKedb ? <button className="btn-secondary" type="button" onClick={() => selectItem(item)}>Edit</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
